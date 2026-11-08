import { describe, expect, test } from "bun:test";
import type { AccountSnapshot, Echo } from "./account";
import type { DangerousStatus } from "./dangerous";
import {
	canUpgradeEcho,
	echoLevelLimit,
	isUpgradeableEcho,
} from "./echoUpgrade";

const snapshot: AccountSnapshot = {
	version: 1,
	updatedAt: "",
	resonators: [],
	weapons: [],
	echoes: [],
	profile: { id: "eu-123", playerId: 123, serverId: "eu", region: "Europe" },
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
const echo: Echo = {
	incrId: 20,
	itemId: 60000015,
	monsterId: 390070051,
	setId: 1,
	level: 0,
	funcValue: 0,
	stackCount: 3,
	mainProps: [],
	subProps: [],
	source: "sniffer",
};

describe("echo upgrade eligibility", () => {
	test("requires the same connected player and server", () => {
		expect(canUpgradeEcho(snapshot, status)).toBe(true);
		for (const other of [
			null,
			{ ...status, enabled: false },
			{ ...status, phase: "ready" as const },
			{ ...status, player_id: 456 },
			{ ...status, server_id: "asia" },
		]) {
			expect(canUpgradeEcho(snapshot, other)).toBe(false);
		}
		expect(canUpgradeEcho({ ...snapshot, profile: null }, status)).toBe(false);
	});
	test("allows one copy from a stack and honors each rarity's level cap", () => {
		expect(isUpgradeableEcho(echo)).toBe(true);
		expect(
			[60000012, 60000013, 60000014, 60000015].map(echoLevelLimit),
		).toEqual([10, 15, 20, 25]);
		for (const other of [
			{ ...echo, source: "manual" as const },
			{ ...echo, incrId: -1 },
			{
				...echo,
				level: 25,
				subProps: Array.from({ length: 5 }, () => ({
					propId: 1,
					key: "critRate" as const,
					raw: 630,
					value: 6.3,
				})),
			},
			{ ...echo, itemId: 1 },
		]) {
			expect(isUpgradeableEcho(other)).toBe(false);
		}
	});
});
