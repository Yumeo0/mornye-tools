// Stack-split following: upgrading one copy of a stack moves it to a new
// instance id while the old id becomes the unleveled remainder. The overlay
// card must follow the operated half. (The matching queue-entry retargeting
// lives in the Rust supervisor; see `overlay.rs`.)

import { describe, expect, test } from "bun:test";

import type { Echo } from "@/lib/account";
import { type EchoSplitPayload, splitFollowTarget } from "@/lib/overlayEcho";

function echo(incrId: number, overrides: Partial<Echo> = {}): Echo {
	return {
		incrId,
		itemId: 60000325,
		monsterId: 390080007,
		setId: 2,
		level: 0,
		funcValue: 0,
		stackCount: 1,
		mainProps: [],
		subProps: [],
		source: "sniffer",
		...overrides,
	};
}

// Stack 100 (×51) split by an upgrade: the leveled copy moves to 500, the
// remainder keeps the old id.
const split: EchoSplitPayload = {
	operated: echo(500, { level: 1 }),
	remainder: echo(100, { stackCount: 50 }),
};

describe("splitFollowTarget", () => {
	test("follows the operated half when the card tracked the old stack id", () => {
		const follow = splitFollowTarget(echo(100, { stackCount: 51 }), split);
		expect(follow?.incrId).toBe(500);
		expect(follow?.level).toBe(1);
	});

	test("refreshes a card already on the operated half", () => {
		expect(splitFollowTarget(echo(500), split)?.incrId).toBe(500);
	});

	test("ignores splits of other echoes", () => {
		expect(splitFollowTarget(echo(7), split)).toBeNull();
		expect(splitFollowTarget(null, split)).toBeNull();
	});

	test("ignores unrelated ids when no remainder survived the split", () => {
		const noRemainder: EchoSplitPayload = {
			operated: echo(500, { level: 1 }),
			remainder: null,
		};
		expect(splitFollowTarget(echo(100), noRemainder)).toBeNull();
		expect(splitFollowTarget(echo(500), noRemainder)?.incrId).toBe(500);
	});
});
