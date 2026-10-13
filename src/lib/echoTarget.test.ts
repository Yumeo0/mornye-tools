// Trigger rules for the exact-echo path: when the overlay asks the game to
// identify the echo shown in the upgrade panel. The panel opening is the
// re-fetch signal; the echo name is never read.

import { describe, expect, test } from "bun:test";

import {
	type EchoPanelScan,
	type EchoTargetState,
	evaluateEchoTarget,
	INITIAL_ECHO_TARGET,
	MAX_FAILED_ATTEMPTS,
	markRefetched,
	PRESS_ATTEMPT_INTERVAL_MS,
	registerFailedAttempt,
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
