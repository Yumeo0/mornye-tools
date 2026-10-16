import type {
	OptResultEntry,
	OptResultStats,
} from "@wuwacalc/core/engine/optimizer/types";
import { ChevronDown } from "lucide-react";
import {
	EchoCard,
	echoCost,
	echoImage,
	echoName,
} from "@/components/echo/EchoCard";
import { formatDamage, statPercent } from "@/components/optimizer/display";
import { CardBadge } from "@/components/ui/badge";
import type { Echo } from "@/lib/account";

function StatChips({ stats }: { stats: OptResultStats }) {
	const entries: Array<[string, string]> = [
		["ATK", Math.round(stats.atk).toLocaleString()],
		["CR", statPercent(stats.cr)],
		["CD", statPercent(stats.cd)],
		["ER", statPercent(stats.er)],
		["DMG", statPercent(stats.bonus)],
	];
	return (
		<div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
			{entries.map(([label, value]) => (
				<span key={label}>
					{label} <span className="font-semibold text-foreground">{value}</span>
				</span>
			))}
		</div>
	);
}

function FullStats({ stats }: { stats: OptResultStats }) {
	const entries: Array<[string, string]> = [
		["ATK", stats.atk.toFixed(0)],
		["HP", stats.hp.toFixed(0)],
		["DEF", stats.def.toFixed(0)],
		["Energy Regen", statPercent(stats.er)],
		["Crit. Rate", statPercent(stats.cr)],
		["Crit. DMG", statPercent(stats.cd)],
		["DMG Bonus", statPercent(stats.bonus)],
		["Amplify", statPercent(stats.amp)],
	];
	return (
		<div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
			{entries.map(([label, value]) => (
				<div key={label} className="flex items-center justify-between gap-2">
					<span className="text-[11px] text-muted-foreground">{label}</span>
					<span className="text-[11px] font-semibold">{value}</span>
				</div>
			))}
		</div>
	);
}

function EchoThumb({ echo }: { echo?: Echo }) {
	if (!echo) {
		return <span className="size-8 bg-muted/60" />;
	}
	const image = echoImage(echo);
	return image ? (
		<img
			src={image}
			alt={echoName(echo)}
			title={`${echoName(echo)} +${echo.level}`}
			className="size-8 shrink-0 bg-black/30 object-contain"
		/>
	) : (
		<span className="size-8 bg-black/30" />
	);
}

/** One optimizer result: damage, stats and the five echoes, expandable. */
export function ResultRow({
	index,
	result,
	baseline,
	expanded,
	current,
	onToggle,
	echoByUid,
}: {
	index: number;
	result: OptResultEntry;
	baseline: number | null;
	expanded: boolean;
	/** The currently equipped build (highlighted reference row). */
	current?: boolean;
	onToggle: () => void;
	echoByUid: Map<string, Echo>;
}) {
	const echoes = result.uids.map((uid) => echoByUid.get(uid));
	const delta =
		baseline != null && baseline > 0 ? result.damage / baseline - 1 : null;
	const cost = echoes.reduce(
		(sum, echo) => sum + (echo ? (echoCost(echo) ?? 0) : 0),
		0,
	);

	return (
		<div
			className={`border-b border-border/60 last:border-b-0 ${
				current ? "bg-amber-400/10" : ""
			}`}
		>
			<button
				type="button"
				onClick={onToggle}
				className={`flex w-full flex-col gap-1.5 px-3 py-2 text-left transition-colors ${
					current ? "hover:bg-amber-400/15" : "hover:bg-muted/40"
				}`}
			>
				<div className="flex items-center gap-3">
					<span className="flex w-14 shrink-0 justify-start">
						{current ? (
							<CardBadge
								title="Currently equipped build"
								className="bg-amber-500/80"
							>
								Current
							</CardBadge>
						) : (
							<span className="text-[11px] text-muted-foreground">
								#{index + 1}
							</span>
						)}
					</span>
					<span className="w-20 shrink-0 text-sm font-semibold tabular-nums">
						{formatDamage(result.damage)}
					</span>
					{delta != null && (
						<span
							className={`w-16 shrink-0 text-[11px] font-semibold ${
								delta >= 0 ? "text-emerald-400" : "text-red-400"
							}`}
						>
							{delta >= 0 ? "+" : ""}
							{(delta * 100).toFixed(1)}%
						</span>
					)}
					{result.stats && (
						<span className="hidden min-w-0 flex-1 md:block">
							<StatChips stats={result.stats} />
						</span>
					)}
					<span className="ml-auto flex shrink-0 items-center gap-1">
						{echoes.map((echo, slot) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: slots are positional
							<EchoThumb key={slot} echo={echo} />
						))}
						<ChevronDown
							className={`size-4 shrink-0 text-muted-foreground transition-transform ${
								expanded ? "rotate-180" : ""
							}`}
						/>
					</span>
				</div>
			</button>
			{expanded && (
				<div className="flex flex-col gap-3 border-t border-border/60 bg-muted/20 px-3 py-3">
					{result.stats && <FullStats stats={result.stats} />}
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
						{echoes.map((echo, slot) =>
							echo ? (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: slots are positional
									key={slot}
									className="bg-card ring-1 ring-foreground/10"
								>
									<EchoCard
										echo={echo}
										footer={
											slot === 0 ? (
												<CardBadge title="Main echo">Main</CardBadge>
											) : undefined
										}
									/>
								</div>
							) : null,
						)}
					</div>
					<p className="text-[11px] text-muted-foreground">
						Total cost {cost} / 12
					</p>
				</div>
			)}
		</div>
	);
}
