import { describe, expect, test } from "bun:test";
import { type Echo, EMPTY_ACCOUNT } from "./account";
import type { DangerousStatus } from "./dangerous";
import { canMarkEcho, echoMark } from "./echoMark";

const snapshot = {
	...EMPTY_ACCOUNT,
	profile: { id: "eu-123", playerId: 123, serverId: "eu", region: "Europe" },
};
const connection: DangerousStatus = {
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
const echo: Echo = {
	incrId: 21,
	itemId: 60000015,
	monsterId: 1,
	setId: 1,
	level: 25,
	funcValue: 0,
	stackCount: 3,
	mainProps: [],
	subProps: [],
	source: "sniffer",
};

describe("explicit echo marks", () => {
	test("only captured echoes from the connected player and server can be marked", () => {
		expect(canMarkEcho(snapshot, connection, echo)).toBe(true);
		for (const other of [
			null,
			{ ...connection, phase: "ready" as const },
			{ ...connection, player_id: 456 },
			{ ...connection, server_id: "asia" },
			{ ...connection, enabled: false },
		]) {
			expect(canMarkEcho(snapshot, other, echo)).toBe(false);
		}
		for (const other of [
			{ ...echo, source: "manual" as const },
			{ ...echo, incrId: -1 },
			{ ...echo, funcValue: 3 },
		]) {
			expect(canMarkEcho(snapshot, connection, other)).toBe(false);
		}
		expect(canMarkEcho({ ...snapshot, profile: null }, connection, echo)).toBe(
			false,
		);
	});
	test("marks reflect authoritative state, including stacks and fully leveled echoes", () => {
		for (const [funcValue, mark] of [
			[0, "none"],
			[1, "locked"],
			[2, "discarded"],
		] as const) {
			const current = { ...echo, funcValue, equippedBy: 1501 };
			expect(echoMark(current)).toBe(mark);
			expect(canMarkEcho(snapshot, connection, current)).toBe(true);
		}
	});
});
