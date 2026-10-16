// Trigger rules for the exact-echo path: when the overlay asks the game to
// identify the echo shown in the upgrade panel. The panel opening is the
// re-fetch signal; the echo name is never read.

import { describe, expect, test } from "bun:test";

import {
	type EchoMenuWatch,
	type EchoPanelScan,
	type EchoTargetState,
	evaluateEchoTarget,
	foldPanelVisibility,
	INITIAL_ECHO_MENU_WATCH,
	INITIAL_ECHO_TARGET,
	MAX_FAILED_ATTEMPTS,
	markRefetched,
	PANEL_CLOSE_TICKS,
	PANEL_SCAN_FAST_INTERVAL_MS,
	PANEL_SCAN_INTERVAL_MS,
	PANEL_SCAN_MENU_MISS_LIMIT,
	PRESS_ATTEMPT_INTERVAL_MS,
	registerFailedAttempt,
	watchEchoMenu,
} from "@/lib/echoTarget";

// Realistic wall-clock base: `lastAttemptAt` starts at 0, i.e. long ago.
const BASE = 1_000_000;

function evaluate(
	state: EchoTargetState,
	panelOpen: boolean,
	now: number,
	overrides: Partial<EchoPanelScan> = {},
) {
	return evaluateEchoTarget(
		state,
		{
			panelOpen,
			tuningSuccessful: false,
			waitingForBanner: false,
			titleText: "",
			bannerText: "",
			sortIconVisible: false,
			sortIconScore: null,
			highRarityNoticeVisible: false,
			highRarityNoticeText: "",
			echoesText: "",
			echoesVisible: false,
			costText: "",
			echoCostVisible: false,
			...overrides,
		},
		now,
	);
}

describe("evaluateEchoTarget", () => {
	test("a closed panel resets the trigger state", () => {
		const state: EchoTargetState = {
			panelOpen: true,
			needsRefetch: true,
			lastAttemptAt: BASE,
			failures: 0,
		};
		const result = evaluate(state, false, BASE + 500);
		expect(result.state).toEqual(INITIAL_ECHO_TARGET);
		expect(result.attempt).toBe(false);
		expect(result.changed).toBe(false);
	});

	test("opening the panel refetches once", () => {
		const first = evaluate(INITIAL_ECHO_TARGET, true, BASE);
		expect(first.changed).toBe(true);
		expect(first.attempt).toBe(true);

		// After the press succeeds, staying open needs no further refetch.
		const pressed = markRefetched(first.state);
		const second = evaluate(pressed, true, BASE + 500);
		expect(second.changed).toBe(false);
		expect(second.attempt).toBe(false);
	});

	test("the tuning-success banner holds the state and skips presses", () => {
		const state: EchoTargetState = {
			panelOpen: true,
			needsRefetch: false,
			lastAttemptAt: BASE,
			failures: 0,
		};
		const tuning = evaluate(state, true, BASE + 500, {
			tuningSuccessful: true,
		});
		expect(tuning.attempt).toBe(false);
		expect(tuning.changed).toBe(false);
		expect(tuning.state.panelOpen).toBe(true);

		// The banner clears with the panel still open: no new refetch.
		const cleared = evaluate(tuning.state, true, BASE + 10 * 500);
		expect(cleared.attempt).toBe(false);
		expect(cleared.changed).toBe(false);
	});

	test("a failed press stays pending and is retried after the throttle", () => {
		const first = evaluate(INITIAL_ECHO_TARGET, true, BASE);
		expect(first.attempt).toBe(true);

		// The press failed (IPC error): needsRefetch stays set, retries are
		// throttled.
		const tooSoon = evaluate(first.state, true, BASE + 1);
		expect(tooSoon.attempt).toBe(false);

		const retry = evaluate(first.state, true, BASE + PRESS_ATTEMPT_INTERVAL_MS);
		expect(retry.attempt).toBe(true);

		// Once the press succeeds the echo is resolved.
		const done = markRefetched(retry.state);
		const settled = evaluate(done, true, BASE + 10 * 500);
		expect(settled.attempt).toBe(false);
	});

	test("closing and reopening the panel refetches again", () => {
		const open = evaluate(INITIAL_ECHO_TARGET, true, BASE);
		const pressed = markRefetched(open.state);

		const closed = evaluate(pressed, false, BASE + 500);
		expect(closed.state).toEqual(INITIAL_ECHO_TARGET);

		const reopened = evaluate(
			closed.state,
			true,
			BASE + PRESS_ATTEMPT_INTERVAL_MS,
		);
		expect(reopened.changed).toBe(true);
		expect(reopened.attempt).toBe(true);
	});

	test("the sort-icon screen holds the state and skips presses", () => {
		const state: EchoTargetState = {
			panelOpen: true,
			needsRefetch: true,
			lastAttemptAt: 0,
			failures: 0,
		};
		const held = evaluate(state, true, BASE + PRESS_ATTEMPT_INTERVAL_MS, {
			sortIconVisible: true,
		});
		expect(held.attempt).toBe(false);
		expect(held.changed).toBe(false);
		expect(held.state.panelOpen).toBe(true);

		// The screen closes with the panel still open: the pending refetch
		// resumes (subject to the throttle).
		const resumed = evaluate(
			held.state,
			true,
			BASE + 2 * PRESS_ATTEMPT_INTERVAL_MS,
		);
		expect(resumed.attempt).toBe(true);
	});

	test("the high-rarity confirmation dialog holds the state and skips presses", () => {
		const state: EchoTargetState = {
			panelOpen: true,
			needsRefetch: true,
			lastAttemptAt: 0,
			failures: 0,
		};
		const held = evaluate(state, true, BASE + PRESS_ATTEMPT_INTERVAL_MS, {
			highRarityNoticeVisible: true,
			highRarityNoticeText:
				"Includes High Rarity and Upgrade materials. Do you wish to continue upgrade?",
		});
		expect(held.attempt).toBe(false);
		expect(held.changed).toBe(false);
		expect(held.state.panelOpen).toBe(true);

		// The dialog closes with the panel still open: the pending refetch
		// resumes (subject to the throttle).
		const resumed = evaluate(
			held.state,
			true,
			BASE + 2 * PRESS_ATTEMPT_INTERVAL_MS,
		);
		expect(resumed.attempt).toBe(true);
	});

	test("failed presses stop retrying after the cap", () => {
		let state = evaluate(INITIAL_ECHO_TARGET, true, BASE).state;
		expect(state.needsRefetch).toBe(true);

		for (let i = 0; i < MAX_FAILED_ATTEMPTS - 1; i++) {
			state = registerFailedAttempt(state);
		}
		expect(state.needsRefetch).toBe(true);

		state = registerFailedAttempt(state);
		expect(state.needsRefetch).toBe(false);

		const after = evaluate(state, true, BASE + 10 * PRESS_ATTEMPT_INTERVAL_MS);
		expect(after.attempt).toBe(false);
	});
});

describe("foldPanelVisibility", () => {
	// A scan with no panel and no menu on screen.
	const closedScan: EchoPanelScan = {
		panelOpen: false,
		tuningSuccessful: false,
		waitingForBanner: false,
		titleText: "",
		bannerText: "",
		sortIconVisible: false,
		sortIconScore: null,
		highRarityNoticeVisible: false,
		highRarityNoticeText: "",
		echoesText: "",
		echoesVisible: false,
		costText: "",
		echoCostVisible: false,
	};
	const openScan: EchoPanelScan = {
		...closedScan,
		panelOpen: true,
		titleText: "Echo Upgrade",
	};
	const bagScan: EchoPanelScan = {
		...closedScan,
		costText: "COST",
		echoCostVisible: true,
	};
	// The dialog over the upgrade panel: its dimmed title stops reading, so
	// the panel itself reads closed while the modal is up.
	const dialogScan: EchoPanelScan = {
		...closedScan,
		highRarityNoticeVisible: true,
		highRarityNoticeText: "Includes High Rarity and Upgrade materials.",
	};

	test("one unreadable scan is a flicker; the next one closes the panel", () => {
		const first = foldPanelVisibility(0, closedScan);
		expect(first.closedTicks).toBe(1);
		expect(first.panelClosed).toBe(false);
		expect(first.hidden).toBe(false);

		const second = foldPanelVisibility(first.closedTicks, closedScan);
		expect(second.closedTicks).toBe(PANEL_CLOSE_TICKS);
		expect(second.panelClosed).toBe(true);
		expect(second.hidden).toBe(true);
	});

	test("an open panel resets the counter", () => {
		expect(foldPanelVisibility(1, openScan)).toEqual({
			closedTicks: 0,
			panelClosed: false,
			hidden: false,
		});
	});

	test("the high-rarity dialog hides the augmentation but keeps the panel", () => {
		// Held even after a closed scan: the panel is still open behind the
		// modal, so the echo survives and the card returns with it.
		const held = foldPanelVisibility(1, dialogScan);
		expect(held).toEqual({ closedTicks: 0, panelClosed: false, hidden: true });

		const back = foldPanelVisibility(held.closedTicks, openScan);
		expect(back.panelClosed).toBe(false);
		expect(back.hidden).toBe(false);
	});

	test("the echo bag closes the augmentation at once", () => {
		expect(foldPanelVisibility(0, bagScan)).toEqual({
			closedTicks: PANEL_CLOSE_TICKS,
			panelClosed: true,
			hidden: true,
		});
	});
});

describe("watchEchoMenu", () => {
	// A tick with no menu on screen; idle OCR junk must not count as a read.
	const emptyScan: EchoPanelScan = {
		panelOpen: false,
		tuningSuccessful: false,
		waitingForBanner: false,
		titleText: "",
		bannerText: "",
		sortIconVisible: false,
		sortIconScore: null,
		highRarityNoticeVisible: false,
		highRarityNoticeText: "",
		echoesText: "",
		echoesVisible: false,
		costText: "",
		echoCostVisible: false,
	};

	test("starts slow, since the overlay launches outside the menus", () => {
		const result = watchEchoMenu(INITIAL_ECHO_MENU_WATCH, emptyScan);
		expect(result.delayMs).toBe(PANEL_SCAN_INTERVAL_MS);
	});

	test("a menu read switches the scan to the fast cadence", () => {
		for (const scan of [
			{ ...emptyScan, echoesText: "Echoes 438/3000", echoesVisible: true },
			{ ...emptyScan, costText: "COST 4", echoCostVisible: true },
			{ ...emptyScan, panelOpen: true, titleText: "Echo Upgrade" },
			{
				...emptyScan,
				highRarityNoticeVisible: true,
				highRarityNoticeText: "Includes High Rarity",
			},
		]) {
			const result = watchEchoMenu(INITIAL_ECHO_MENU_WATCH, scan);
			expect(result.delayMs).toBe(PANEL_SCAN_FAST_INTERVAL_MS);
			expect(result.watch.misses).toBe(0);
		}
	});

	test("the fast cadence holds until the menus are gone for more than two scans", () => {
		let watch: EchoMenuWatch = watchEchoMenu(INITIAL_ECHO_MENU_WATCH, {
			...emptyScan,
			echoesText: "Echoes",
			echoesVisible: true,
		}).watch;

		// Two scans without a menu read still poll fast.
		for (const _ of [1, 2]) {
			const result = watchEchoMenu(watch, emptyScan);
			watch = result.watch;
			expect(result.delayMs).toBe(PANEL_SCAN_FAST_INTERVAL_MS);
		}

		// The third miss is "gone for more than two scans": back to slow.
		const third = watchEchoMenu(watch, emptyScan);
		expect(third.watch.misses).toBe(PANEL_SCAN_MENU_MISS_LIMIT);
		expect(third.delayMs).toBe(PANEL_SCAN_INTERVAL_MS);

		// A menu reappearing speeds the scan up again.
		const back = watchEchoMenu(third.watch, {
			...emptyScan,
			costText: "COST",
			echoCostVisible: true,
		});
		expect(back.watch.misses).toBe(0);
		expect(back.delayMs).toBe(PANEL_SCAN_FAST_INTERVAL_MS);
	});

	test("idle OCR junk does not keep the scan fast", () => {
		// Outside the menus these regions still OCR text out of the game (the
		// minimap sits under the header region) without any phrase matching:
		// the scan must fall back to the slow rate all the same.
		let watch = INITIAL_ECHO_MENU_WATCH;
		for (const scan of [
			{ ...emptyScan, titleText: "12 K" },
			{ ...emptyScan, bannerText: "| 7" },
			{ ...emptyScan, echoesText: "ST", costText: ";" },
			{
				...emptyScan,
				highRarityNoticeText: "h. wy)",
				sortIconVisible: true,
				sortIconScore: 0.42,
			},
		]) {
			const result = watchEchoMenu(watch, scan);
			watch = result.watch;
			expect(result.delayMs).toBe(PANEL_SCAN_INTERVAL_MS);
		}
	});
});
