// Right-click "copy echo info": the plain-text summary must stay stable so
// clipboard content survives the card layout changing.

import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { EchoCard, echoInfoText } from "@/components/echo/EchoCard";
import { EchoInventoryCard } from "@/components/echo/EchoInventoryCard";
import { EchoMarkControls } from "@/components/echo/EchoMarkControls";
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

const visibleText = (markup: string) => markup.replace(/<[^>]*>/g, "");
const buttonTags = (markup: string) =>
	[...markup.matchAll(/<button\b[^>]*>/g)].map(([button]) => button);

describe("echo card states and controls", () => {
	test("read-only cards explicitly distinguish unlocked, locked and discarded echoes", () => {
		for (const [funcValue, label] of [
			[0, "Unlocked"],
			[1, "Locked"],
			[2, "Discarded"],
		] as const) {
			const markup = renderToStaticMarkup(
				createElement(EchoCard, { echo: { ...echo, funcValue } }),
			);
			expect(markup).toContain(`aria-label="${label}"`);
			expect(buttonTags(markup)).toEqual([]);
		}
	});

	test("the main-stat section includes the secondary flat stat", () => {
		const markup = renderToStaticMarkup(
			createElement(EchoCard, {
				echo: {
					...echo,
					mainProps: [
						...echo.mainProps,
						{ propId: 2, key: "atkFlat", raw: 150, value: 150 },
					],
				},
			}),
		);
		expect(visibleText(markup)).toContain("44%");
		expect(visibleText(markup)).toContain("+150 ATK");
	});

	test("mark controls identify their current state and action through accessible labels and pressed state", () => {
		for (const [funcValue, lockAction, lockPressed, discardPressed] of [
			[0, "Lock echo", false, false],
			[1, "Unlock echo", true, false],
			[2, "Lock echo", false, true],
		] as const) {
			const markup = renderToStaticMarkup(
				createElement(EchoMarkControls, {
					echo: { ...echo, funcValue },
					disabled: false,
					pending: false,
					onChange: () => {},
				}),
			);
			const buttons = buttonTags(markup);
			expect(buttons).toHaveLength(2);
			expect(
				buttons.find((button) => button.includes(`aria-label="${lockAction}"`)),
			).toContain(`aria-pressed="${lockPressed}"`);
			expect(buttons.find((button) => button.includes("discard"))).toContain(
				`aria-pressed="${discardPressed}"`,
			);
		}
	});

	test("a pending mark disables both mutations", () => {
		const markup = renderToStaticMarkup(
			createElement(EchoMarkControls, {
				echo,
				disabled: false,
				pending: true,
				onChange: () => {},
			}),
		);
		expect(markup).toContain('aria-busy="true"');
		for (const button of buttonTags(markup)) {
			expect(button).toContain('disabled=""');
		}
	});

	test("captured inventory cards expose an actions menu and a readable equipment state", () => {
		const markup = renderToStaticMarkup(
			createElement(EchoInventoryCard, {
				echo,
				characterOptions: [],
				onChangeEquipped: () => {},
				onCopyInfo: () => {},
				onRemove: () => {},
			}),
		);
		expect(markup).toContain(
			'aria-label="Actions for Nightmare: Tambourinist"',
		);
		expect(visibleText(markup)).toContain("Not equipped");
		expect(markup).not.toContain('data-slot="select-trigger"');
	});
});
