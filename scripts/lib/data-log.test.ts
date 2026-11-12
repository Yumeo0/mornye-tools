import {
	afterEach,
	beforeEach,
	expect,
	type Mock,
	spyOn,
	test,
} from "bun:test";
import { dataLog, runDataStages } from "./data-log";

let log: Mock<typeof console.log>;
let warn: Mock<typeof console.warn>;
let errorLog: Mock<typeof console.error>;

beforeEach(() => {
	log = spyOn(console, "log").mockImplementation(() => {});
	warn = spyOn(console, "warn").mockImplementation(() => {});
	errorLog = spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
	log.mockRestore();
	warn.mockRestore();
	errorLog.mockRestore();
});

test("default output shows summaries and warnings while verbose enables processing details", async () => {
	const stage = {
		name: "Echoes",
		run: async () => {
			dataLog.detail("Processed: Jué");
			dataLog.info("258 echoes");
			dataLog.warn("Missing tile");
		},
	};
	await runDataStages([stage]);
	expect(log.mock.calls.flat().join("\n")).toContain("258 echoes");
	expect(log.mock.calls.flat().join("\n")).not.toContain("Processed:");
	expect(warn.mock.calls.flat().join("\n")).toContain("Missing tile");
	expect(log.mock.calls.flat().join("\n")).toContain("1 warning");
	await runDataStages([stage], { verbose: true });
	expect(log.mock.calls.flat().join("\n")).toContain("Processed: Jué");
});

test("optional failures report a skipped stage and continue publishing", async () => {
	let published = false;
	await runDataStages([
		{
			name: "Guides",
			onFailure: "Keeping bundled guides",
			run: async () => {
				throw new Error("site unavailable");
			},
		},
		{
			name: "Assets",
			run: async () => {
				published = true;
			},
		},
	]);
	expect(published).toBe(true);
	expect(warn.mock.calls.flat().join("\n")).toContain("site unavailable");
	expect(log.mock.calls.flat().join("\n")).toContain(
		"1 completed · 1 skipped · 1 warning",
	);
});

test("required failures retain their OS error and stop subsequent stages", async () => {
	const failure = Object.assign(new Error("open catalog.json"), {
		code: "EUNKNOWN",
		path: "catalog.json",
	});
	let published = false;
	await expect(
		runDataStages([
			{
				name: "Characters",
				run: async () => {
					throw failure;
				},
			},
			{
				name: "Assets",
				run: async () => {
					published = true;
				},
			},
		]),
	).rejects.toMatchObject({ message: "Characters failed", cause: failure });
	expect(published).toBe(false);
	expect(log.mock.calls.flat().join("\n")).not.toContain("Finished in");
});
