// Manual CPU/worker measurements, never a wall-clock CI assertion.

import { mkdir } from "node:fs/promises";
import { cpus, release } from "node:os";
import { makeFixture } from "../calculator/fixture";
import historical from "../docs/benchmarks/legacy-fixture.json";
import echoData from "../src/configs/echo_data.json";
import type { EchoProp, StatKey } from "../src/lib/account";
import {
	evaluate,
	evaluateFast,
	getCatalog,
} from "../src/lib/calc/riley/engine.generated.js";
import { searchInventory } from "../src/lib/calc/search";
import type {
	CalcEcho,
	Scenario,
	SearchRequest,
	SimulationResult,
} from "../src/lib/calc/types";

const option = (name: string, fallback: number) => {
	const i = process.argv.indexOf(`--${name}`);
	const n = i < 0 ? fallback : Number(process.argv[i + 1]);
	if (!Number.isInteger(n) || n < 1) throw new Error(`Invalid --${name}`);
	return n;
};
const samples = option("samples", 30),
	budget = option("budget", 1500);
const start = performance.now(),
	catalog = getCatalog();
const cold = makeFixture(catalog);
const first = evaluate(cold.scenario);
if (!first.feasible) throw new Error(first.diagnostics.join(" "));
const coldMs = performance.now() - start;
const prop = (key: string, value: number): EchoProp => ({
	key: key as StatKey,
	value,
	raw: Math.round(value * 100),
	propId: 0,
});
interface HistoricalEcho {
	uid: string;
	id: string;
	set: number;
	mainStats: {
		primary: { key: string; value: number };
		secondary: { key: string; value: number };
	};
	substats: Record<string, number | undefined>;
}
const convert = (e: HistoricalEcho): CalcEcho => {
	const def = echoData.find((d) => d.monster_id === Number(e.id));
	if (!def) throw new Error(`Unknown historical echo ${e.id}`);
	return {
		uid: e.uid,
		typeId: Math.min(
			...echoData
				.filter((d) => d.echo_name === def.echo_name && d.monster_id != null)
				.map((d) => d.monster_id!),
		),
		name: def.echo_name,
		cost: def.echo_cost!,
		setId: e.set,
		level: 25,
		mainStats: [
			prop(e.mainStats.primary.key, e.mainStats.primary.value),
			prop(e.mainStats.secondary.key, e.mainStats.secondary.value),
		],
		substats: Object.entries(e.substats).map(([k, v]) => prop(k, v!)),
	};
};
const oldInventory = historical.inventory.map(convert);
const oldScenario: Scenario = {
	...cold.scenario,
	members: cold.scenario.members.map((m, i) => ({
		...m,
		echoes:
			i < 2
				? historical.supportEchoes[i].map(convert)
				: historical.samples[0].map((n) => oldInventory[n]),
	})),
};

const timings: unknown[] = [];
for (const [name, base, inventory] of [
	["historical-240", oldScenario, oldInventory],
	["current-240", cold.scenario, cold.inventory],
] as const) {
	for (const cycles of [1, 4]) {
		const scenarios = Array.from(
			{ length: samples },
			(_, i): Scenario => ({
				...base,
				cycles,
				members: base.members.map((m, j) => ({
					...m,
					echoes:
						j === 2
							? name === "historical-240"
								? historical.samples[i % historical.samples.length].map(
										(n) => inventory[n],
									)
								: inventory.slice((i % 48) * 5, (i % 48) * 5 + 5)
							: m.echoes,
				})),
			}),
		);
		for (const s of scenarios.slice(0, 5)) evaluate(s);
		for (const [mode, fn] of [
			["provisional", evaluateFast],
			["validated", evaluate],
		] as const) {
			const elapsed: number[] = [];
			let feasible = 0;
			for (const s of scenarios) {
				const at = performance.now();
				const result = fn(s);
				elapsed.push(performance.now() - at);
				feasible += Number(result.feasible);
				if (
					mode === "provisional" &&
					JSON.stringify(result.damageByMember) !==
						JSON.stringify(evaluate(s).damageByMember)
				)
					throw new Error("Fast/strict damage mismatch");
			}
			elapsed.sort((a, b) => a - b);
			const row = {
				fixture: name,
				cycles,
				mode,
				samples,
				feasible,
				medianMs: elapsed[Math.floor(elapsed.length / 2)],
				p95Ms:
					elapsed[
						Math.min(elapsed.length - 1, Math.floor(elapsed.length * 0.95))
					],
			};
			timings.push(row);
			console.log(JSON.stringify(row));
		}
	}
}
const searches: unknown[] = [];
for (const targetIndex of [2, 1]) {
	const fixture = makeFixture(catalog, 240, 31415, targetIndex);
	const target = fixture.profile.members[targetIndex];
	const input: SearchRequest = {
		scenario: fixture.scenario,
		targetId: target.characterId,
		objective:
			targetIndex === 2
				? { kind: "memberDamage", characterId: target.characterId }
				: { kind: "teamDamage" },
		mainTypeId: target.mainEcho.typeId,
		inventory: fixture.inventory,
		resultsLimit: 10,
		budget,
	};
	console.log(
		`Searching ${target.name}, ${input.objective.kind}, budget ${budget}…`,
	);
	const result = await searchInventory(
		input,
		evaluateFast,
		() => {},
		undefined,
		evaluate,
	);
	const row = {
		target: target.name,
		objective: input.objective,
		best: result.results[0]?.damage ?? null,
		baseline: result.baseline?.damage ?? null,
		feasibleResults: result.results.length,
		status: result.status,
		...result.progress,
	};
	searches.push(row);
	console.log(JSON.stringify(row));
}
// Exercise the actual app worker protocol; this measures Bun, not a Tauri WebView.
const workerAt = performance.now();
const worker = new Worker(
	new URL("../src/lib/calc/simulation.worker.ts", import.meta.url).href,
);
const workerResult = await new Promise<SimulationResult>((resolve, reject) => {
	worker.onmessage = (event) => {
		worker.terminate();
		event.data.kind === "evaluation"
			? resolve(event.data.value)
			: reject(new Error(event.data.message));
	};
	worker.onerror = (event) => {
		worker.terminate();
		reject(new Error(event.message));
	};
	worker.postMessage({ kind: "evaluate", input: cold.scenario });
});
const workerMs = performance.now() - workerAt;
if (JSON.stringify(workerResult) !== JSON.stringify(first))
	throw new Error("Worker evaluation mismatch");
const report = {
	date: new Date().toISOString(),
	revision: catalog.revision,
	environment: {
		bun: Bun.version,
		os: `${process.platform} ${release()}`,
		cpu: cpus()[0]?.model,
	},
	samples,
	budget,
	coldCatalogAndEvaluationMs: coldMs,
	workerStartupAndEvaluationMs: workerMs,
	timings,
	searches,
	notes: [
		"Historical inputs retain exactly the echoes used for both legacy engines; damage equality is not expected.",
		"Current provisional scores require strict resource/buff validation before appearing in results.",
		"CPU Bun measurements; browser/Tauri latency and large-inventory optimality are not implied.",
	],
};
await mkdir(".cache/calculator-migration", { recursive: true });
await Bun.write(
	".cache/calculator-migration/results.json",
	JSON.stringify(report, null, 2),
);
await Bun.write(
	".cache/calculator-migration/fixture.json",
	JSON.stringify(cold, null, 2),
);
console.log(
	`Saved .cache/calculator-migration/results.json; cold ${coldMs.toFixed(1)}ms; worker ${workerMs.toFixed(1)}ms`,
);
