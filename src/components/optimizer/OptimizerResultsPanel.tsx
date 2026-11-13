import { type ReactNode, useMemo } from "react";
import { ResultRow } from "@/components/optimizer/ResultRow";
import { VirtualGrid } from "@/components/VirtualGrid";
import type { OptimizerBaseline } from "@/hooks/useOptimizerRun";
import type { Echo } from "@/lib/account";
import { optimizerResultRows } from "@/lib/calc/optimizerResults";
import { supportRoleFor } from "@/lib/calc/supportGuide";
import type { OptResultEntry } from "@/lib/calc/types";
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
	summary,
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
	summary?: ReactNode;
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
	// The equipped baseline may be infeasible and absent from search results.
	const equippedEchoes = useMemo(() => {
		if (characterId === null) return null;
		const equipped = [...echoByUid.entries()]
			.filter(([, echo]) => echo.equippedBy === characterId)
			.sort(([, a], [, b]) => (a.slot ?? 99) - (b.slot ?? 99));
		return {
			uids: equipped.map(([uid]) => uid),
			mainUid: equipped.find(([, echo]) => echo.slot === 0)?.[0] ?? null,
		};
	}, [characterId, echoByUid]);
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
		<section className="@container/results bg-card text-card-foreground ring-foreground/10 flex min-h-40 flex-1 flex-col ring-1">
			<header className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-border/60 px-3 py-1.5">
				<h3 className="text-sm font-medium">{title}</h3>
				{summary}
			</header>
			{rows.length > 0 && (
				<div
					aria-hidden="true"
					className="hidden items-center gap-3 overflow-y-auto scrollbar-gutter-stable border-b py-2 pl-3 pr-4 text-xs text-muted-foreground @min-[1040px]/results:flex"
				>
					<span className="w-8 shrink-0">#</span>
					<span className="w-24 shrink-0">Damage</span>
					<span className="w-16 shrink-0">Change</span>
					<div className="grid min-w-0 flex-1 grid-cols-7 gap-3 text-right">
						{[
							"HP",
							"ATK",
							"DEF",
							"Crit. Rate",
							"Crit. DMG",
							"ER",
							"Total RV",
						].map((label) => (
							<span key={label}>{label}</span>
						))}
					</div>
					<span className="w-60 shrink-0 text-center">Echoes</span>
				</div>
			)}
			{rows.length === 0 ? (
				<p className="px-3 py-6 text-center text-[11px] text-muted-foreground">
					{running ? runningText : idleText}
				</p>
			) : (
				<VirtualGrid
					items={rows}
					columns={1}
					gap={0}
					estimateRowHeight={44}
					getItemKey={(row) =>
						row.kind === "baseline" ? "baseline" : row.index
					}
					className="min-h-0 max-h-[65vh] flex-1 overflow-y-auto pr-1"
					renderItem={(row) =>
						row.kind === "baseline" && baseline ? (
							<ResultRow
								key="baseline"
								index={row.rank}
								current
								result={{
									uids: baseline.uids,
									damage: baseline.damage,
									stats: baseline.stats,
									energy: baseline.energy,
								}}
								baseline={null}
								equippedEchoes={equippedEchoes}
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
								equippedEchoes={equippedEchoes}
								expanded={expandedIndex === row.index}
								onToggle={() =>
									onExpandedChange(
										expandedIndex === row.index ? null : row.index,
									)
								}
								echoByUid={echoByUid}
								ratingCharacter={ratingCharacter}
							/>
						) : null
					}
				/>
			)}
		</section>
	);
}
