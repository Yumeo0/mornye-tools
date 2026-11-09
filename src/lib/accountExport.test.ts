// Export document shape: the settings UI lets the user pick resonators,
// weapons and echoes; the JSON must contain exactly those parts, in a stable
// key order, with self-explanatory field names (the internal store's
// `incrId`/`funcValue`/... are renamed and decoded).

import { describe, expect, test } from "bun:test";

import type { AccountSnapshot } from "@/lib/account";
import {
	accountExportJson,
	buildAccountExport,
	EXPORT_FORMAT_VERSION,
	echoMarkState,
	exportFileName,
	exportPartCount,
} from "@/lib/accountExport";
import importFixture from "@/lib/fixtures/account-export.json";

const EXPORTED_AT = new Date("2026-10-17T12:34:56.789Z");

const snapshot: AccountSnapshot = {
	version: 1,
	updatedAt: "2026-10-17T10:00:00Z",
	player: { playerId: 12345, name: "Yumeo", level: 80, worldLevel: 9 },
	resonators: [
		{
			id: 1604,
			name: "Carlotta",
			level: 90,
			breakthrough: 6,
			chain: 2,
			skills: [{ id: 3, level: 10 }],
		},
	],
	weapons: [
		{
			incrId: 1,
			itemId: 21010015,
			level: 90,
			breach: 6,
			rank: 1,
			equippedBy: 1604,
		},
	],
	echoes: [
		{
			incrId: 10,
			itemId: 60001195,
			monsterId: 6000119,
			setId: 19,
			level: 25,
			funcValue: 1,
			stackCount: 2,
			mainProps: [{ propId: 5002, key: "critDmg", raw: 4400, value: 44 }],
			subProps: [{ propId: 11, key: "critRate", raw: 870, value: 8.7 }],
			equippedBy: 1604,
			slot: 0,
			source: "sniffer",
		},
	],
};

describe("buildAccountExport", () => {
	test("matches the shared Rust importer fixture", () => {
		const doc = buildAccountExport(
			{
				...snapshot,
				profile: importFixture.map.profile,
				exploration: importFixture.map.exploration as NonNullable<
					AccountSnapshot["exploration"]
				>,
				echoes: [
					...snapshot.echoes,
					{
						...snapshot.echoes[0],
						incrId: -1,
						source: "manual",
						funcValue: 2,
						stackCount: 1,
						slot: 1,
						mainProps: snapshot.echoes[0].mainProps.map((prop) => ({
							...prop,
							propId: 0,
						})),
						subProps: [{ propId: 0, key: "atkFlat", raw: 61, value: 60.5 }],
					},
				],
			},
			["resonators", "weapons", "echoes", "map"],
			EXPORTED_AT,
			importFixture.map.manualMarks,
		);
		expect<unknown>(doc).toEqual(importFixture);
	});
	test("map export preserves captured rewards, imported marks, explicit uncollected overrides and profile identity", () => {
		const exploration = {
			playerId: 12345,
			scene: { mapId: 8, x: 1, y: 2, z: 3 },
			rewards: {
				"8:1": {
					mapId: 8,
					entityId: 1,
					source: "reward-response" as const,
					observedAt: 10,
				},
			},
		};
		const marks = {
			"8:1": { collected: false, updatedAt: 20 },
			"8:2": { collected: true, updatedAt: 30 },
		};
		const profile = {
			id: "eu-12345",
			playerId: 12345,
			serverId: "eu",
			region: "Europe",
		};
		const doc = buildAccountExport(
			{ ...snapshot, profile, exploration },
			["map"],
			EXPORTED_AT,
			marks,
		);
		expect(doc.map).toEqual({
			profile,
			playerId: 12345,
			exploration,
			manualMarks: marks,
		});
		expect(exportPartCount({ ...snapshot, exploration }, "map", marks)).toBe(2);
		expect(doc.echoes).toBeUndefined();
		marks["8:2"].collected = false;
		expect(doc.map?.manualMarks["8:2"].collected).toBe(true);
	});
	test("manual-only map progress exports even before any passive exploration sync", () => {
		const marks = { "8:2": { collected: true, updatedAt: 30 } };
		const doc = JSON.parse(
			accountExportJson(snapshot, ["map"], EXPORTED_AT, marks),
		);
		expect(doc.map.playerId).toBe(12345);
		expect(doc.map.exploration.rewards).toEqual({});
		expect(doc.map.manualMarks).toEqual(marks);
		expect(
			buildAccountExport(snapshot, [], EXPORTED_AT, marks).map,
		).toBeUndefined();
	});
	test("keeps only the selected parts, in canonical order", () => {
		const doc = buildAccountExport(
			snapshot,
			["echoes", "resonators"],
			EXPORTED_AT,
		);
		expect(Object.keys(doc)).toEqual([
			"version",
			"updatedAt",
			"exportedAt",
			"player",
			"resonators",
			"echoes",
		]);
		expect("weapons" in doc).toBe(false);
	});

	test("carries the snapshot and export metadata", () => {
		const doc = buildAccountExport(snapshot, ["weapons"], EXPORTED_AT);
		expect(doc.version).toBe(EXPORT_FORMAT_VERSION);
		expect(doc.updatedAt).toBe(snapshot.updatedAt);
		expect(doc.exportedAt).toBe("2026-10-17T12:34:56.789Z");
		expect(doc.player).toEqual(snapshot.player ?? null);
	});

	test("maps an unknown player to null", () => {
		const doc = buildAccountExport(
			{ ...snapshot, player: null },
			[],
			EXPORTED_AT,
		);
		expect(doc.player).toBeNull();
		expect(Object.keys(doc)).toEqual([
			"version",
			"updatedAt",
			"exportedAt",
			"player",
		]);
	});

	test("renames resonator fields and decodes its skill nodes", () => {
		const doc = buildAccountExport(snapshot, ["resonators"], EXPORTED_AT);
		expect(doc.resonators).toEqual([
			{
				resonatorId: 1604,
				level: 90,
				breakthrough: 6,
				chain: 2,
				skills: [{ nodeId: 3, level: 10 }],
			},
		]);
	});

	test("renames weapon fields", () => {
		const doc = buildAccountExport(snapshot, ["weapons"], EXPORTED_AT);
		expect(doc.weapons).toEqual([
			{
				instanceId: 1,
				itemId: 21010015,
				level: 90,
				breach: 6,
				rank: 1,
				equippedByResonatorId: 1604,
			},
		]);
	});

	test("renames echo fields and decodes the mark state", () => {
		const doc = buildAccountExport(snapshot, ["echoes"], EXPORTED_AT);
		expect(doc.echoes).toEqual([
			{
				instanceId: 10,
				itemId: 60001195,
				monsterId: 6000119,
				echoSetId: 19,
				level: 25,
				markState: "locked",
				stackCount: 2,
				mainStats: [
					{ statId: 5002, statKey: "critDmg", value: 44, rawValue: 4400 },
				],
				subStats: [
					{ statId: 11, statKey: "critRate", value: 8.7, rawValue: 870 },
				],
				equippedByResonatorId: 1604,
				slotIndex: 0,
				source: "sniffer",
			},
		]);
	});
});

describe("echoMarkState", () => {
	test("decodes every game value", () => {
		expect(echoMarkState(0)).toBe("none");
		expect(echoMarkState(1)).toBe("locked");
		expect(echoMarkState(2)).toBe("markedForDiscard");
	});

	test("falls back to none for unknown values", () => {
		expect(echoMarkState(7)).toBe("none");
	});
});

describe("accountExportJson", () => {
	test("round-trips the built document", () => {
		const parts = ["resonators", "weapons", "echoes"] as const;
		const json = accountExportJson(snapshot, parts, EXPORTED_AT);
		expect(json).toContain("\n"); // pretty-printed
		expect(JSON.parse(json)).toEqual(
			buildAccountExport(snapshot, parts, EXPORTED_AT),
		);
	});
});

describe("exportFileName", () => {
	test("stamps the export time into the name", () => {
		expect(exportFileName(EXPORTED_AT)).toBe(
			"mornye-export-2026-10-17T12-34-56.json",
		);
	});
});

describe("exportPartCount", () => {
	test("counts the entries of each part", () => {
		expect(exportPartCount(snapshot, "resonators")).toBe(1);
		expect(exportPartCount(snapshot, "weapons")).toBe(1);
		expect(exportPartCount(snapshot, "echoes")).toBe(1);
	});
});
