import { optimizerBuildKey } from "./optimizerResults";
import type {
	CalcEcho,
	Objective,
	OptResultEntry,
	SearchRequest,
	SearchUpdate,
	SimulationResult,
} from "./types";

export function objectiveScore(
	result: SimulationResult,
	objective: Objective,
): number {
	return objective.kind === "teamDamage"
		? result.teamDamage
		: (result.damageByMember[objective.characterId] ?? 0);
}
export function isLegalBuild(
	echoes: readonly CalcEcho[],
	mainType: number,
): boolean {
	return (
		echoes.length === 5 &&
		echoes[0].typeId === mainType &&
		new Set(echoes.map((e) => e.uid)).size === 5 &&
		echoes.reduce((n, e) => n + e.cost, 0) <= 12
	);
}
/** Deterministic bounded search; exhaustive on small spaces within the budget. */
export async function searchInventory(
	request: SearchRequest,
	evaluate: (scenario: SearchRequest["scenario"]) => SimulationResult,
	onUpdate: (update: SearchUpdate) => void,
	aborted: () => boolean = () => false,
	validate?: (scenario: SearchRequest["scenario"]) => SimulationResult,
): Promise<SearchUpdate> {
	const target = request.scenario.members.find(
		(m) => m.characterId === request.targetId,
	);
	if (!target) throw new Error("Optimization target is not on this team.");
	if (target.echoSource === "rotation")
		throw new Error("The optimization target must use owned echoes.");
	const mainType = request.mainTypeId;
	const mainPool = request.inventory.filter((e) => e.typeId === mainType);
	if (mainPool.length === 0)
		throw new Error("No eligible copy of the required main echo is available.");
	const pool = request.inventory;
	const byUid = new Map(pool.map((e) => [e.uid, e]));
	const cache = new Map<
		string,
		{ value: number; result: SimulationResult | null }
	>();
	const ranked = new Map<string, OptResultEntry>();
	const verified = new Set<string>();
	let baseline: OptResultEntry | null = null,
		baselineEvaluation: SimulationResult | null = null,
		baselineError: string | null = null;
	let processed = 0,
		lastYield = performance.now();
	const start = lastYield;
	let status: SearchUpdate["status"] = "searching";
	const snapshot = (verifiedOnly = true): SearchUpdate => ({
		results: [...ranked.entries()]
			.filter(([key]) => !verifiedOnly || verified.has(key))
			.map(([, value]) => value)
			.sort(
				(a, b) =>
					b.damage - a.damage ||
					optimizerBuildKey(a.uids).localeCompare(optimizerBuildKey(b.uids)),
			)
			.slice(0, request.resultsLimit),
		baseline,
		baselineEvaluation,
		baselineError,
		progress: {
			processed,
			total: request.budget,
			elapsedMs: performance.now() - start,
			remainingMs: processed
				? ((performance.now() - start) / processed) *
					(request.budget - processed)
				: 0,
			progress: processed / request.budget,
			speed: processed / Math.max(0.001, (performance.now() - start) / 1000),
		},
		status,
	});
	const score = (
		combo: CalcEcho[],
		count = true,
	): { value: number; result: SimulationResult | null } => {
		if (!isLegalBuild(combo, mainType))
			return { value: -Infinity, result: null };
		const key = optimizerBuildKey(combo.map((e) => e.uid));
		const hit = cache.get(key);
		if (hit) return hit;
		if (count && (processed >= request.budget || aborted()))
			return { value: -Infinity, result: null };
		let result: SimulationResult;
		try {
			result = (!count && validate ? validate : evaluate)({
				...request.scenario,
				members: request.scenario.members.map((m) =>
					m.characterId === request.targetId ? { ...m, echoes: combo } : m,
				),
			});
		} catch {
			if (count) processed++;
			const invalid = { value: -Infinity, result: null };
			cache.set(key, invalid);
			return invalid;
		}
		if (count) processed++;
		// Deficit guides exploration through invalid builds; only feasible builds rank.
		const deficit = result.energy.reduce(
			(n, e) => n + Math.max(0, Math.max(e.required, e.kitMinimum) - e.actual),
			0,
		);
		const value = result.feasible
			? objectiveScore(result, request.objective)
			: -1 -
				deficit -
				result.diagnostics.filter((d) => !d.includes("% ER")).length * 1000;
		if (result.feasible && combo.every((e) => byUid.has(e.uid))) {
			if (!validate) verified.add(key);
			ranked.set(key, {
				uids: combo.map((e) => e.uid),
				damage: value,
				stats: result.stats[request.targetId] ?? null,
				energy: result.energy,
			});
			// Keep the bounded provisional frontier until validation. Dropping
			// lower candidates here could lose every feasible fallback when a
			// higher provisional score fails its timed resource checks.
		}
		const out = { value, result };
		cache.set(key, out);
		return out;
	};
	if (isLegalBuild(target.echoes, mainType)) {
		const scored = score(target.echoes, false);
		baselineEvaluation = scored.result;
		if (scored.result?.feasible)
			baseline = {
				uids: target.echoes.map((e) => e.uid),
				damage: scored.value,
				stats: scored.result.stats[request.targetId] ?? null,
				energy: scored.result.energy,
			};
		else
			baselineError =
				scored.result?.diagnostics.join(" ") ||
				"Equipped baseline cannot execute this rotation.";
	} else if (target.echoes.length)
		baselineError =
			"Equipped baseline needs five legal echoes with the rotation's required main echo in slot one.";
	const accept = (entry: OptResultEntry) => {
		const key = optimizerBuildKey(entry.uids);
		if (verified.has(key) || !validate) return;
		const combo = entry.uids.map((uid) => byUid.get(uid)!);
		try {
			const checked = validate({
				...request.scenario,
				members: request.scenario.members.map((m) =>
					m.characterId === request.targetId ? { ...m, echoes: combo } : m,
				),
			});
			if (checked.feasible) {
				ranked.set(key, {
					...entry,
					damage: objectiveScore(checked, request.objective),
					energy: checked.energy,
					stats: checked.stats[request.targetId] ?? null,
				});
				verified.add(key);
			} else {
				ranked.delete(key);
				cache.set(key, { value: -1001, result: checked });
			}
		} catch {
			ranked.delete(key);
		}
	};
	const yieldIfNeeded = async () => {
		if (performance.now() - lastYield >= 40) {
			const best = snapshot(false).results[0];
			if (best) accept(best);
			onUpdate(snapshot());
			await new Promise((r) => setTimeout(r, 0));
			lastYield = performance.now();
		}
	};
	const done = () => aborted() || processed >= request.budget;
	// Small exact fixtures are a quality oracle and are cheap to enumerate directly.
	const combinations =
		(mainPool.length *
			(pool.length - 1) *
			(pool.length - 2) *
			(pool.length - 3) *
			(pool.length - 4)) /
		24;
	if (combinations <= request.budget) {
		for (const main of mainPool) {
			const rest = pool.filter((e) => e.uid !== main.uid);
			for (let a = 0; a < rest.length - 3 && !done(); a++)
				for (let b = a + 1; b < rest.length - 2 && !done(); b++)
					for (let c = b + 1; c < rest.length - 1 && !done(); c++)
						for (let d = c + 1; d < rest.length && !done(); d++) {
							score([main, rest[a], rest[b], rest[c], rest[d]]);
							await yieldIfNeeded();
						}
		}
	} else {
		let random = 31415;
		const next = () => {
			random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
			return random / 4294967296;
		};
		const seeds: CalcEcho[][] = [];
		if (
			target.echoes.every((e) => byUid.has(e.uid)) &&
			isLegalBuild(target.echoes, mainType)
		)
			seeds.push(target.echoes);
		const highEr = [...pool].sort((a, b) => er(b) - er(a));
		for (let s = 0; s < 8; s++) {
			const main = mainPool[s % mainPool.length];
			const ordered = s === 1 ? highEr : pool;
			const available = [...ordered.filter((e) => e.uid !== main.uid)];
			if (s > 1)
				for (let i = available.length - 1; i > 0; i--) {
					const j = Math.floor(next() * (i + 1));
					[available[i], available[j]] = [available[j], available[i]];
				}
			// Cheap fillers make room for later high-cost/paired transitions.
			const cheap = [...available].sort((a, b) => a.cost - b.cost);
			const combo = [main, ...cheap.slice(0, 4)];
			if (s === 0 && isLegalBuild(combo, mainType)) seeds.push(combo);
			// Seed both common cost layouts directly: moving between 44111 and
			// 43311 can require two replacements before the score improves.
			const greedy = [main];
			for (const cost of s % 2 === 0 ? [3, 3, 1, 1] : [4, 1, 1, 1]) {
				const found = available.find(
					(e) => e.cost === cost && !greedy.some((g) => g.uid === e.uid),
				);
				if (found) greedy.push(found);
			}
			if (isLegalBuild(greedy, mainType)) seeds.push(greedy);
		}
		const restarts = seeds;
		const perRestart = Math.max(
			1,
			Math.floor(request.budget / Math.max(1, restarts.length)),
		);
		for (const seed of restarts) {
			const restartEnd = Math.min(request.budget, processed + perRestart);
			const restartDone = () => done() || processed >= restartEnd;
			if (done()) break;
			let current = seed,
				value = score(seed).value;
			for (let pass = 0; pass < 12 && !restartDone(); pass++) {
				let best = current,
					bestValue = value;
				const stride = Math.max(1, Math.ceil(pool.length / 24));
				const options = [
					...new Map(
						[
							...pool.slice(0, 12),
							...highEr.slice(0, 4),
							...pool.filter((_, i) => i % stride === pass % stride),
						].map((e) => [e.uid, e]),
					).values(),
				];
				for (let slot = 0; slot < 5 && !restartDone(); slot++)
					for (const e of slot === 0 ? mainPool : options) {
						if (restartDone()) break;
						const combo = [...current];
						combo[slot] = e;
						const v = score(combo).value;
						if (v > bestValue) {
							best = combo;
							bestValue = v;
						}
						await yieldIfNeeded();
					}
				if (best === current) {
					// Pair exchanges reach cost/set changes blocked by single replacements.
					const pairs = [...pool.slice(0, 8), ...highEr.slice(0, 4)];
					for (let a = 1; a < 4 && !restartDone(); a++)
						for (let b = a + 1; b < 5 && !restartDone(); b++)
							for (const x of pairs)
								for (const y of pairs) {
									if (restartDone()) break;
									const combo = [...current];
									combo[a] = x;
									combo[b] = y;
									const v = score(combo).value;
									if (v > bestValue) {
										best = combo;
										bestValue = v;
									}
									await yieldIfNeeded();
								}
				}
				if (best === current) break;
				current = best;
				value = bestValue;
			}
		}
	}
	let accepted = 0;
	for (const entry of [...ranked.values()].sort(
		(a, b) => b.damage - a.damage,
	)) {
		if (aborted()) break;
		accept(entry);
		if (verified.has(optimizerBuildKey(entry.uids))) accepted++;
		await yieldIfNeeded();
		if (accepted >= request.resultsLimit) break;
	}
	status = aborted()
		? "cancelled"
		: processed >= request.budget
			? "budget"
			: "complete";
	const final = snapshot();
	onUpdate(final);
	return final;
}
function er(e: CalcEcho): number {
	return [...e.mainStats, ...e.substats]
		.filter((p) => p.key === "energyRegen")
		.reduce((n, p) => n + p.value, 0);
}
