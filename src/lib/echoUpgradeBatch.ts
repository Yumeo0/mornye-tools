import { useSyncExternalStore } from "react";
import {
	type AccountSnapshot,
	type Echo,
	readAccount,
	refreshAccount,
	subscribeAccount,
} from "@/lib/account";
import { readDangerousFeatures } from "@/lib/dangerous";
import {
	availableEchoCopies,
	canUpgradeEcho,
	DEFAULT_UPGRADE_OPTIONS,
	type EchoMaterialPolicy,
	type EchoUpgradeOptions,
	type EchoUpgradePlan,
	echoLevelLimit,
	echoTuningSlots,
	requestEchoDiscard,
	requestEchoUpgrade,
} from "@/lib/echoUpgrade";
import { viewFromEcho } from "@/lib/overlayEcho";
import {
	getRelevantCharacters,
	mainStatForEcho,
	maxPossibleRating,
	ratingSuccessChance,
} from "@/lib/rating";

export type UpgradeOutcome =
	| "queued"
	| "upgrading"
	| "complete"
	| "below_threshold"
	| "low_chance"
	| "discarded"
	| "consumed"
	| "skipped"
	| "stopped"
	| "error";
export interface UpgradeRow {
	originalId: number;
	/** Stable identity for each selected copy of an original inventory stack. */
	copyIndex?: number;
	echo: Echo;
	outcome: UpgradeOutcome;
	possible: number | null;
	successChance: number | null;
	message: string;
}

export const upgradeRowKey = (row: UpgradeRow) =>
	`${row.originalId}:${row.copyIndex ?? 0}`;

export function echoUpgradeRows(echoes: Echo[]): UpgradeRow[] {
	const copies = new Map<number, number>();
	return echoes.map((echo) => {
		const copyIndex = copies.get(echo.incrId) ?? 0;
		copies.set(echo.incrId, copyIndex + 1);
		return {
			originalId: echo.incrId,
			copyIndex,
			echo,
			outcome: "queued",
			possible: null,
			successChance: null,
			message: "Waiting",
		};
	});
}

function sameStackEcho(echo: Echo, source: Echo): boolean {
	return (
		echo.itemId === source.itemId &&
		echo.monsterId === source.monsterId &&
		echo.setId === source.setId &&
		echo.level === source.level &&
		echo.mainProps.length === source.mainProps.length &&
		echo.mainProps.every(
			(prop, index) =>
				prop.propId === source.mainProps[index].propId &&
				prop.raw === source.mainProps[index].raw,
		) &&
		echo.subProps.length === source.subProps.length &&
		echo.subProps.every(
			(prop, index) =>
				prop.propId === source.subProps[index].propId &&
				prop.raw === source.subProps[index].raw,
		)
	);
}
export interface BatchState {
	phase: "idle" | "running" | "stopping" | "finished" | "error";
	profileId: string | null;
	threshold: number;
	options: EchoUpgradeOptions;
	rows: UpgradeRow[];
	error: string | null;
}

export function bestPossibleEchoRating(echo: Echo): number | null {
	const view = viewFromEcho(echo);
	const relevant = getRelevantCharacters(view.setNames);
	return relevant.length
		? Math.max(
				...relevant.map((character) =>
					maxPossibleRating(
						character,
						view.subStats,
						mainStatForEcho(echo),
						echoTuningSlots(echo.itemId),
					),
				),
			)
		: null;
}

export function echoUpgradeSuccessChance(
	echo: Echo,
	threshold: number,
): number | null {
	const view = viewFromEcho(echo);
	const relevant = getRelevantCharacters(view.setNames);
	return relevant.length
		? ratingSuccessChance(
				relevant,
				view.subStats,
				mainStatForEcho(echo),
				threshold,
				echoTuningSlots(echo.itemId),
			)
		: null;
}

export function formatEchoSuccessChance(chance: number): string {
	return chance > 0 && chance < 0.01
		? "<0.01%"
		: `${chance.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

/** Tune any already unlocked slots first; otherwise unlock just the next slot. */
export function nextEchoStage(echo: Echo): number | null {
	if (echo.subProps.length < echoTuningSlots(echo.itemId, echo.level))
		return echo.level;
	const limit = echoLevelLimit(echo.itemId);
	return echo.level < limit
		? Math.min((Math.floor(echo.level / 5) + 1) * 5, limit)
		: null;
}

interface BatchDependencies {
	current: () => AccountSnapshot;
	refresh: () => Promise<void>;
	preview: (
		id: number,
		target: number,
		protectedIds: number[],
		policy: EchoMaterialPolicy,
	) => Promise<EchoUpgradePlan>;
	execute: (
		plan: EchoUpgradePlan,
		protectedIds: number[],
		policy: EchoMaterialPolicy,
	) => Promise<EchoUpgradePlan>;
	discard: (echo: Echo) => Promise<{ marked: boolean; reason: string | null }>;
	rating: (echo: Echo) => number | null;
	successChance: (echo: Echo, threshold: number) => number | null;
	stopped: () => boolean;
	report: (row: UpgradeRow) => void;
}

/** Sequential stages allow the new substat verdict to stop all further spending. */
export async function runEchoUpgradeBatch(
	profileId: string,
	echoes: Echo[],
	threshold: number,
	deps: BatchDependencies,
	options: EchoUpgradeOptions = DEFAULT_UPGRADE_OPTIONS,
) {
	if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100)
		throw new Error("Choose a threshold from 0 to 100.");
	const minimumChance = options.minSuccessChance;
	if (
		!Number.isFinite(minimumChance) ||
		minimumChance < 0 ||
		minimumChance > 100
	)
		throw new Error("Choose a minimum success chance from 0 to 100.");
	// Repeated stack copies and the preview recheck share the same probabilities.
	const chances = new Map<string, number | null>();
	const chanceFor = (echo: Echo) => {
		if (minimumChance === 0) return null;
		const key = JSON.stringify([
			echo.itemId,
			echo.monsterId,
			echo.setId,
			echo.mainProps,
			echo.subProps,
		]);
		if (chances.has(key)) return chances.get(key) ?? null;
		const chance = deps.successChance(echo, threshold);
		if (
			chance !== null &&
			(!Number.isFinite(chance) || chance < 0 || chance > 100)
		)
			throw new Error("Could not calculate a valid success chance.");
		if (chances.size >= 256) chances.clear();
		chances.set(key, chance);
		return chance;
	};
	const active = () =>
		!deps.stopped() && deps.current().profile?.id === profileId;
	const protectedIds = new Set(echoes.map((echo) => echo.incrId));
	const stackSources = new Map<number, number>();
	const discardedRows = new Map<number, UpgradeRow>();
	const reportConsumption = (result: EchoUpgradePlan) => {
		for (const material of result.echo_materials) {
			const row = discardedRows.get(material.incr_id);
			if (
				!row ||
				material.count <= 0 ||
				deps.current().echoes.some((echo) => echo.incrId === material.incr_id)
			)
				continue;
			deps.report({
				...row,
				outcome: "consumed",
				message: "Used as upgrade material.",
			});
			discardedRows.delete(material.incr_id);
		}
	};
	const reject = async (
		row: UpgradeRow,
		outcome: "below_threshold" | "low_chance" = "below_threshold",
	) => {
		const verdict =
			outcome === "low_chance" && row.successChance !== null
				? `Success chance ${formatEchoSuccessChance(row.successChance)}`
				: `Best possible rating ${row.possible}%`;
		let rejected: UpgradeRow = {
			...row,
			outcome,
			message: `${verdict} is below ${outcome === "low_chance" ? minimumChance : threshold}%.`,
		};
		if (options.autoDiscard && active()) {
			const echo = row.echo;
			const protectedReason =
				echo.equippedBy != null
					? "Equipped echo kept its mark."
					: echo.stackCount > 1
						? "Unsplit stack kept its mark."
						: null;
			if (protectedReason) rejected.message += ` ${protectedReason}`;
			else {
				deps.report({
					...row,
					message: `Marking ${outcome === "low_chance" ? "low-chance" : "below-threshold"} echo as discard…`,
				});
				const result = await deps.discard(echo);
				await deps.refresh();
				if (deps.current().profile?.id !== profileId) return;
				if (result.marked) {
					const updated = deps
						.current()
						.echoes.find((item) => item.incrId === echo.incrId);
					if (updated?.funcValue !== 2)
						throw new Error(
							"Discard mark could not be verified. The batch has stopped.",
						);
					rejected = {
						...rejected,
						echo: updated,
						outcome: "discarded",
						message: `Marked as discard · ${verdict}`,
					};
					// Only the confirmed failed copy becomes fodder. Pending copies
					// and the unchanged remainder of a split stack stay protected.
					protectedIds.delete(updated.incrId);
					discardedRows.set(updated.incrId, rejected);
				} else rejected.message += ` ${result.reason ?? "Echo kept its mark."}`;
			}
		}
		deps.report(rejected);
	};
	const stopForChance = async (row: UpgradeRow): Promise<boolean> => {
		if (minimumChance === 0) return false;
		if (row.successChance === null) {
			deps.report({
				...row,
				outcome: "skipped",
				message:
					"Substats could not be modeled for success chance. Echo kept its mark.",
			});
			return true;
		}
		if (row.successChance + minimumChance * 1e-12 >= minimumChance)
			return false;
		await reject(row, "low_chance");
		return true;
	};
	for (const selected of echoUpgradeRows(echoes)) {
		if (!active()) return;
		let id = stackSources.get(selected.originalId) ?? selected.originalId;
		let row: UpgradeRow = {
			...selected,
			outcome: "upgrading",
			possible: null,
			message: "Reading echo…",
		};
		deps.report(row);
		try {
			await deps.refresh();
			// At most five level stages plus five previously unlocked substats.
			for (let stage = 0; stage < 11; stage++) {
				if (!active()) return;
				const echo = deps.current().echoes.find((item) => item.incrId === id);
				if (!echo || echo.source === "manual") {
					deps.report({
						...row,
						outcome: "skipped",
						message: "Echo is missing or was entered manually.",
					});
					break;
				}
				const possible = deps.rating(echo);
				row = { ...row, echo, possible };
				if (possible === null) {
					deps.report({
						...row,
						outcome: "skipped",
						message: "No relevant Resonator guide to evaluate.",
					});
					break;
				}
				if (possible < threshold) {
					row.successChance = minimumChance > 0 ? 0 : null;
					await reject(row);
					break;
				}
				row = { ...row, successChance: chanceFor(echo) };
				if (await stopForChance(row)) break;
				const target = nextEchoStage(echo);
				if (target === null) {
					deps.report({
						...row,
						outcome: "complete",
						message: `Fully upgraded · Rating ${possible}%`,
					});
					break;
				}
				row = {
					...row,
					message:
						target === echo.level
							? "Tuning the next unlocked substat…"
							: `Upgrading to +${target} and tuning…`,
				};
				deps.report(row);
				const plan = await deps.preview(
					id,
					target,
					[...protectedIds],
					options.materials,
				);
				if (plan.result_level > target) {
					row = {
						...row,
						message: `Reusing discarded EXP to +${plan.result_level} and tuning…`,
					};
					deps.report(row);
				}
				await deps.refresh();
				if (!active()) return;
				const fresh = deps.current().echoes.find((item) => item.incrId === id);
				if (!fresh || fresh.subProps.length !== plan.from_sub_props.length)
					throw new Error(
						"Substats could not be verified. Refresh the inventory before continuing.",
					);
				const freshRating = deps.rating(fresh);
				if (freshRating === null || freshRating < threshold) {
					if (freshRating !== null)
						await reject({
							...row,
							echo: fresh,
							possible: freshRating,
							successChance: minimumChance > 0 ? 0 : null,
						});
					else
						deps.report({
							...row,
							echo: fresh,
							possible: freshRating,
							successChance: null,
							outcome: "skipped",
							message: "No relevant Resonator guide to evaluate.",
						});
					break;
				}
				row = {
					...row,
					echo: fresh,
					possible: freshRating,
					successChance: chanceFor(fresh),
				};
				if (await stopForChance(row)) break;
				const source = structuredClone(fresh);
				const previousIds = new Set(
					deps.current().echoes.map((item) => item.incrId),
				);
				const result = await deps.execute(
					plan,
					[...protectedIds],
					options.materials,
				);
				id = result.incr_id;
				protectedIds.add(id);
				await deps.refresh();
				if (deps.current().profile?.id !== profileId) return;
				reportConsumption(result);
				if (!active()) return;
				const updated = deps
					.current()
					.echoes.find((item) => item.incrId === id);
				if (
					!updated ||
					updated.level !== result.result_level ||
					updated.subProps.length !==
						plan.from_sub_props.length + plan.identify_count
				) {
					throw new Error(
						"The updated echo could not be verified. The batch has stopped; no upgrade will be retried.",
					);
				}
				if (source.stackCount > 1) {
					// The server may retain the source ID on either split row.
					// Follow the confirmed unchanged remainder for the next copy.
					const remainders = deps
						.current()
						.echoes.filter(
							(item) =>
								item.incrId !== id &&
								(item.incrId === source.incrId ||
									!previousIds.has(item.incrId)) &&
								item.stackCount === source.stackCount - 1 &&
								sameStackEcho(item, source),
						);
					const remainder =
						remainders.find((item) => item.incrId === source.incrId) ??
						(remainders.length === 1 ? remainders[0] : undefined);
					stackSources.set(selected.originalId, remainder?.incrId ?? -1);
					if (remainder) protectedIds.add(remainder.incrId);
				}
				row = {
					...row,
					echo: updated,
					possible: deps.rating(updated),
					successChance: chanceFor(updated),
				};
				deps.report(row);
			}
		} catch (reason) {
			const message = reason instanceof Error ? reason.message : String(reason);
			deps.report({ ...row, outcome: "error", message });
			throw reason;
		}
	}
}

let state: BatchState = {
	phase: "idle",
	profileId: null,
	threshold: 75,
	options: DEFAULT_UPGRADE_OPTIONS,
	rows: [],
	error: null,
};
let stopRequested = false;
const listeners = new Set<() => void>();
function publish(update: Partial<BatchState>) {
	state = { ...state, ...update };
	for (const listener of listeners) listener();
}
export function useEchoUpgradeBatch() {
	return useSyncExternalStore(
		(listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		() => state,
	);
}
export function stopEchoUpgradeBatch() {
	if (state.phase === "running") {
		stopRequested = true;
		publish({ phase: "stopping" });
	}
}
export function startEchoUpgradeBatch(
	profileId: string,
	selected: Echo[],
	threshold: number,
	options: EchoUpgradeOptions = DEFAULT_UPGRADE_OPTIONS,
) {
	if (state.phase === "running" || state.phase === "stopping") return;
	const { snapshot } = readAccount();
	if (
		snapshot.profile?.id !== profileId ||
		!canUpgradeEcho(snapshot, readDangerousFeatures().status)
	)
		return;
	const echoes = availableEchoCopies(selected, snapshot.echoes);
	if (
		!echoes.length ||
		!Number.isFinite(threshold) ||
		threshold < 0 ||
		threshold > 100 ||
		!Number.isFinite(options.minSuccessChance) ||
		options.minSuccessChance < 0 ||
		options.minSuccessChance > 100
	)
		return;
	stopRequested = false;
	const batchOptions = structuredClone(options);
	publish({
		phase: "running",
		profileId,
		threshold,
		options: batchOptions,
		error: null,
		rows: echoUpgradeRows(echoes),
	});
	const unsubscribe = subscribeAccount(() => {
		if (readAccount().snapshot.profile?.id !== profileId)
			stopEchoUpgradeBatch();
	});
	const finish = (error: string | null) => {
		unsubscribe();
		publish({
			phase: error ? "error" : "finished",
			error,
			rows: state.rows.map((row) =>
				row.outcome === "queued" || row.outcome === "upgrading"
					? {
							...row,
							outcome: "stopped",
							message: "Batch stopped before the next stage.",
						}
					: row,
			),
		});
	};
	void runEchoUpgradeBatch(
		profileId,
		echoes,
		threshold,
		{
			current: () => readAccount().snapshot,
			refresh: async () => {
				await refreshAccount();
				if (readAccount().error)
					throw new Error(
						"Could not refresh the account. The batch has stopped.",
					);
			},
			preview: (id, target, protectedIds, policy) =>
				requestEchoUpgrade(profileId, id, target, null, protectedIds, policy),
			execute: (plan, protectedIds, policy) =>
				requestEchoUpgrade(
					profileId,
					plan.incr_id,
					plan.target_level,
					plan,
					protectedIds,
					policy,
				),
			discard: (echo) => requestEchoDiscard(profileId, echo),
			rating: bestPossibleEchoRating,
			successChance: echoUpgradeSuccessChance,
			stopped: () =>
				stopRequested ||
				!canUpgradeEcho(readAccount().snapshot, readDangerousFeatures().status),
			report: (row) =>
				publish({
					rows: state.rows.map((previous) =>
						upgradeRowKey(previous) === upgradeRowKey(row) ? row : previous,
					),
				}),
		},
		batchOptions,
	)
		.then(() => finish(null))
		.catch((reason) =>
			finish(reason instanceof Error ? reason.message : String(reason)),
		);
}
