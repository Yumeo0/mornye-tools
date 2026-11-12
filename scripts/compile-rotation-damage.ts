import { mkdirSync, writeFileSync } from "node:fs";
import { availableParallelism, freemem } from "node:os";
import { join } from "node:path";
import type {
	BundledRotationDamage,
	RotationDamage,
} from "../src/lib/calc/rotationDamage";
import { bundledRotationDamageSchema } from "../src/lib/calc/rotationDamageSchema";
import type { TeamProfile } from "../src/lib/calc/types";
import { dataLog } from "./lib/data-log";

const root = join(import.meta.dirname, "..");

/** The versioned snapshot also seeds fresh checkouts without a local checkpoint. */
export function reusableRotationScores(
	revision: string,
	profiles: TeamProfile[],
	snapshots: unknown[],
): Record<string, RotationDamage> {
	const scores: Record<string, RotationDamage> = {};
	for (const snapshot of snapshots) {
		const parsed = bundledRotationDamageSchema.safeParse(snapshot);
		if (!parsed.success || parsed.data.revision !== revision) continue;
		for (const profile of profiles) {
			const score = parsed.data.scores[profile.id];
			if (
				score &&
				(score.damage == null
					? !!score.error
					: profile.members.every((m) => score.stats?.[m.characterId]))
			)
				scores[profile.id] = score;
		}
	}
	return scores;
}

export async function calculateRotationScores(
	profiles: TeamProfile[],
	options: {
		workers?: number;
		seed?: Record<string, RotationDamage>;
		onScore?: (id: string, score: RotationDamage) => void;
		onProgress?: (completed: number, total: number) => void;
	} = {},
): Promise<Record<string, RotationDamage>> {
	if (profiles.some((p) => p.customRotation))
		throw new Error("Only pre-made rotations belong in the bundled catalog.");
	if (new Set(profiles.map((p) => p.id)).size !== profiles.length)
		throw new Error("Duplicate rotation IDs.");
	const scores = new Map<string, RotationDamage>(
		profiles.flatMap((p) =>
			options.seed?.[p.id] ? [[p.id, options.seed[p.id]] as const] : [],
		),
	);
	const pending = profiles.filter((p) => !scores.has(p.id));
	let next = 0;
	const count = Math.min(
		pending.length,
		Math.max(
			1,
			options.workers ??
				Math.min(
					4,
					availableParallelism(),
					Math.floor(freemem() / (768 * 1024 * 1024)),
				),
		),
	);
	const workers = new Set<Worker>();
	try {
		await Promise.all(
			Array.from({ length: count }, async () => {
				// Recycling bounds upstream cache/heap growth over thousands of teams.
				while (next < pending.length)
					await new Promise<void>((resolve, reject) => {
						const worker = new Worker(
							new URL("./rotation-damage.worker.ts", import.meta.url).href,
						);
						workers.add(worker);
						let served = 0;
						const send = () => {
							if (served >= 16 || next >= pending.length) {
								workers.delete(worker);
								worker.terminate();
								resolve();
							} else worker.postMessage(pending[next++]);
						};
						worker.onmessage = (
							event: MessageEvent<{ id: string; score: RotationDamage }>,
						) => {
							scores.set(event.data.id, event.data.score);
							options.onScore?.(event.data.id, event.data.score);
							served++;
							options.onProgress?.(scores.size, profiles.length);
							send();
						};
						worker.onerror = (event) => reject(new Error(event.message));
						send();
					});
			}),
		);
	} finally {
		for (const worker of workers) worker.terminate();
	}
	// Worker completion order must not churn the checked-in JSON.
	return Object.fromEntries(profiles.map((p) => [p.id, scores.get(p.id)!]));
}

export async function compileRotationDamage() {
	// Rebuild after the game-data compilers finish, then load the fresh adapter
	// in this process and in isolated workers. No vendored source is modified.
	const build = Bun.spawn(
		[process.execPath, join(root, "scripts/build-calculator.ts")],
		{ cwd: root, stdout: "pipe", stderr: "inherit" },
	);
	const buildOutput = await new Response(build.stdout).text();
	if ((await build.exited) !== 0) throw new Error("Calculator bundle failed.");
	dataLog.detail(buildOutput.trim());
	const { getCatalog } = await import(
		"../src/lib/calc/riley/engine.generated.js"
	);
	const { revision } = (await Bun.file(
		join(root, "src/lib/calc/riley/reference.generated.json"),
	).json()) as { revision: string };
	const profiles = getCatalog().teams;
	const output = join(root, "src/configs/rotation_damage.json");
	const checkpoint = join(root, ".cache/rotation-damage.json");
	const checkpointScores = reusableRotationScores(
		revision,
		profiles,
		await Promise.all(
			[output, checkpoint].map((path) =>
				Bun.file(path)
					.json()
					.catch(() => null),
			),
		),
	);
	mkdirSync(join(root, ".cache"), { recursive: true });
	dataLog.progress(
		`Pre-calculating ${profiles.length} pre-made rotations (${Object.keys(checkpointScores).length} reused)…`,
	);
	const started = performance.now();
	const scores = await calculateRotationScores(profiles, {
		seed: checkpointScores,
		onScore: (id, score) => {
			checkpointScores[id] = score;
		},
		onProgress: (completed, total) => {
			if (completed % 25 === 0 || completed === total) {
				writeFileSync(
					checkpoint,
					JSON.stringify({ revision, scores: checkpointScores }),
				);
				dataLog.progress(
					`Rotations: ${completed}/${total} · ${((performance.now() - started) / 1000).toFixed(0)}s`,
				);
			}
		},
	});
	const bundle: BundledRotationDamage = bundledRotationDamageSchema.parse({
		revision,
		scores,
	});
	// Replace the previous complete snapshot only after every profile finishes.
	const temporary = `${output}.tmp`;
	await Bun.write(temporary, `${JSON.stringify(bundle)}\n`);
	const { rename } = await import("node:fs/promises");
	await rename(temporary, output);
	const valid = Object.values(scores).filter((s) => s.damage != null).length;
	dataLog.info(
		`Saved ${valid} damage scores and ${profiles.length - valid} rotation diagnostics.`,
	);
}

if (import.meta.main) await compileRotationDamage();
