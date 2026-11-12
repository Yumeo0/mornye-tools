import { AsyncLocalStorage } from "node:async_hooks";
import { inspect } from "node:util";

interface StageOutput {
	verbose: boolean;
	summaries: string[];
	warnings: number;
}

const stageOutput = new AsyncLocalStorage<StageOutput>();
const colored = !!process.stdout.isTTY && !process.env.NO_COLOR;
const style = (code: number, value: string) =>
	colored ? `\x1b[${code}m${value}\x1b[0m` : value;
const indent = (message: string) => message.replace(/^/gm, "    ");

export function formatDuration(milliseconds: number): string {
	if (milliseconds < 1000) return `${Math.round(milliseconds)}ms`;
	if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(1)}s`;
	return `${Math.floor(milliseconds / 60_000)}m ${Math.floor((milliseconds % 60_000) / 1000)}s`;
}

export const dataLog = {
	info(message: string): void {
		const output = stageOutput.getStore();
		if (output) output.summaries.push(message);
		else console.log(message);
	},
	detail(message: string): void {
		const output = stageOutput.getStore();
		if (output?.verbose ?? Bun.argv.includes("--verbose"))
			console.log(output ? indent(message) : message);
	},
	progress(message: string): void {
		console.log(stageOutput.getStore() ? indent(message) : message);
	},
	warn(message: string): void {
		const output = stageOutput.getStore();
		if (output) output.warnings++;
		console.warn(indent(style(33, `! ${message}`)));
	},
};

export interface DataStage {
	name: string;
	run: () => Promise<unknown>;
	/** Optional network sources retain their previous bundled output on failure. */
	onFailure?: string;
}

export async function runDataStages(
	stages: DataStage[],
	{ verbose = false } = {},
): Promise<void> {
	const started = performance.now();
	let warnings = 0;
	let skipped = 0;
	console.log(`\n${style(1, "Mornye · Game data")}\n`);
	for (const [index, stage] of stages.entries()) {
		const counter = `${index + 1}`.padStart(String(stages.length).length, "0");
		console.log(
			`${style(36, `[${counter}/${stages.length}]`)} ${style(1, stage.name)}`,
		);
		const output: StageOutput = { verbose, summaries: [], warnings: 0 };
		const stageStarted = performance.now();
		let failed = false;
		try {
			await stageOutput.run(output, stage.run);
		} catch (error) {
			failed = true;
			if (!stage.onFailure) {
				console.error(
					indent(
						style(
							31,
							`✗ Failed after ${formatDuration(performance.now() - stageStarted)}`,
						),
					),
				);
				throw new Error(`${stage.name} failed`, { cause: error });
			}
			skipped++;
			await stageOutput.run(output, () => {
				dataLog.warn(
					`${stage.onFailure}\n${error instanceof Error ? error.message : String(error)}`,
				);
				dataLog.detail(inspect(error, { colors: colored, depth: 3 }));
			});
		}
		warnings += output.warnings;
		const duration = formatDuration(performance.now() - stageStarted);
		console.log(
			indent(
				style(
					failed ? 33 : 32,
					`${failed ? "! Skipped" : "✓ Done"} · ${duration}`,
				),
			),
		);
		for (const summary of output.summaries) console.log(indent(summary));
		console.log();
	}
	console.log(
		style(
			warnings ? 33 : 32,
			`Finished in ${formatDuration(performance.now() - started)} · ${stages.length - skipped} completed${skipped ? ` · ${skipped} skipped` : ""}${warnings ? ` · ${warnings} warning${warnings === 1 ? "" : "s"}` : ""}.`,
		),
	);
}
