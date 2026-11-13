import { expect, test } from "bun:test";
import { type AccountSnapshot, EMPTY_ACCOUNT, type SavedTeam } from "./account";
import type { DangerousStatus } from "./dangerous";
import { canEditTeams, teamEditError } from "./teams";

const team: SavedTeam = {
	id: 2,
	name: "Tower",
	roleIds: [1503, 1505],
	currentRole: 1505,
	isCurrent: false,
};
const profile = {
	id: "eu-123",
	playerId: 123,
	serverId: "eu",
	region: "Europe",
};
const snapshot: AccountSnapshot = {
	...EMPTY_ACCOUNT,
	profile,
	resonators: [1503, 1505, 1404].map((id) => ({
		id,
		name: "",
		level: 90,
		breakthrough: 6,
		chain: 0,
		skills: [],
	})),
	teams: [team],
};
const status: DangerousStatus = {
	asked: true,
	enabled: true,
	phase: "connected",
	email: null,
	signed_in: true,
	server_id: "eu",
	player_id: 123,
	error: null,
	account_id: "first",
	accounts: [],
	profile_accounts: {},
};

test("teams can only be edited on the selected profile's active account and server", () => {
	expect(canEditTeams(snapshot, status)).toBe(true);
	for (const connection of [
		null,
		{ ...status, enabled: false },
		{ ...status, phase: "ready" as const },
		{ ...status, player_id: 456 },
		{ ...status, server_id: "asia" },
	])
		expect(canEditTeams(snapshot, connection)).toBe(false);
	expect(canEditTeams({ ...snapshot, profile: null }, status)).toBe(false);
	expect(
		canEditTeams(
			{ ...snapshot, profile: { ...profile, provisional: true } },
			status,
		),
	).toBe(false);
});

test("team edits allow partial teams and reordering but reject duplicates and unowned roles", () => {
	for (const ids of [[1503], [1505, 1503], [1404, 1505, 1503]])
		expect(teamEditError(snapshot, team, ids)).toBeNull();
	for (const ids of [[], [1503, 1503], [9999], [1503, 1505, 1404, 1503]])
		expect(teamEditError(snapshot, team, ids)).not.toBeNull();
});

test("an open team editor detects deletions and incoming in-game changes", () => {
	for (const change of [
		{ roleIds: [1505, 1503] },
		{ name: "Renamed" },
		{ isCurrent: true },
		{ currentRole: 1503 },
	])
		expect(
			teamEditError(
				{ ...snapshot, teams: [{ ...team, ...change }] },
				team,
				[1503],
			),
		).toContain("changed");
	expect(teamEditError({ ...snapshot, teams: [] }, team, [1503])).toContain(
		"changed",
	);
});
