//! Overlay trigger scan: what screen is the game showing?
//!
//! [`scan_from_screenshot`] reads the configured regions out of one captured
//! frame and folds them into an [`EchoPanelScan`]: the Echo Upgrade panel and
//! its tuning-success banner, the sort-icon screen, the high-rarity dialog and
//! the two cheap echo-menu reads that drive the overlay's scan cadence. The
//! decision helpers (phrase checks, template similarity, the tuning-screen
//! rule) are pure and unit-tested in `crate::tests`.

use std::sync::Arc;

use image::DynamicImage;
use serde::Serialize;
use tauri::{AppHandle, Manager};

use crate::capture::crop_region;
use crate::ocr::perform_ocr_on_image;
use crate::scan_region::{ScanRegion, ScanRegions};
use crate::sniffer::SnifferState;
use crate::AppState;

/// Result of the overlay trigger scan: whether the "Echo Upgrade" panel is
/// open and whether the tuning-success banner is up. The panel opening is the
/// overlay's re-fetch signal; the echo name is deliberately not read here
/// because it can be covered while browsing upgrade fodder. The raw title and
/// banner reads ride along as evidence for the menu-detection debug panel,
/// and the echo-bag header and COST reads drive the overlay's scan cadence
/// (fast while an echo menu is on screen, slow once it is gone).
#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EchoPanelScan {
    pub panel_open: bool,
    /// True while the "Tuning Successful" banner is up (or still animating in
    /// after an upgrade packet); the panel stays open and the overlay skips
    /// key presses until it clears.
    pub tuning_successful: bool,
    /// True while the banner wait after an echo update packet is still
    /// running; the banner region is not read yet then.
    pub waiting_for_banner: bool,
    /// Raw OCR of the panel-title region (trimmed).
    pub title_text: String,
    /// Raw OCR of the tuning-banner region, when it was read this scan
    /// (empty while the title is visible or the banner wait is running).
    pub banner_text: String,
    /// True while the menu sort icon is visible in its configured region; the
    /// overlay then waits (no key presses) until that screen closes.
    pub sort_icon_visible: bool,
    /// Similarity of the sort-icon region against its template (0..=1), for
    /// the menu-detection debug panel; `None` when the region or the template
    /// is unavailable.
    pub sort_icon_score: Option<f32>,
    /// True while the high-rarity confirmation dialog text is visible in its
    /// configured region; the overlay then waits (no key presses) until the
    /// dialog closes, like for the sort-icon screen.
    pub high_rarity_notice_visible: bool,
    /// Raw OCR of the high-rarity notice region, when it was read this scan;
    /// debug evidence for the menu-detection panel.
    pub high_rarity_notice_text: String,
    /// Raw OCR of the echo-bag header region ("Echoes"): with `cost_text` one
    /// of the two cheap menu reads the overlay uses to pick its scan cadence.
    pub echoes_text: String,
    /// True while the echo-bag header (or the upgrade panel's title, which the
    /// same region overlaps) reads as "echo": an echo menu is on screen.
    pub echoes_visible: bool,
    /// Raw OCR of the COST text region; the second fast-cadence read.
    pub cost_text: String,
    /// True while the COST text is on screen: those are the echo-bag screens,
    /// never the upgrade panel, so the overlay closes its augmentation
    /// immediately instead of holding it through the flicker guard.
    pub echo_cost_visible: bool,
}

/// Scan memo shared across ticks. The expensive reads are gated on it so idle
/// ticks stay cheap without ever missing a screen: the high-rarity dialog is
/// only read while the upgrade flow was on screen moments ago (or while the
/// dialog itself is still up), and the tuning banner only while a packet is
/// recent.
#[derive(Default)]
pub struct ScanMemo {
    /// Last tick that saw the upgrade screen, its tuning banner or its fodder
    /// list (the screens the high-rarity dialog can be opened from).
    upgrade_flow_at: Option<std::time::Instant>,
    /// The high-rarity dialog was visible on the last tick that read it.
    notice_visible: bool,
    /// The bundled sort-icon template, decoded and shrunk once on first use.
    sort_template: Option<Arc<SortIconTemplate>>,
}

/// Case-insensitive phrase check for OCR output, normalised over line breaks
/// (the OCR often splits a phrase across lines).
pub(crate) fn contains_phrase(text: &str, phrase: &str) -> bool {
    let normalized = text
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase();
    normalized.contains(phrase)
}

/// Whether the "Tuning Successful" screen is up. It covers the panel title and
/// waits for a tap, so it holds the panel open until the title reads again -
/// the echo must survive however long the player studies the new rolls. Right
/// after the update packet the banner is still animating in, so the wait
/// counts as the screen being up.
pub(crate) fn tuning_screen_up(
    title_visible: bool,
    waiting_for_banner: bool,
    banner_text: &str,
) -> bool {
    !title_visible && (waiting_for_banner || contains_phrase(banner_text, "tuning successful"))
}

/// Minimum similarity (0..=1) between the sort-icon region and its template
/// for the icon to count as visible.
const SORT_ICON_MATCH_THRESHOLD: f32 = 0.9;

/// Edge length of the comparison grid both images are shrunk to.
const GRID: u32 = 24;

/// The sort-icon template, decoded and shrunk to the comparison grid once.
/// Scans run at up to 10 Hz and slide the template over many placements, so
/// re-reading the PNG and re-shrinking it per tick (per placement, even)
/// wasted most of the scan's non-OCR time.
pub struct SortIconTemplate {
    /// Original pixel size; drives the placements inside the scan region.
    size: (u32, u32),
    /// The template shrunk to the comparison grid.
    grid: image::RgbaImage,
}

impl SortIconTemplate {
    pub(crate) fn new(image: DynamicImage) -> Self {
        let size = (image.width(), image.height());
        Self {
            size,
            grid: shrink_to_grid(&image),
        }
    }

    /// Decode the bundled template; `None` when the resource is missing or
    /// corrupt.
    fn load(app: &AppHandle) -> Option<Self> {
        let bytes = crate::config::load_binary_resource(app, "public/sort_icon.png").ok()?;
        let image = image::load_from_memory(&bytes).ok()?;
        Some(Self::new(image))
    }
}

/// Shrink an image to the comparison grid.
fn shrink_to_grid(image: &DynamicImage) -> image::RgbaImage {
    use image::imageops::FilterType;
    image.resize_exact(GRID, GRID, FilterType::Triangle).to_rgba8()
}

/// Best similarity of a captured region against the sort-icon template over a
/// few placements: the configured region can be a few pixels larger than the
/// icon, so the template slides inside it and the best placement wins.
pub(crate) fn sort_icon_similarity_best(region: &DynamicImage, template: &SortIconTemplate) -> f32 {
    use image::GenericImageView;

    let (region_w, region_h) = region.dimensions();
    let (template_w, template_h) = template.size;
    if template_w == 0 || template_h == 0 || region_w < template_w || region_h < template_h {
        return grid_similarity(&shrink_to_grid(region), &template.grid);
    }

    // Every integer offset up to a small cap: the icon can sit anywhere in a
    // slightly larger region, and a one-pixel miss would blur the bright
    // details the match depends on.
    let offsets = |max: u32| 0..=max.min(8);

    let mut best: f32 = 0.0;
    for dx in offsets(region_w - template_w) {
        for dy in offsets(region_h - template_h) {
            let placed = region.crop_imm(dx, dy, template_w, template_h);
            best = best.max(grid_similarity(&shrink_to_grid(&placed), &template.grid));
        }
    }
    best
}

/// Similarity of two grid-shrunk images, in 0..=1. Only pixels the template
/// marks as opaque count (its transparent corners are the game's own
/// background), and the comparison is weighted by the template's brightness so
/// the icon's bright details decide the match while its dark body also
/// resembles most backgrounds.
fn grid_similarity(region_grid: &image::RgbaImage, template_grid: &image::RgbaImage) -> f32 {
    let luma = |px: &image::Rgba<u8>| {
        0.299 * f32::from(px[0]) + 0.587 * f32::from(px[1]) + 0.114 * f32::from(px[2])
    };

    let mut weighted_diff = 0.0f32;
    let mut weight_sum = 0.0f32;
    for (region_px, template_px) in region_grid.pixels().zip(template_grid.pixels()) {
        if template_px[3] < 128 {
            continue;
        }
        let template_luma = luma(template_px);
        let weight = template_luma.max(24.0);
        weighted_diff += weight * (luma(region_px) - template_luma).abs();
        weight_sum += weight;
    }

    if weight_sum == 0.0 {
        return 0.0;
    }
    1.0 - (weighted_diff / weight_sum) / 255.0
}

/// After an echo stat update the "Tuning Successful" banner animates in; the
/// scan waits this long before reading its region.
const BANNER_ANIMATION_WAIT: std::time::Duration = std::time::Duration::from_millis(1500);

/// How long the upgrade flow counts as "just on screen" for the high-rarity
/// dialog read: the dialog is opened from the upgrade screen or its fodder
/// list, so the flow was visible moments before it pops.
const UPGRADE_FLOW_GRACE: std::time::Duration = std::time::Duration::from_secs(5);

/// Read the panel state from one captured frame: is the "Echo Upgrade" panel
/// open, and is the tuning-success banner up? Used to decide when to identify
/// the echo (see [`crate::toggle_echo_mark`]). The cheap echo-menu reads
/// ([`ScanRegions::echoes_text`] and [`ScanRegions::cost_text`]) ride along so
/// the overlay can poll fast while the player is inside the echo menus.
pub(crate) fn scan_from_screenshot(
    app: &AppHandle,
    screenshot: &DynamicImage,
    regions: &ScanRegions,
) -> Result<EchoPanelScan, String> {
    // Read one optional region and return its text (trimmed); missing
    // regions and failed reads both yield no text. These reads are
    // debug evidence and, for the menu regions below, the signal the
    // overlay's scan cadence follows.
    let read_region = |region: Option<&ScanRegion>| -> String {
        region
            .and_then(|region| {
                crop_region(screenshot, region)
                    .and_then(|crop| {
                        perform_ocr_on_image(&crop, app, region.color_filter().as_ref())
                    })
                    .ok()
            })
            .unwrap_or_default()
            .trim()
            .to_string()
    };

    let title = read_region(Some(&regions.echo_upgrade));
    let title_visible = contains_phrase(&title, "echo upgrade");

    // The "Tuning Successful" text animates in after an upgrade, so
    // right after an echo update packet hold the panel open without
    // reading its region yet; the title OCR above keeps running.
    let waiting_for_banner = app
        .state::<SnifferState>()
        .echo_update_recent(BANNER_ANIMATION_WAIT);

    // The tuning-success banner covers the panel title while it is up,
    // so a visible title means the panel is showing normally. Reading
    // the banner region tells "panel open, title hidden" apart from a
    // closed panel, so the overlay card stays and no key press fires.
    // The screen waits for a tap, so this read must keep running for as
    // long as the title is hidden; the read is kept for the
    // menu-detection debug panel.
    let banner_text = if title_visible || waiting_for_banner {
        String::new()
    } else {
        read_region(regions.tuning_successful.as_ref())
    };
    let tuning_successful = tuning_screen_up(title_visible, waiting_for_banner, &banner_text);

    let app_state = app.state::<AppState>();
    let scan_memo = &app_state.scan_memo;

    // The sort-icon template is decoded and shrunk once, then reused; a
    // missing/corrupt resource is retried on the next tick (as before).
    let sort_template = {
        let mut memo = scan_memo.lock().map_err(|e| e.to_string())?;
        if memo.sort_template.is_none() {
            memo.sort_template = SortIconTemplate::load(app).map(Arc::new);
        }
        memo.sort_template.clone()
    };

    // The sort icon marks list screens (upgrade fodder selection,
    // echo bags) where the mark keys do nothing useful - or worse,
    // act on whatever happens to be selected. Template-match it so
    // the overlay can wait the screen out; the score rides along for
    // the menu-detection debug panel.
    let (sort_icon_visible, sort_icon_score) =
        match (regions.sort_icon.as_ref(), sort_template.as_deref()) {
            (Some(region), Some(template)) => match crop_region(screenshot, region) {
                Ok(crop) => {
                    let score = sort_icon_similarity_best(&crop, template);
                    (score >= SORT_ICON_MATCH_THRESHOLD, Some(score))
                }
                Err(_) => (false, None),
            },
            _ => (false, None),
        };

    // Upgrading with high-rarity or already-upgraded echoes in the
    // fodder pops a confirmation dialog ("Includes High Rarity and
    // Upgrade materials. Do you wish to continue upgrade?") that
    // swallows the mark keys, so the overlay waits it out like the
    // sort-icon screen. Either dialog line counts: the OCR may only
    // read one of them cleanly.
    //
    // This is the most expensive read of the scan: the region has no
    // color filter, so on an idle screen it OCRs the whole world strip
    // behind it (hundreds of milliseconds of junk). It is therefore
    // only read while the upgrade flow was on screen moments ago -
    // the dialog can only be opened from there - or while the dialog
    // itself is still up, its buttons waiting for input.
    let flow_now = std::time::Instant::now();
    let upgrade_flow_on_screen =
        title_visible || tuning_successful || waiting_for_banner || sort_icon_visible;
    let (flow_recent, notice_seen) = {
        let memo = scan_memo.lock().map_err(|e| e.to_string())?;
        (
            memo.upgrade_flow_at
                .map_or(false, |at| flow_now.duration_since(at) < UPGRADE_FLOW_GRACE),
            memo.notice_visible,
        )
    };
    let notice_read = flow_recent || notice_seen;
    let high_rarity_notice_text = if notice_read {
        read_region(regions.high_rarity_notice.as_ref())
    } else {
        String::new()
    };
    let high_rarity_notice_visible = contains_phrase(&high_rarity_notice_text, "high rarity")
        || contains_phrase(&high_rarity_notice_text, "continue upgrade");
    {
        let mut memo = scan_memo.lock().map_err(|e| e.to_string())?;
        if upgrade_flow_on_screen {
            memo.upgrade_flow_at = Some(flow_now);
        }
        memo.notice_visible = notice_read && high_rarity_notice_visible;
    }

    // The two cheap "an echo menu is on screen" reads: the echo-bag
    // header and the COST text. The overlay polls fast while either is
    // on screen and drops back to the slow cadence once both have been
    // gone for a few scans with no other menu read in between. Both
    // are phrase-checked: an idle screen OCRs junk out of these areas
    // (the minimap sits right under the header region), and junk must
    // not keep the scan fast.
    let echoes_text = read_region(regions.echoes_text.as_ref());
    let echoes_visible = contains_phrase(&echoes_text, "echo");
    let cost_text = read_region(regions.cost_text.as_ref());
    // The COST text is drawn by the echo-bag screens, which are not
    // the upgrade panel: seeing it means the overlay must close now.
    let echo_cost_visible = contains_phrase(&cost_text, "cost");

    Ok(EchoPanelScan {
        panel_open: title_visible || tuning_successful,
        tuning_successful,
        waiting_for_banner,
        title_text: title.trim().to_string(),
        banner_text: banner_text.trim().to_string(),
        sort_icon_visible,
        sort_icon_score,
        high_rarity_notice_visible,
        high_rarity_notice_text,
        echoes_text,
        echoes_visible,
        cost_text,
        echo_cost_visible,
    })
}
