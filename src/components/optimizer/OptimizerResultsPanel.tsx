import type { OptResultEntry } from "@wuwacalc/core/engine/optimizer/types";
import { useMemo } from "react";
import { ResultRow } from "@/components/optimizer/ResultRow";
import type { OptimizerBaseline } from "@/hooks/useOptimizerRun";
import type { Echo } from "@/lib/account";
import { optimizerResultRows } from "@/lib/calc/optimizerResults";
import { supportRoleFor } from "@/lib/calc/supportGuide";
import { charactersById } from "@/lib/catalog";
import { type CharacterInfo, statsForRole } from "@/lib/rating";

/** Search results list; the equipped build is highlighted at its rank. */
export function OptimizerResultsPanel({
	results,
	characterId,
	baseline,
	running,
	expandedIndex,
	onExpandedChange,
	echoByUid,
	equipAction,
	title = "Results",
	runningText = "Searching the captured inventory…",
	idleText = "Pick a target, team and rotation, then run the optimizer.",
}: {
	results: OptResultEntry[];
	/** Character searched by these results, retained when the selection changes. */
	characterId: number | null;
	baseline: OptimizerBaseline | null;
	running: boolean;
	expandedIndex: number | "baseline" | null;
	onExpandedChange: (index: number | "baseline" | null) => void;
	echoByUid: Map<string, Echo>;
	equipAction?: (result: OptResultEntry) => {
		label: string;
		disabled: boolean;
		reason?: string;
		onEquip: () => void;
	};
	/** Panel heading; team mode names the measured rotation. */
	title?: string;
	runningText?: string;
	idleText?: string;
}) {
	const rows = useMemo(
		() => optimizerResultRows(results, baseline),
		[results, baseline],
	);
	const ratingCharacter = useMemo<CharacterInfo | null>(() => {
		const character = charactersById.get(characterId ?? 0);
		const guide = supportRoleFor(characterId ?? 0);
		if (!character || !guide) return null;
		return {
			character_id: character.character_id,
			character_name: character.character_name,
			icon_pile: character.icon_head_256,
			stats: statsForRole(guide.roleBuild),
		};
	}, [characterId]);

	return (
		<section className="bg-card text-card-foreground ring-foreground/10 flex min-h-40 flex-1 flex-col ring-1">
			<header className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
				<h3 className="text-sm font-medium">{title}</h3>
			</header>
			{rows.length === 0 ? (
				<p className="px-3 py-6 text-center text-[11px] text-muted-foreground">
					{running ? runningText : idleText}
				</p>
			) : (
				<div className="min-h-0 flex-1 overflow-y-auto pr-1">
					{rows.map((row) =>
						row.kind === "baseline" && baseline ? (
							<ResultRow
								key="baseline"
								index={row.rank}
								current
								result={{
									uids: baseline.uids,
									damage: baseline.damage,
									stats: baseline.stats,
								}}
								baseline={null}
								expanded={expandedIndex === "baseline"}
								onToggle={() =>
									onExpandedChange(
										expandedIndex === "baseline" ? null : "baseline",
									)
								}
								echoByUid={echoByUid}
								ratingCharacter={ratingCharacter}
							/>
						) : row.kind === "result" ? (
							<ResultRow
								key={row.index}
								index={row.rank}
								result={row.result}
								equipAction={equipAction?.(row.result)}
								baseline={baseline?.damage ?? null}
								expanded={expandedIndex === row.index}
								onToggle={() =>
									onExpandedChange(
										expandedIndex === row.index ? null : row.index,
									)
								}
								echoByUid={echoByUid}
								ratingCharacter={ratingCharacter}
							/>
						) : null,
					)}
				</div>
			)}
		</section>
	);
}
