import type { OptResultEntry } from "@wuwacalc/core/engine/optimizer/types";

/** Main echo matters; the four passive slots can be permuted freely. */
export function optimizerBuildKey(uids: string[]): string {
	return JSON.stringify([uids[0] ?? "", ...uids.slice(1).sort()]);
}

export type OptimizerResultRow =
	| { kind: "baseline"; rank: number }
	| { kind: "result"; result: OptResultEntry; index: number; rank: number };

/** Show the equipped reference once, even when the search returns it as well. */
export function optimizerResultRows(
	results: OptResultEntry[],
	baseline: { uids: string[]; damage: number } | null,
): OptimizerResultRow[] {
	const baselineKey = baseline ? optimizerBuildKey(baseline.uids) : null;
	const rows: OptimizerResultRow[] = [];
	let inserted = false;
	for (const [index, result] of results.entries()) {
		if (baselineKey === optimizerBuildKey(result.uids)) continue;
		if (baseline && !inserted && result.damage < baseline.damage) {
			rows.push({ kind: "baseline", rank: rows.length });
			inserted = true;
		}
		rows.push({ kind: "result", result, index, rank: rows.length });
	}
	if (baseline && !inserted) rows.push({ kind: "baseline", rank: rows.length });
	return rows;
}
