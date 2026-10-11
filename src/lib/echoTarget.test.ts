// Trigger rules for the exact-echo path: when the overlay asks the game to
// re-lock the displayed echo. Pure timing logic, no Tauri involved.

import { describe, expect, test } from "bun:test";

import {
	type EchoTargetState,
	evaluateEchoTarget,
	INITIAL_ECHO_TARGET,
	markRefetched,
	NAME_MISSING_MS,
	PRESS_ATTEMPT_INTERVAL_MS,
} from "@/lib/echoTarget";

const SCAN_MS = 1000;
// Realistic wall-clock base: `lastAttemptAt` starts at 0, i.e. long ago.
const BASE = 1_000_000;

function evaluate(
	state: EchoTargetState,
	panelOpen: boolean,
	name: string,
	now: number,
) {
	return evaluateEchoTarget(state, { panelOpen, name }, now);
}

describe("evaluateEchoTarget", () => {
	test("closed panel resets the trigger state", () => {
		const state: EchoTargetState = {
			panelOpen: true,
			name: "Hecate",
			missingSince: null,
			needsRefetch: true,
			lastAttemptAt: BASE,
		};
		const result = evaluate(state, false, "", BASE + SCAN_MS);
		expect(result.state).toEqual(INITIAL_ECHO_TARGET);
		expect(result.attempt).toBe(false);
		expect(result.changed).toBe(false);
	});

	test("first readable name refetches once", () => {
		const first = evaluate(INITIAL_ECHO_TARGET, true, "Hecate", BASE);
		expect(first.changed).toBe(true);
		expect(first.attempt).toBe(true);

		// After the press succeeds, the same name needs no further refetch.
		const pressed = markRefetched(first.state);
		const second = evaluate(pressed, true, "Hecate", BASE + SCAN_MS);
		expect(second.changed).toBe(false);
		expect(second.attempt).toBe(false);
	});

	test("a changed name refetches again after the throttle window", () => {
		const first = evaluate(INITIAL_ECHO_TARGET, true, "Hecate", BASE);
		const changed = evaluate(first.state, true, "Mourning Aix", BASE + SCAN_MS);
		expect(changed.changed).toBe(true);
		expect(changed.attempt).toBe(true);

		// Another change one tick later: detected, but throttled.
		const tooSoon = evaluate(
			changed.state,
			true,
			"Mech Abomination",
			BASE + SCAN_MS + 1,
		);
		expect(tooSoon.changed).toBe(true);
		expect(tooSoon.attempt).toBe(false);

		const later = evaluate(
			tooSoon.state,
			true,
			"Mech Abomination",
			BASE + SCAN_MS + PRESS_ATTEMPT_INTERVAL_MS,
		);
		expect(later.attempt).toBe(true);
	});

	test("a name that stays unreadable for a second refetches", () => {
		const first = evaluate(INITIAL_ECHO_TARGET, true, "", BASE);
		expect(first.attempt).toBe(false);

		const stillMissing = evaluate(
			first.state,
			true,
			"",
			BASE + NAME_MISSING_MS / 2,
		);
		expect(stillMissing.attempt).toBe(false);

		const expired = evaluate(
			stillMissing.state,
			true,
			"",
			BASE + NAME_MISSING_MS,
		);
		expect(expired.attempt).toBe(true);
	});

	test("a failed press stays pending and is retried after the throttle", () => {
		const first = evaluate(INITIAL_ECHO_TARGET, true, "Hecate", BASE);
		expect(first.attempt).toBe(true);

		// The press failed (IPC error): needsRefetch stays set, retries are
		// throttled.
		const tooSoon = evaluate(first.state, true, "Hecate", BASE + 1);
		expect(tooSoon.attempt).toBe(false);

		const retry = evaluate(
			first.state,
			true,
			"Hecate",
			BASE + PRESS_ATTEMPT_INTERVAL_MS,
		);
		expect(retry.attempt).toBe(true);

		// Once the press succeeds the echo is resolved.
		const done = markRefetched(retry.state);
		expect(done.needsRefetch).toBe(false);

		const settled = evaluate(done, true, "Hecate", BASE + 10 * SCAN_MS);
		expect(settled.attempt).toBe(false);
	});
});
