//! Overlay scan supervisor: the backend half of the exact-echo path.
//!
//! A dedicated thread runs the panel scan loop (capture + OCR in
//! [`crate::echo_panel`]), folds the trigger state machines and presses the
//! game's mark keys itself - the frontend only reacts to events:
//!
//! - `overlay-panel` (`OverlayPanelPayload`): show/hide the card layer.
//! - `menu-debug` (`MenuDebugInfo`): per-tick snapshot for the debug panel.
//! - `echo-detected` / `echo-updated` / `echo-split`: emitted by the sniffer
//!   (`sniffer::extract`); this module mirrors them into its tracked-echo
//!   bookkeeping, and the overlay card renders them.
//!
//! The Echo Upgrade Assistant is split the same way: the frontend decides
//! *whether* an echo should be discarded (rating against the TypeScript
//! character catalogs) and queues it through [`assistant_queue_discard`];
//! this supervisor owns *when* the press is safe and fires it.
//!
//! The loop only runs while the overlay window is visible; a hidden overlay
//! means no OCR and no key presses.

use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use parking_lot::Mutex;
use serde::Serialize;
use tauri::{AppHandle, Emitter, Listener, Manager, State};

use crate::account::model::Echo;
use crate::account::{
    AccountState, EchoSplit, ECHO_DETECTED_EVENT, ECHO_SPLIT_EVENT, ECHO_UPDATED_EVENT,
};
use crate::capture::capture_game_window;
use crate::echo_panel::{scan_from_screenshot, EchoPanelScan};
use crate::input::{press_echo_key, EchoMarkKey};
use crate::sniffer::SnifferState;
use crate::AppState;

/// Label of the overlay window in `tauri.conf.json`.
const OVERLAY_WINDOW: &str = "overlay";

/// Event carrying [`OverlayPanelPayload`].
pub const OVERLAY_PANEL_EVENT: &str = "overlay-panel";
/// Event carrying [`MenuDebugInfo`]; emitted per tick while debug is on.
pub const MENU_DEBUG_EVENT: &str = "menu-debug";

/// Scan cadence while no echo menu is on screen: every tick captures the game
/// window and OCRs several regions, so the idle rate stays gentle.
const PANEL_SCAN_INTERVAL_MS: u64 = 1000;
/// Cadence while an echo menu is on screen: the echo bag and the upgrade
/// panel change quickly (lock-press round trip, tuning banner).
const PANEL_SCAN_FAST_INTERVAL_MS: u64 = 100;
/// Consecutive scans without a menu read before dropping to the slow cadence.
const PANEL_SCAN_MENU_MISS_LIMIT: u32 = 3;
/// Consecutive closed scans before the panel counts as closed; a single
/// unreadable scan is a flicker, not a closed panel.
const PANEL_CLOSE_TICKS: u32 = 2;
/// Minimum gap between lock-key attempts.
const PRESS_ATTEMPT_INTERVAL_MS: u64 = 1000;
/// Stop retrying identification after this many consecutive failures.
const MAX_FAILED_ATTEMPTS: u32 = 1;
/// Fallback for the assistant when no "Tuning Successful" screen follows an
/// update packet: the queued discard fires anyway after this long.
const DISCARD_SCREEN_TIMEOUT_MS: u64 = 4000;
/// Poll rate while the overlay window is hidden.
const HIDDEN_POLL_MS: u64 = 500;

/// How long to wait for the game's mark update after the identifying press.
const TOGGLE_WAIT: Duration = Duration::from_millis(800);
/// A mark change arriving this soon after the identifying press is attributed
/// to that press; a later change came from other input (e.g. the player
/// pressing the lock key themselves) and is left untouched.
const TOGGLE_PRESS_WINDOW: Duration = Duration::from_millis(350);
/// Pause between the identifying press and the restoring press.
const TOGGLE_RESTORE_DELAY: Duration = Duration::from_millis(50);

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ---------------------------------------------------------------------------
// Trigger state machines (pure; the ported cases live in the tests below)
// ---------------------------------------------------------------------------

/// Scan cadence state: how long the echo menus have been gone. The overlay
/// launches outside the echo menus, so it starts at the slow cadence.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct MenuWatch {
    misses: u32,
}

const INITIAL_MENU_WATCH: MenuWatch = MenuWatch {
    misses: PANEL_SCAN_MENU_MISS_LIMIT,
};

/// Whether one scan shows an echo menu on screen. Only actual menu reads
/// count - phrase matches and flags from the scan (the echo-bag header, the
/// COST text, the upgrade panel with its tuning banner, the high-rarity
/// dialog). Raw OCR text does not: an idle screen harvests junk out of these
/// regions (the minimap sits right under the header), and junk must not keep
/// the scan fast. The sort-icon template match does not count either.
fn scan_shows_menu(scan: &EchoPanelScan) -> bool {
    scan.echoes_visible
        || scan.echo_cost_visible
        || scan.panel_open
        || scan.high_rarity_notice_visible
}

/// Fold one scan into the scan cadence: fast while an echo menu is on screen,
/// back to the standard rate once the menus have been gone for more than two
/// scans with no menu read in between.
fn watch_menu(watch: MenuWatch, scan: &EchoPanelScan) -> (MenuWatch, u64) {
    let misses = if scan_shows_menu(scan) {
        0
    } else {
        watch.misses + 1
    };
    let delay_ms = if misses >= PANEL_SCAN_MENU_MISS_LIMIT {
        PANEL_SCAN_INTERVAL_MS
    } else {
        PANEL_SCAN_FAST_INTERVAL_MS
    };
    (MenuWatch { misses }, delay_ms)
}

/// The augmentation's panel state folded from one scan.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct PanelVisibility {
    closed_ticks: u32,
    panel_closed: bool,
    hidden: bool,
}

/// Fold one scan into the augmentation's panel state:
///
/// - The COST text marks an echo-bag screen, never the upgrade panel: closed
///   and hidden at once.
/// - The high-rarity dialog is a modal over the panel, which is still open
///   behind it (its dimmed title stops reading): the augmentation hides so it
///   cannot draw over the dialog, but the panel is not closed, so the echo
///   survives and returns with the dialog's exit, like on the sort-icon screen.
/// - Otherwise the flicker guard: hidden and closed once the panel has read
///   closed for [`PANEL_CLOSE_TICKS`] straight scans.
fn fold_panel_visibility(closed_ticks: u32, scan: &EchoPanelScan) -> PanelVisibility {
    if scan.echo_cost_visible {
        return PanelVisibility {
            closed_ticks: PANEL_CLOSE_TICKS,
            panel_closed: true,
            hidden: true,
        };
    }
    // The dialog counts as an open panel for the flicker guard.
    let ticks = if scan.panel_open || scan.high_rarity_notice_visible {
        0
    } else {
        closed_ticks + 1
    };
    let panel_closed = !scan.panel_open && ticks >= PANEL_CLOSE_TICKS;
    PanelVisibility {
        closed_ticks: ticks,
        panel_closed,
        hidden: panel_closed || scan.high_rarity_notice_visible,
    }
}

/// Identification trigger state.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
struct TargetState {
    panel_open: bool,
    /// True until a lock press has resolved the current echo.
    needs_refetch: bool,
    /// Timestamp (ms) of the last press attempt (successful or skipped).
    last_attempt_at: u64,
    /// Consecutive failed press attempts in this panel session.
    failures: u32,
}

struct TargetEvaluation {
    state: TargetState,
    /// Whether to press the lock key now.
    attempt: bool,
    /// Whether the panel opened on a fresh echo (the tracked echo may differ).
    changed: bool,
}

/// Fold one panel scan into the trigger state.
fn evaluate_target(state: TargetState, scan: &EchoPanelScan, now: u64) -> TargetEvaluation {
    if !scan.panel_open {
        return TargetEvaluation {
            state: TargetState::default(),
            attempt: false,
            changed: false,
        };
    }

    // The tuning-success banner hides the panel title while it is up, and the
    // sort icon marks a list screen inside the panel (fodder selection) where
    // the mark keys do nothing useful; the high-rarity confirmation dialog
    // swallows them outright. Hold the state and skip presses until the
    // screen clears.
    if scan.tuning_successful || scan.sort_icon_visible || scan.high_rarity_notice_visible {
        return TargetEvaluation {
            state: TargetState {
                panel_open: true,
                ..state
            },
            attempt: false,
            changed: false,
        };
    }

    // Opening the panel marks a fresh echo; a panel that merely stays open
    // never restarts the round trip (so tuning or browsing upgrade fodder in
    // between presses cannot trigger one).
    let opened = !state.panel_open;
    let needs_refetch = state.needs_refetch || opened;
    let attempt =
        needs_refetch && now.saturating_sub(state.last_attempt_at) >= PRESS_ATTEMPT_INTERVAL_MS;

    TargetEvaluation {
        state: TargetState {
            panel_open: true,
            needs_refetch,
            last_attempt_at: if attempt { now } else { state.last_attempt_at },
            failures: state.failures,
        },
        attempt,
        changed: opened,
    }
}

/// A successful press resolved the current echo; stop refetching it.
fn mark_refetched(state: TargetState) -> TargetState {
    TargetState {
        needs_refetch: false,
        failures: 0,
        ..state
    }
}

/// Count a failed press attempt. After too many in one panel session the
/// retries stop: something is off (an unknown screen, an echo the sniffer has
/// not seen yet), and a panel reopen starts fresh.
fn register_failed_attempt(state: TargetState) -> TargetState {
    let failures = state.failures + 1;
    TargetState {
        failures,
        needs_refetch: state.needs_refetch && failures < MAX_FAILED_ATTEMPTS,
        ..state
    }
}

/// The echo the overlay card currently shows; only what the discard gate and
/// the split following need.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct TrackedEcho {
    incr_id: i64,
    /// `FuncValue` when tracked; the player re-marking cancels a discard.
    func_value: i32,
}

/// Echo queued for the assistant's automatic discard mark.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct PendingDiscard {
    incr_id: i64,
    /// `FuncValue` the echo had when queued; player input cancels the discard.
    func_value: i32,
    /// A "Tuning Successful" screen was seen since the discard was queued.
    saw_tuning: bool,
    /// When the discard was queued; the screen wait times out from here.
    queued_at: u64,
}

#[derive(Debug, PartialEq, Eq)]
enum DiscardDecision {
    /// Keep waiting; carries the updated gate (`saw_tuning`).
    Wait(PendingDiscard),
    /// The player re-marked the echo: the discard is cancelled.
    Cancel,
    /// Fire the discard key now.
    Fire,
}

/// Fold one scan tick into the assistant-discard decision. The discard waits
/// out the "Tuning Successful" screen (the discard key is swallowed while it
/// is up) and only fires while the upgrade panel is verifiably showing -
/// anywhere else the key would act on a different screen. If no tuning screen
/// follows the update packet, the wait times out after
/// [`DISCARD_SCREEN_TIMEOUT_MS`].
fn next_discard_decision(
    pending: PendingDiscard,
    echo: Option<TrackedEcho>,
    scan: &EchoPanelScan,
    now: u64,
) -> DiscardDecision {
    let saw_tuning = pending.saw_tuning || scan.tuning_successful;
    let wait = || {
        DiscardDecision::Wait(PendingDiscard {
            saw_tuning,
            ..pending
        })
    };

    if !scan.panel_open
        || scan.tuning_successful
        || scan.sort_icon_visible
        || scan.high_rarity_notice_visible
    {
        return wait();
    }
    let screen_cleared =
        saw_tuning || now.saturating_sub(pending.queued_at) >= DISCARD_SCREEN_TIMEOUT_MS;
    if !screen_cleared {
        return wait();
    }
    let Some(echo) = echo else {
        return wait();
    };
    if echo.incr_id != pending.incr_id {
        return wait();
    }
    if echo.func_value != pending.func_value {
        return DiscardDecision::Cancel;
    }
    DiscardDecision::Fire
}

/// The tracked echo after a stack split: upgrading one copy of a stack moves
/// it to a new instance id while the old id becomes the unleveled remainder,
/// and the echo on screen is the operated half. `None` when the split is
/// unrelated to the tracked echo.
fn follow_split(tracked: Option<TrackedEcho>, split: &EchoSplit) -> Option<TrackedEcho> {
    let current = tracked?;
    let involved = current.incr_id == split.operated.incr_id
        || split
            .remainder
            .as_ref()
            .is_some_and(|remainder| remainder.incr_id == current.incr_id);
    involved.then_some(TrackedEcho {
        incr_id: split.operated.incr_id,
        func_value: split.operated.func_value,
    })
}

/// Move a queued assistant discard across a stack split: a queue entry
/// pointing at either half belongs to the echo on screen (the operated one).
fn retarget_pending(incr_id: i64, split: &EchoSplit) -> i64 {
    let involved = incr_id == split.operated.incr_id
        || split
            .remainder
            .as_ref()
            .is_some_and(|remainder| remainder.incr_id == incr_id);
    if involved {
        split.operated.incr_id
    } else {
        incr_id
    }
}

// ---------------------------------------------------------------------------
// Shared state and event payloads
// ---------------------------------------------------------------------------

/// Runtime state shared between the supervisor thread, the sniffer event
/// listeners and the assistant commands.
#[derive(Default)]
pub struct OverlayState {
    /// The settings window toggled the menu-detection debug panel on.
    pub show_debug: AtomicBool,
    /// Consecutive closed scans; gates the echo event listeners (a mark made
    /// outside the upgrade panel must not pop the card).
    closed_ticks: AtomicU32,
    /// The echo the overlay card shows (mirrors the frontend's card state).
    tracked: Mutex<Option<TrackedEcho>>,
    /// Echo queued for the assistant's discard, if any.
    pending: Mutex<Option<PendingDiscard>>,
}

impl OverlayState {
    fn closed_ticks(&self) -> u32 {
        self.closed_ticks.load(Ordering::SeqCst)
    }

    fn set_closed_ticks(&self, ticks: u32) {
        self.closed_ticks.store(ticks, Ordering::SeqCst);
    }

    fn panel_recently_open(&self) -> bool {
        self.closed_ticks() < PANEL_CLOSE_TICKS
    }

    fn tracked_echo(&self) -> Option<TrackedEcho> {
        *self.tracked.lock()
    }

    fn pending_snapshot(&self) -> Option<PendingDiscard> {
        *self.pending.lock()
    }

    fn set_pending(&self, pending: Option<PendingDiscard>) {
        *self.pending.lock() = pending;
    }

    fn queue_discard(&self, incr_id: i64, func_value: i32) {
        *self.pending.lock() = Some(PendingDiscard {
            incr_id,
            func_value,
            saw_tuning: false,
            queued_at: now_ms(),
        });
    }

    fn cancel_discard(&self, incr_id: i64) {
        let mut pending = self.pending.lock();
        if pending.is_some_and(|queued| queued.incr_id == incr_id) {
            *pending = None;
        }
    }

    /// Panel closed, overlay hidden, or a different echo on screen: the
    /// tracked echo (and any queued assistant discard for it) no longer applies.
    fn reset_tracking(&self) {
        *self.tracked.lock() = None;
        *self.pending.lock() = None;
    }

    fn on_echo_detected(&self, echo: &Echo) {
        // The notify also fires for marks made outside the upgrade panel
        // (locking an echo in the inventory, say); it must not become the
        // tracked echo then.
        if !self.panel_recently_open() {
            return;
        }
        *self.tracked.lock() = Some(TrackedEcho {
            incr_id: echo.incr_id,
            func_value: echo.func_value,
        });
    }

    fn on_echo_updated(&self, echo: &Echo) {
        let mut tracked = self.tracked.lock();
        if tracked.is_some_and(|current| current.incr_id == echo.incr_id) {
            *tracked = Some(TrackedEcho {
                incr_id: echo.incr_id,
                func_value: echo.func_value,
            });
        }
    }

    fn on_echo_split(&self, split: &EchoSplit) {
        if !self.panel_recently_open() {
            return;
        }
        {
            let mut tracked = self.tracked.lock();
            if let Some(follow) = follow_split(*tracked, split) {
                *tracked = Some(follow);
            }
        }
        let mut pending = self.pending.lock();
        if let Some(queued) = pending.as_mut() {
            let retargeted = retarget_pending(queued.incr_id, split);
            if retargeted != queued.incr_id {
                queued.incr_id = retargeted;
                queued.func_value = split.operated.func_value;
            }
        }
    }
}

/// Payload of [`OVERLAY_PANEL_EVENT`]: whether the card layer shows.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayPanelPayload {
    pub visible: bool,
}

/// One key press seen by the menu debug panel.
#[derive(Debug, Clone, Copy, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PressEntry {
    pub at: u64,
    pub ok: bool,
}

/// Last presses by kind; mirrors the frontend's `MenuDebugPressLog`.
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PressLog {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub identify: Option<PressEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub discard: Option<PressEntry>,
}

/// Per-tick snapshot for the overlay's menu-detection debug panel; mirrors the
/// frontend's `MenuDebugInfo`.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuDebugInfo {
    pub scan: EchoPanelScan,
    pub panel_closed: bool,
    pub panel_hidden: bool,
    pub closed_ticks: u32,
    pub needs_refetch: bool,
    pub failures: u32,
    pub last_attempt_at: u64,
    pub pending_discard: Option<i64>,
    pub last_presses: PressLog,
    pub scan_delay_ms: u64,
    pub menu_misses: u32,
    pub scan_ms: u64,
}

// ---------------------------------------------------------------------------
// Echo identification (lock-press round trip)
// ---------------------------------------------------------------------------

/// The mark the echo currently has in the store; `None` when it is unknown.
fn stored_func_value(app: &AppHandle, incr_id: i64) -> Option<i32> {
    app.state::<AccountState>()
        .store
        .lock()
        .ok()
        .and_then(|store| store.echo(incr_id))
        .map(|echo| echo.func_value)
}

/// Identify the echo on screen and restore its mark state.
///
/// One lock press makes the client report the echo through an
/// `ItemFuncValueUpdateNotify` (`sniffer::extract`). The mark the echo had
/// *before* the press decides the restoring press: an echo that was
/// discard-marked gets the discard key, every other echo gets the lock key
/// again. The key goes straight to the game window, so it works without
/// focus; failures are retried on the next tick.
fn toggle_echo_mark(app: &AppHandle) -> Result<(), String> {
    let sniffer = app.state::<SnifferState>();
    let generation = sniffer.func_value_generation();

    press_echo_key(EchoMarkKey::Lock)?;
    let pressed_at = Instant::now();
    let deadline = pressed_at + TOGGLE_WAIT;
    loop {
        if let Some(change) = sniffer.func_value_change_since(generation) {
            // Only restore a change that this press caused promptly; a change
            // arriving later came from other input (e.g. the player pressing
            // the lock key themselves) and is left untouched.
            if pressed_at.elapsed() > TOGGLE_PRESS_WINDOW {
                return Ok(());
            }

            // The lock press unmarked a discard-marked echo; pressing the lock
            // key again would leave it locked instead of discarded, so restore
            // it with the discard key.
            let key = if change.previous == crate::account::model::Echo::FUNC_VALUE_DISCARD {
                EchoMarkKey::Discard
            } else {
                EchoMarkKey::Lock
            };

            // Let the game process the identifying press, then check the mark
            // again right before restoring: the player may have toggled it
            // while the press was in flight, and their input must win over
            // the restore.
            std::thread::sleep(TOGGLE_RESTORE_DELAY);
            if stored_func_value(app, change.incr_id) != Some(change.current) {
                return Ok(());
            }
            return press_echo_key(key);
        }
        if Instant::now() >= deadline {
            return Err("no echo mark update after the lock press".to_string());
        }
        std::thread::sleep(Duration::from_millis(15));
    }
}

// ---------------------------------------------------------------------------
// Supervisor
// ---------------------------------------------------------------------------

/// Start the scan supervisor and mirror the sniffer's echo events into the
/// tracked-echo bookkeeping.
pub fn start(app: &AppHandle) {
    spawn_supervisor(app.clone());

    // The sniffer emits these for the overlay card; the discard gate and the
    // split following need the same view, so the backend listens too.
    let handle = app.clone();
    app.listen(ECHO_DETECTED_EVENT, move |event| {
        if let Ok(echo) = serde_json::from_str::<Echo>(event.payload()) {
            handle.state::<OverlayState>().on_echo_detected(&echo);
        }
    });
    let handle = app.clone();
    app.listen(ECHO_UPDATED_EVENT, move |event| {
        if let Ok(echo) = serde_json::from_str::<Echo>(event.payload()) {
            handle.state::<OverlayState>().on_echo_updated(&echo);
        }
    });
    let handle = app.clone();
    app.listen(ECHO_SPLIT_EVENT, move |event| {
        if let Ok(split) = serde_json::from_str::<EchoSplit>(event.payload()) {
            handle.state::<OverlayState>().on_echo_split(&split);
        }
    });
}

fn spawn_supervisor(app: AppHandle) {
    std::thread::spawn(move || {
        let mut watch = INITIAL_MENU_WATCH;
        let mut target = TargetState::default();
        let mut last_presses = PressLog::default();
        let mut last_visible: Option<bool> = None;
        loop {
            let state = app.state::<OverlayState>();
            let overlay_visible = app
                .get_webview_window(OVERLAY_WINDOW)
                .is_some_and(|window| window.is_visible().unwrap_or(false));
            if !overlay_visible {
                // A hidden overlay means no OCR and no key presses; drop any
                // tracked echo so a stale card cannot survive into the next
                // show, and tell the frontend to hide the layer.
                if last_visible != Some(false) {
                    state.reset_tracking();
                    state.set_closed_ticks(PANEL_CLOSE_TICKS);
                    watch = INITIAL_MENU_WATCH;
                    target = TargetState::default();
                    let _ = app.emit(OVERLAY_PANEL_EVENT, OverlayPanelPayload { visible: false });
                    last_visible = Some(false);
                }
                std::thread::sleep(Duration::from_millis(HIDDEN_POLL_MS));
                continue;
            }

            let delay_ms = run_scan_tick(
                &app,
                &state,
                &mut watch,
                &mut target,
                &mut last_presses,
                &mut last_visible,
            );
            std::thread::sleep(Duration::from_millis(delay_ms));
        }
    });
}

/// One scan tick: capture, fold the panel state, identify the echo when the
/// trigger rules ask for it, fire any queued assistant discard. Returns the
/// delay for the next tick.
fn run_scan_tick(
    app: &AppHandle,
    state: &OverlayState,
    watch: &mut MenuWatch,
    target: &mut TargetState,
    last_presses: &mut PressLog,
    last_visible: &mut Option<bool>,
) -> u64 {
    let regions = app
        .state::<AppState>()
        .scan_regions
        .lock()
        .ok()
        .and_then(|regions| regions.clone());
    // No regions configured yet: nothing to scan, keep the state and retry slow.
    let Some(regions) = regions else {
        return PANEL_SCAN_INTERVAL_MS;
    };

    let started_at = Instant::now();
    let scan = match capture_game_window() {
        Ok((screenshot, origin)) => {
            if let Err(error) = crate::update_capture_origin(app, origin) {
                eprintln!("Failed to publish capture origin: {error}");
            }
            match scan_from_screenshot(app, &screenshot, &regions) {
                Ok(scan) => scan,
                // An unreadable frame must not fold into the panel state;
                // keep everything and retry at the slow rate.
                Err(_) => return PANEL_SCAN_INTERVAL_MS,
            }
        }
        // No game window: fold a fully closed scan (the flicker guard hides
        // the card once it repeats).
        Err(_) => EchoPanelScan::default(),
    };
    let scan_ms = started_at.elapsed().as_millis() as u64;

    // Cadence: fast while an echo menu is on screen, back to the standard
    // rate once the menus have been gone for two scans.
    let (next_watch, delay_ms) = watch_menu(*watch, &scan);
    *watch = next_watch;

    // Panel visibility: the echo bag closes the augmentation on the spot, the
    // high-rarity dialog only hides it (the panel is still open behind the
    // modal, so the echo is remembered), and an unreadable scan counts once
    // it repeats (a flicker must not hide the card).
    let visibility = fold_panel_visibility(state.closed_ticks(), &scan);
    state.set_closed_ticks(visibility.closed_ticks);

    // A single unreadable scan is a flicker, not a closed panel: feed the
    // trigger rules an open panel then, so the target is not reset and no
    // re-identification press fires on recovery.
    let eval_scan = if visibility.panel_closed {
        scan.clone()
    } else {
        EchoPanelScan {
            panel_open: true,
            ..scan.clone()
        }
    };
    let evaluation = evaluate_target(*target, &eval_scan, now_ms());

    let panel_visible = !visibility.hidden;
    if *last_visible != Some(panel_visible) {
        let _ = app.emit(
            OVERLAY_PANEL_EVENT,
            OverlayPanelPayload {
                visible: panel_visible,
            },
        );
        *last_visible = Some(panel_visible);
    }
    if visibility.panel_closed || evaluation.changed {
        state.reset_tracking();
    }
    *target = evaluation.state;

    // Identify the echo: presses are only allowed while the scan genuinely
    // reports the panel open - a press in any other screen (echo inventory,
    // equip menu) would toggle whatever is selected there.
    if evaluation.attempt
        && scan.panel_open
        && !scan.sort_icon_visible
        && !scan.high_rarity_notice_visible
    {
        let at = now_ms();
        match toggle_echo_mark(app) {
            Ok(()) => {
                last_presses.identify = Some(PressEntry { at, ok: true });
                *target = mark_refetched(*target);
            }
            Err(error) => {
                eprintln!("Echo mark press failed: {error}");
                last_presses.identify = Some(PressEntry { at, ok: false });
                *target = register_failed_attempt(*target);
            }
        }
    }

    // Echo Upgrade Assistant: fire the queued discard once the trigger rules
    // allow it.
    if let Some(pending) = state.pending_snapshot() {
        match next_discard_decision(pending, state.tracked_echo(), &scan, now_ms()) {
            DiscardDecision::Wait(updated) => state.set_pending(Some(updated)),
            // The player marked the echo after the assistant queued it;
            // their input wins and the discard is cancelled.
            DiscardDecision::Cancel => state.set_pending(None),
            DiscardDecision::Fire => {
                state.set_pending(None);
                let at = now_ms();
                match press_echo_key(EchoMarkKey::Discard) {
                    Ok(()) => last_presses.discard = Some(PressEntry { at, ok: true }),
                    Err(error) => {
                        eprintln!("Auto-discard press failed: {error}");
                        state.set_pending(Some(pending));
                        last_presses.discard = Some(PressEntry { at, ok: false });
                    }
                }
            }
        }
    }

    if state.show_debug.load(Ordering::SeqCst) {
        let _ = app.emit(
            MENU_DEBUG_EVENT,
            MenuDebugInfo {
                scan: scan.clone(),
                panel_closed: visibility.panel_closed,
                panel_hidden: visibility.hidden,
                closed_ticks: visibility.closed_ticks,
                needs_refetch: target.needs_refetch,
                failures: target.failures,
                last_attempt_at: target.last_attempt_at,
                pending_discard: state.pending_snapshot().map(|pending| pending.incr_id),
                last_presses: last_presses.clone(),
                scan_delay_ms: delay_ms,
                menu_misses: watch.misses,
                scan_ms,
            },
        );
    }

    delay_ms
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/// Show or hide the overlay's menu-detection debug panel. The choice is
/// persisted by the settings window in `settings.json`; this command stores
/// the live toggle (the supervisor emits `menu-debug` while it is on) and
/// relays it to the overlay.
#[tauri::command]
pub fn set_show_menu_debug(
    app_handle: AppHandle,
    state: State<OverlayState>,
    show: bool,
) -> Result<(), String> {
    state.show_debug.store(show, Ordering::SeqCst);
    app_handle
        .emit("show-menu-debug-changed", show)
        .map_err(|e| e.to_string())
}

/// Queue an automatic discard mark for the Echo Upgrade Assistant. The
/// frontend decides *whether* the echo should go (rating against the
/// character catalogs); the supervisor decides *when* the press is safe and
/// fires it. Re-queueing replaces any pending discard.
#[tauri::command(rename_all = "snake_case")]
pub fn assistant_queue_discard(state: State<OverlayState>, incr_id: i64, func_value: i32) {
    state.queue_discard(incr_id, func_value);
}

/// Cancel a queued assistant discard for this echo (it passed the
/// re-evaluation, or the assistant was switched off).
#[tauri::command(rename_all = "snake_case")]
pub fn assistant_cancel_discard(state: State<OverlayState>, incr_id: i64) {
    state.cancel_discard(incr_id);
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Realistic wall-clock base: `last_attempt_at` starts at 0, i.e. long ago.
    const BASE: u64 = 1_000_000;

    fn scan(panel_open: bool) -> EchoPanelScan {
        EchoPanelScan {
            panel_open,
            ..Default::default()
        }
    }

    fn target(panel_open: bool, needs_refetch: bool, failures: u32) -> TargetState {
        TargetState {
            panel_open,
            needs_refetch,
            last_attempt_at: BASE,
            failures,
        }
    }

    fn split(operated_id: i64, operated_fv: i32, remainder_id: Option<i64>) -> EchoSplit {
        let echo = |incr_id: i64, func_value: i32| Echo {
            incr_id,
            func_value,
            ..Default::default()
        };
        EchoSplit {
            operated: echo(operated_id, operated_fv),
            remainder: remainder_id.map(|id| echo(id, 0)),
        }
    }

    // -- evaluate_target -----------------------------------------------------

    #[test]
    fn closed_panel_resets_the_trigger_state() {
        let result = evaluate_target(target(true, true, 0), &scan(false), BASE + 500);
        assert_eq!(result.state, TargetState::default());
        assert!(!result.attempt && !result.changed);
    }

    #[test]
    fn opening_the_panel_refetches_once() {
        let first = evaluate_target(TargetState::default(), &scan(true), BASE);
        assert!(first.changed && first.attempt);
        // After the press succeeds, staying open needs no further refetch.
        let pressed = mark_refetched(first.state);
        let second = evaluate_target(pressed, &scan(true), BASE + 500);
        assert!(!second.changed && !second.attempt);
    }

    #[test]
    fn tuning_banner_holds_the_state_and_skips_presses() {
        let mut tuning_scan = scan(true);
        tuning_scan.tuning_successful = true;
        let held = evaluate_target(target(true, false, 0), &tuning_scan, BASE + 500);
        assert!(!held.attempt && !held.changed);
        assert!(held.state.panel_open);
        // The banner clears with the panel still open: no new refetch.
        let cleared = evaluate_target(held.state, &scan(true), BASE + 10 * 500);
        assert!(!cleared.attempt && !cleared.changed);
    }

    #[test]
    fn failed_press_is_retried_after_the_throttle() {
        let first = evaluate_target(TargetState::default(), &scan(true), BASE);
        assert!(first.attempt);
        // The press failed: needs_refetch stays set, retries are throttled.
        let too_soon = evaluate_target(first.state, &scan(true), BASE + 1);
        assert!(!too_soon.attempt);
        let retry = evaluate_target(first.state, &scan(true), BASE + PRESS_ATTEMPT_INTERVAL_MS);
        assert!(retry.attempt);
        // Once the press succeeds the echo is resolved.
        let done = mark_refetched(retry.state);
        let settled = evaluate_target(done, &scan(true), BASE + 10 * 500);
        assert!(!settled.attempt);
    }

    #[test]
    fn closing_and_reopening_the_panel_refetches_again() {
        let open = evaluate_target(TargetState::default(), &scan(true), BASE);
        let pressed = mark_refetched(open.state);
        let closed = evaluate_target(pressed, &scan(false), BASE + 500);
        assert_eq!(closed.state, TargetState::default());
        let reopened = evaluate_target(closed.state, &scan(true), BASE + PRESS_ATTEMPT_INTERVAL_MS);
        assert!(reopened.changed && reopened.attempt);
    }

    #[test]
    fn blocking_screens_hold_the_state_and_skip_presses() {
        for blocking in [
            |s: &mut EchoPanelScan| s.sort_icon_visible = true,
            |s: &mut EchoPanelScan| s.high_rarity_notice_visible = true,
        ] {
            let mut blocking_scan = scan(true);
            blocking(&mut blocking_scan);
            let state = target(true, true, 0);
            let held = evaluate_target(state, &blocking_scan, BASE + PRESS_ATTEMPT_INTERVAL_MS);
            assert!(!held.attempt && !held.changed);
            assert!(held.state.panel_open);
            // The screen closes with the panel still open: the pending
            // refetch resumes (subject to the throttle).
            let resumed = evaluate_target(
                held.state,
                &scan(true),
                BASE + 2 * PRESS_ATTEMPT_INTERVAL_MS,
            );
            assert!(resumed.attempt);
        }
    }

    #[test]
    fn failed_presses_stop_retrying_after_the_cap() {
        let open = evaluate_target(TargetState::default(), &scan(true), BASE);
        assert!(open.state.needs_refetch);
        let state = register_failed_attempt(open.state);
        assert!(!state.needs_refetch);
        let after = evaluate_target(state, &scan(true), BASE + 10 * PRESS_ATTEMPT_INTERVAL_MS);
        assert!(!after.attempt);
    }

    // -- fold_panel_visibility ------------------------------------------------

    #[test]
    fn one_unreadable_scan_is_a_flicker() {
        let first = fold_panel_visibility(0, &scan(false));
        assert_eq!(first.closed_ticks, 1);
        assert!(!first.panel_closed && !first.hidden);
        let second = fold_panel_visibility(first.closed_ticks, &scan(false));
        assert_eq!(second.closed_ticks, PANEL_CLOSE_TICKS);
        assert!(second.panel_closed && second.hidden);
    }

    #[test]
    fn open_panel_resets_the_counter() {
        assert_eq!(
            fold_panel_visibility(1, &scan(true)),
            PanelVisibility {
                closed_ticks: 0,
                panel_closed: false,
                hidden: false,
            }
        );
    }

    #[test]
    fn high_rarity_dialog_hides_the_augmentation_but_keeps_the_panel() {
        // The dialog over the upgrade panel: its dimmed title stops reading,
        // so the panel itself reads closed while the modal is up.
        let mut dialog = scan(false);
        dialog.high_rarity_notice_visible = true;
        let held = fold_panel_visibility(1, &dialog);
        assert_eq!(
            held,
            PanelVisibility {
                closed_ticks: 0,
                panel_closed: false,
                hidden: true,
            }
        );
        let back = fold_panel_visibility(held.closed_ticks, &scan(true));
        assert!(!back.panel_closed && !back.hidden);
    }

    #[test]
    fn echo_bag_closes_the_augmentation_at_once() {
        let mut bag = scan(false);
        bag.echo_cost_visible = true;
        assert_eq!(
            fold_panel_visibility(0, &bag),
            PanelVisibility {
                closed_ticks: PANEL_CLOSE_TICKS,
                panel_closed: true,
                hidden: true,
            }
        );
    }

    // -- watch_menu ------------------------------------------------------------

    #[test]
    fn cadence_starts_slow_since_the_overlay_launches_outside_the_menus() {
        let (_, delay) = watch_menu(INITIAL_MENU_WATCH, &scan(false));
        assert_eq!(delay, PANEL_SCAN_INTERVAL_MS);
    }

    #[test]
    fn any_menu_read_switches_to_the_fast_cadence() {
        let mut menus = Vec::new();
        for flag in [
            |s: &mut EchoPanelScan| s.echoes_visible = true,
            |s: &mut EchoPanelScan| s.echo_cost_visible = true,
            |s: &mut EchoPanelScan| s.panel_open = true,
            |s: &mut EchoPanelScan| s.high_rarity_notice_visible = true,
        ] {
            let mut menu_scan = scan(false);
            flag(&mut menu_scan);
            menus.push(menu_scan);
        }
        for menu_scan in &menus {
            let (watch, delay) = watch_menu(INITIAL_MENU_WATCH, menu_scan);
            assert_eq!(delay, PANEL_SCAN_FAST_INTERVAL_MS);
            assert_eq!(watch.misses, 0);
        }
    }

    #[test]
    fn fast_cadence_holds_until_the_menus_are_gone_for_more_than_two_scans() {
        let mut menu = scan(false);
        menu.echoes_visible = true;
        let (mut watch, _) = watch_menu(INITIAL_MENU_WATCH, &menu);
        let empty = scan(false);
        // Two scans without a menu read still poll fast.
        for _ in 1..=2 {
            let (next, delay) = watch_menu(watch, &empty);
            watch = next;
            assert_eq!(delay, PANEL_SCAN_FAST_INTERVAL_MS);
        }
        // The third miss is "gone for more than two scans": back to slow.
        let (third, delay) = watch_menu(watch, &empty);
        assert_eq!(third.misses, PANEL_SCAN_MENU_MISS_LIMIT);
        assert_eq!(delay, PANEL_SCAN_INTERVAL_MS);
        // A menu reappearing speeds the scan up again.
        let mut bag = scan(false);
        bag.echo_cost_visible = true;
        let (back, delay) = watch_menu(third, &bag);
        assert_eq!(back.misses, 0);
        assert_eq!(delay, PANEL_SCAN_FAST_INTERVAL_MS);
    }

    #[test]
    fn idle_ocr_junk_does_not_keep_the_scan_fast() {
        // Outside the menus these regions still OCR text out of the game (the
        // minimap sits under the header region) without any phrase matching:
        // the scan must fall back to the slow rate all the same.
        let mut watch = INITIAL_MENU_WATCH;
        let mut junk = scan(false);
        junk.title_text = "12 K".into();
        junk.banner_text = "| 7".into();
        junk.echoes_text = "ST".into();
        junk.cost_text = ";".into();
        junk.high_rarity_notice_text = "h. wy)".into();
        junk.sort_icon_visible = true;
        junk.sort_icon_score = Some(0.42);
        for _ in 0..4 {
            let (next, delay) = watch_menu(watch, &junk);
            watch = next;
            assert_eq!(delay, PANEL_SCAN_INTERVAL_MS);
        }
    }

    // -- next_discard_decision ---------------------------------------------------

    fn pending() -> PendingDiscard {
        PendingDiscard {
            incr_id: 7,
            func_value: 1,
            saw_tuning: false,
            queued_at: BASE,
        }
    }

    fn tracked() -> Option<TrackedEcho> {
        Some(TrackedEcho {
            incr_id: 7,
            func_value: 1,
        })
    }

    #[test]
    fn discard_waits_for_the_tuning_screen_before_firing() {
        let mut tuning = scan(true);
        tuning.tuning_successful = true;
        // The tuning banner is up: hold, and remember the screen was seen.
        let held = next_discard_decision(pending(), tracked(), &tuning, BASE + 100);
        assert_eq!(
            held,
            DiscardDecision::Wait(PendingDiscard {
                saw_tuning: true,
                ..pending()
            })
        );
        // The banner cleared: the discard fires immediately, no timeout wait.
        let cleared = PendingDiscard {
            saw_tuning: true,
            ..pending()
        };
        assert_eq!(
            next_discard_decision(cleared, tracked(), &scan(true), BASE + 200),
            DiscardDecision::Fire
        );
    }

    #[test]
    fn discard_fires_after_the_fallback_timeout() {
        let open = scan(true);
        assert_eq!(
            next_discard_decision(
                pending(),
                tracked(),
                &open,
                BASE + DISCARD_SCREEN_TIMEOUT_MS - 1
            ),
            DiscardDecision::Wait(pending_with_tuning(false))
        );
        assert_eq!(
            next_discard_decision(
                pending(),
                tracked(),
                &open,
                BASE + DISCARD_SCREEN_TIMEOUT_MS
            ),
            DiscardDecision::Fire
        );
    }

    fn pending_with_tuning(saw_tuning: bool) -> PendingDiscard {
        PendingDiscard {
            saw_tuning,
            ..pending()
        }
    }

    #[test]
    fn discard_cancels_when_the_player_re_marked_the_echo() {
        let remarked = Some(TrackedEcho {
            incr_id: 7,
            func_value: 2,
        });
        let cleared = pending_with_tuning(true);
        assert_eq!(
            next_discard_decision(cleared, remarked, &scan(true), BASE + 100),
            DiscardDecision::Cancel
        );
    }

    #[test]
    fn discard_waits_while_another_screen_or_echo_is_up() {
        let cleared = pending_with_tuning(true);
        let mut closed = scan(true);
        closed.panel_open = false;
        let mut sorted = scan(true);
        sorted.sort_icon_visible = true;
        let mut dialog = scan(true);
        dialog.high_rarity_notice_visible = true;
        for blocking in [&closed, &sorted, &dialog] {
            assert_eq!(
                next_discard_decision(cleared, tracked(), blocking, BASE + 100),
                DiscardDecision::Wait(cleared)
            );
        }
        let other = Some(TrackedEcho {
            incr_id: 8,
            func_value: 1,
        });
        assert_eq!(
            next_discard_decision(cleared, other, &scan(true), BASE + 100),
            DiscardDecision::Wait(cleared)
        );
        assert_eq!(
            next_discard_decision(cleared, None, &scan(true), BASE + 100),
            DiscardDecision::Wait(cleared)
        );
    }

    // -- stack-split following ---------------------------------------------------

    #[test]
    fn split_follows_the_operated_half() {
        // Stack 100 (x51) split by an upgrade: the leveled copy moves to 500,
        // the remainder keeps the old id.
        let split = split(500, 0, Some(100));
        let tracked_old = Some(TrackedEcho {
            incr_id: 100,
            func_value: 1,
        });
        assert_eq!(
            follow_split(tracked_old, &split),
            Some(TrackedEcho {
                incr_id: 500,
                func_value: 0,
            })
        );
        // A card already on the operated half refreshes.
        let tracked_new = Some(TrackedEcho {
            incr_id: 500,
            func_value: 1,
        });
        assert_eq!(
            follow_split(tracked_new, &split).map(|t| t.incr_id),
            Some(500)
        );
        // Splits of other echoes are ignored.
        let unrelated = Some(TrackedEcho {
            incr_id: 7,
            func_value: 0,
        });
        assert_eq!(follow_split(unrelated, &split), None);
        assert_eq!(follow_split(None, &split), None);
    }

    #[test]
    fn split_without_remainder_ignores_unrelated_ids() {
        let no_remainder = split(500, 0, None);
        let old = Some(TrackedEcho {
            incr_id: 100,
            func_value: 0,
        });
        assert_eq!(follow_split(old, &no_remainder), None);
        let operated = Some(TrackedEcho {
            incr_id: 500,
            func_value: 0,
        });
        assert_eq!(
            follow_split(operated, &no_remainder).map(|t| t.incr_id),
            Some(500)
        );
    }

    #[test]
    fn pending_discard_moves_across_the_split() {
        let split = split(500, 0, Some(100));
        // A queue entry on the remainder moves to the operated half.
        assert_eq!(retarget_pending(100, &split), 500);
        // A queue entry already on the operated half stays.
        assert_eq!(retarget_pending(500, &split), 500);
        // Unrelated queue entries are left alone.
        assert_eq!(retarget_pending(7, &split), 7);
    }

    #[test]
    fn on_echo_split_retargets_the_queue_entry() {
        let state = OverlayState::default();
        state.queue_discard(100, 1);
        state.on_echo_split(&split(500, 2, Some(100)));
        let pending = state.pending_snapshot().expect("pending kept");
        assert_eq!(pending.incr_id, 500);
        // The queued func value follows the operated half.
        assert_eq!(pending.func_value, 2);
    }
}
