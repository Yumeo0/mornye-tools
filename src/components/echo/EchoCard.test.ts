// Right-click "copy echo info": the plain-text summary must stay stable so
// clipboard content survives the card layout changing.

import { describe, expect, test } from "bun:test";

import { echoInfoText } from "@/components/echo/EchoCard";
import type { Echo } from "@/lib/account";

const echo: Echo = {
	incrId: 1,
	itemId: 60001195,
	monsterId: 6000119,
	setId: 19,
	level: 25,
	funcValue: 1,
	stackCount: 1,
	mainProps: [{ propId: 5002, key: "critDmg", raw: 4400, value: 44 }],
	subProps: [
		{ propId: 11, key: "critRate", raw: 870, value: 8.7 },
		{ propId: 2, key: "atkFlat", raw: 60, value: 60 },
	],
	source: "sniffer",
};

describe("echoInfoText", () => {
	test("formats name, main/subs and the roll value", () => {
		const text = echoInfoText(echo, {
			rating: 90,
			character: { character_name: "Carlotta" },
		});
		expect(text.split("\n")).toEqual([
			"Nightmare: Tambourinist +25 · Dream of the Lost",
			"Main: Crit. DMG 44%",
			"Subs: Crit. Rate 8.7% / ATK 60",
			"RV 90% (Carlotta)",
		]);
	});

	test("omits the roll value when none is known", () => {
		const lines = echoInfoText(echo).split("\n");
		expect(lines.at(-1)).toBe("Subs: Crit. Rate 8.7% / ATK 60");
	});

	test("shows the stack count when the entry represents several copies", () => {
		const lines = echoInfoText({ ...echo, stackCount: 51 }).split("\n");
		expect(lines[0]).toBe(
			"Nightmare: Tambourinist +25 ×51 · Dream of the Lost",
		);
	});
});
