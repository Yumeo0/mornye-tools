import { describe, expect, test } from "bun:test";
import {
	formatHotkey,
	hotkeyFromEvent,
	matchesHotkey,
	parseHotkey,
} from "./hotkeys";

const plain = { key: "c", ctrl: false, alt: false, shift: false, meta: false };
const event = (patch: Partial<KeyboardEvent> = {}) => ({
	key: "c",
	ctrlKey: false,
	altKey: false,
	shiftKey: false,
	metaKey: false,
	repeat: false,
	isComposing: false,
	defaultPrevented: false,
	...patch,
});

describe("map shortcut keys", () => {
	test("matches the default C shortcut, including Caps Lock, with exact modifiers", () => {
		expect(matchesHotkey(event(), plain)).toBe(true);
		expect(matchesHotkey(event({ key: "C" }), plain)).toBe(true);
		for (const modifier of ["ctrlKey", "altKey", "shiftKey", "metaKey"])
			expect(matchesHotkey(event({ [modifier]: true }), plain)).toBe(false);
	});
	test("does not trigger on key repeats, composition or handled events", () => {
		for (const flag of ["repeat", "isComposing", "defaultPrevented"])
			expect(matchesHotkey(event({ [flag]: true }), plain)).toBe(false);
	});
	test("captures combinations and named keys, reserving Escape/Tab for navigation", () => {
		expect(
			hotkeyFromEvent(event({ key: "K", ctrlKey: true, shiftKey: true })),
		).toEqual({ ...plain, key: "k", ctrl: true, shift: true });
		expect(formatHotkey({ ...plain, key: "k", ctrl: true, shift: true })).toBe(
			"Ctrl+Shift+K",
		);
		expect(formatHotkey({ ...plain, key: " " })).toBe("Space");
		expect(hotkeyFromEvent(event({ key: "F8" }))?.key).toBe("F8");
		for (const key of [
			"Escape",
			"Tab",
			"Control",
			"Alt",
			"Shift",
			"Meta",
			"Dead",
			"Unidentified",
		])
			expect(hotkeyFromEvent(event({ key }))).toBeNull();
	});
	test("validates stored bindings before using them", () => {
		expect(parseHotkey({ ...plain, key: "C" })).toEqual(plain);
		for (const saved of [
			null,
			{},
			"c",
			{ ...plain, key: "Escape" },
			{ ...plain, ctrl: "true" },
		])
			expect(parseHotkey(saved)).toBeNull();
	});
});
