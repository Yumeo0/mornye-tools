import { describe, expect, test } from "bun:test";
import type { AccountProfile } from "@/lib/account";
import { gameAccountGroups } from "./gameAccountGroups";

const profile = (id: string, name = id, playerId = 123): AccountProfile => ({
	id,
	name,
	playerId,
	serverId: "eu",
	region: "Europe",
	updatedAt: "",
});
const accounts = [
	{ id: "b", email: "b@example.com", remembered: false },
	{ id: "a", email: "a@example.com", remembered: true },
];

describe("game account groups", () => {
	test("sorts accounts and nests every linked profile under its account", () => {
		const profiles = [profile("2", "Z"), profile("1", "A"), profile("3")];
		const groups = gameAccountGroups(accounts, profiles, {
			"1": "a",
			"2": "a",
			"3": "b",
		});
		expect(groups.map((g) => g.account?.id)).toEqual(["a", "b"]);
		expect(groups.map((g) => g.profiles.map((p) => p.id))).toEqual([
			["1", "2"],
			["3"],
		]);
		expect(accounts[0].id).toBe("b");
		expect(profiles[0].id).toBe("2");
	});

	test("keeps captures and orphaned links visible once in the unlinked group", () => {
		const groups = gameAccountGroups(
			accounts,
			[profile("capture"), profile("orphan")],
			{ orphan: "missing" },
		);
		expect(groups.slice(0, 2).every((g) => !g.profiles.length)).toBe(true);
		expect(groups[2].account).toBeNull();
		expect(groups[2].profiles.map((p) => p.id)).toEqual(["capture", "orphan"]);
	});

	test("hides the empty default profile but preserves a populated capture", () => {
		const profiles = [profile("default", "", 0), profile("capture", "", 0)];
		expect(gameAccountGroups([], profiles, {})).toEqual([]);
		expect(gameAccountGroups([], profiles, {}, "capture")[0].profiles).toEqual([
			profiles[1],
		]);
	});
});
