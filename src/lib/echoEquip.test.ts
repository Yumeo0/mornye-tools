import { expect, test } from "bun:test";
import type { AccountSnapshot, Echo } from "./account";
import { echoesByMonsterId } from "./catalog";
import type { DangerousStatus } from "./dangerous";
import { isOptimizerBuildEquipped, optimizerEquipError } from "./echoEquip";

const monster = [...echoesByMonsterId.values()].find(
	(echo) => echo.echo_cost === 1,
);
if (monster?.monster_id == null) throw new Error("Missing one-cost fixture");
const monsterId = monster.monster_id;
const echoes: Echo[] = Array.from({ length: 5 }, (_, index) => ({
	incrId: index + 1,
	itemId: 60000015,
	monsterId,
	setId: 1,
	level: 25,
	funcValue: 0,
	stackCount: 1,
	mainProps: [],
	subProps: [],
	source: "sniffer",
	equippedBy: 1503,
	slot: index,
}));
const snapshot: AccountSnapshot = {
	version: 1,
	updatedAt: "",
	weapons: [],
	echoes,
	resonators: [
		{ id: 1503, name: "", level: 90, breakthrough: 6, chain: 0, skills: [] },
	],
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
const uids = echoes.map((echo) => `incr:${echo.incrId}`);

test("equipping requires the connected profile, owned character and available captured pieces", () => {
	expect(optimizerEquipError(snapshot, status, 1503, uids)).toBeNull();
	for (const connection of [
		null,
		{ ...status, player_id: 456 },
		{ ...status, server_id: "asia" },
	]) {
		expect(
			optimizerEquipError(snapshot, connection, 1503, uids),
		).not.toBeNull();
	}
	expect(optimizerEquipError(snapshot, status, 1504, uids)).not.toBeNull();
	expect(
		optimizerEquipError(snapshot, status, 1503, uids.slice(1)),
	).not.toBeNull();
	expect(
		optimizerEquipError(snapshot, status, 1503, [...uids.slice(0, 4), uids[0]]),
	).not.toBeNull();
	expect(
		optimizerEquipError(
			{ ...snapshot, echoes: echoes.slice(1) },
			status,
			1503,
			uids,
		),
	).not.toBeNull();
	expect(
		optimizerEquipError(
			{
				...snapshot,
				echoes: echoes.map((echo) => ({ ...echo, source: "manual" })),
			},
			status,
			1503,
			uids,
		),
	).not.toBeNull();
	const costly = [...echoesByMonsterId.values()].find(
		(echo) => echo.echo_cost === 4,
	);
	if (costly?.monster_id == null) throw new Error("Missing four-cost fixture");
	const costlyMonsterId = costly.monster_id;
	expect(
		optimizerEquipError(
			{
				...snapshot,
				echoes: echoes.map((echo) => ({
					...echo,
					monsterId: costlyMonsterId,
				})),
			},
			status,
			1503,
			uids,
		),
	).toContain("12-cost");
});

test("equipped comparison preserves the main slot while ignoring passive order", () => {
	expect(
		isOptimizerBuildEquipped(
			{ ...snapshot, echoes: [...echoes].reverse() },
			1503,
			uids,
		),
	).toBe(true);
	expect(
		isOptimizerBuildEquipped(snapshot, 1503, [
			uids[0],
			...uids.slice(1).reverse(),
		]),
	).toBe(true);
	expect(
		isOptimizerBuildEquipped(snapshot, 1503, [
			uids[1],
			uids[0],
			...uids.slice(2),
		]),
	).toBe(false);
	expect(isOptimizerBuildEquipped(snapshot, 1504, uids)).toBe(false);
	expect(
		isOptimizerBuildEquipped(
			{ ...snapshot, echoes: echoes.slice(1) },
			1503,
			uids,
		),
	).toBe(false);
});
