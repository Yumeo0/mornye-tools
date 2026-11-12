import { expect, test } from "bun:test";
import { parseUpdateOptions } from "./update-data";

test("one-command update accepts client/tool overrides and verbose output", () => {
	expect(
		parseUpdateOptions([
			"--game",
			"C:/Games/Wuthering Waves/Client",
			"--keys",
			"keys.json",
			"--verbose",
			"--protoc",
			"tools/protoc",
		]),
	).toEqual({
		game: "C:/Games/Wuthering Waves/Client",
		keys: "keys.json",
		verbose: true,
		protoc: "tools/protoc",
	});
	expect(parseUpdateOptions([])).toEqual({ verbose: false });
});

test("one-command update rejects stale-protocol opt-outs and malformed options", () => {
	for (const args of [
		["--pinned"],
		["--game"],
		["--keys", "--verbose"],
		["--game", "one", "--game", "two"],
	])
		expect(() => parseUpdateOptions(args)).toThrow();
});
