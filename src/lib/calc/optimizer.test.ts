import { expect, test } from "bun:test";
import { EMPTY_OPTIMIZER_FILTERS } from "@/components/optimizer/optimizerOptions";
import echoData from "@/configs/echo_data.json";
import { type Echo, EMPTY_ACCOUNT } from "@/lib/account";
import { makeFixture } from "../../../calculator/fixture";
import { selectCandidates, teamAvailability } from "./optimizer";
import { getCatalog } from "./riley/engine.generated.js";

test("pool truncation retains required main copies and respects filters and teammate reservations", () => {
	const fixture = makeFixture(getCatalog());
	const owned = (index: number, main: boolean): Echo => {
		const e = fixture.inventory[main ? 0 : 3];
		return {
			incrId: index,
			itemId: echoData.find((d) => d.monster_id === e.typeId)!.echo_id,
			monsterId: e.typeId,
			setId: e.setId,
			level: 25,
			funcValue: 0,
			stackCount: 1,
			source: "manual",
			mainProps: e.mainStats,
			subProps: e.substats,
		};
	};
	const snapshot = {
		...EMPTY_ACCOUNT,
		echoes: [
			...Array.from({ length: 300 }, (_, i) => owned(i, false)),
			owned(900, true),
			owned(901, true),
		],
	};
	fixture.scenario.members[0].echoes[0].uid = "incr:900";
	const selected = selectCandidates(
		snapshot,
		fixture.profile,
		fixture.scenario.members,
		1404,
		EMPTY_OPTIMIZER_FILTERS,
	);
	expect(selected.truncated).toBe(true);
	expect(selected.mainCount).toBe(1);
	expect(selected.pool.some((e) => e.uid === "incr:901")).toBe(true);
	expect(selected.pool.some((e) => e.uid === "incr:900")).toBe(false);
	fixture.scenario.members[0].echoSource = "rotation";
	const theoretical = selectCandidates(
		snapshot,
		fixture.profile,
		fixture.scenario.members,
		1404,
		EMPTY_OPTIMIZER_FILTERS,
	);
	expect(theoretical.mainCount).toBe(2);
	expect(theoretical.pool.some((e) => e.uid === "incr:900")).toBe(true);
	const filtered = selectCandidates(
		snapshot,
		fixture.profile,
		fixture.scenario.members,
		1404,
		{ ...EMPTY_OPTIMIZER_FILTERS, mainStats: ["energyRegen"] },
	);
	expect(filtered.mainCount).toBe(0);
});

test("catalog keeps unowned teams visible and reports the unavailable members", () => {
	const { profile } = makeFixture(getCatalog());
	expect(teamAvailability(EMPTY_ACCOUNT, profile)).toEqual(
		profile.members.map((m) => `${m.name} is not owned`),
	);
});
