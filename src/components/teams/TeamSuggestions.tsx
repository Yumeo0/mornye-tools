import { AiMagicIcon, ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useMemo, useState } from "react";
import { FilterField } from "@/components/filters/FilterField";
import { OptimizerInfo } from "@/components/optimizer/OptimizerInfo";
import {
	formatDamage,
	SuggestedTeamCard,
} from "@/components/teams/SuggestedTeamCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { VirtualGrid } from "@/components/VirtualGrid";
import { useCustomRotations } from "@/hooks/useCustomRotations";
import { useRotationDamage } from "@/hooks/useRotationDamage";
import type { AccountSnapshot, Resonator } from "@/lib/account";
import { ensureCoreReady, getCalculatorCatalog } from "@/lib/calc/core";
import type { CalculatorCatalog } from "@/lib/calc/types";
import { customRotationProfile } from "@/lib/customRotations";
import {
	bestTeamRotations,
	ownedTeamChains,
	ownedTeamRoleIds,
	ownedTeamRotations,
	type SuggestedTeam,
	type SuggestedTeamCount,
	suggestTeamCombination,
	TEAM_COUNTS,
} from "@/lib/teamSuggestions";
import { cn } from "@/lib/utils";

function TeamSuggestions({
	snapshot,
	enabled,
	teamCount,
	onTeamCountChange,
	connected,
	busy,
	selectedId,
	onReplace,
}: {
	snapshot: AccountSnapshot;
	enabled: boolean;
	teamCount: SuggestedTeamCount;
	onTeamCountChange: (count: SuggestedTeamCount) => void;
	connected: boolean;
	busy: boolean;
	selectedId?: string;
	onReplace: (team: SuggestedTeam) => void;
}) {
	const [catalog, setCatalog] = useState<CalculatorCatalog | null>(
		getCalculatorCatalog,
	);
	const [error, setError] = useState<string | null>(null);
	const [library] = useCustomRotations();
	// Packet updates replace the entire snapshot. Keep scoring work alive when
	// equipment, levels, or other unrelated account data changes.
	const rosterKey = JSON.stringify(
		snapshot.resonators
			.map(({ id, chain }) => ({ id, chain }))
			.sort((a, b) => a.id - b.id),
	);
	const roster = useMemo(
		() => ({
			resonators: JSON.parse(rosterKey) as Pick<Resonator, "id" | "chain">[],
		}),
		[rosterKey],
	);
	const hasRoster = snapshot.resonators.length > 0;
	const chains = useMemo(() => ownedTeamChains(roster), [roster]);
	useEffect(() => {
		if (!enabled || catalog || !hasRoster) return;
		let live = true;
		void ensureCoreReady()
			.then((value) => {
				if (live) setCatalog(value);
			})
			.catch((cause) => {
				if (live) setError(String(cause));
			});
		return () => {
			live = false;
		};
	}, [enabled, catalog, hasRoster]);
	const rotations = useMemo(
		() =>
			catalog
				? ownedTeamRotations(
						[
							...catalog.teams,
							...library.map((rotation) =>
								customRotationProfile(rotation, catalog),
							),
						],
						roster,
					)
				: [],
		[catalog, library, roster],
	);
	const { damage, error: scoringError } = useRotationDamage(
		rotations,
		enabled,
		chains,
	);
	const teams = useMemo(
		() => bestTeamRotations(rotations, damage),
		[rotations, damage],
	);
	const suggestion = useMemo(
		() => suggestTeamCombination(teams, teamCount),
		[teams, teamCount],
	);
	const pending = rotations.length - damage.size;
	const loading = hasRoster && !catalog && !error;
	const scoring = pending > 0 && !scoringError;
	const failed = error ?? scoringError;
	const hasSavedTeams = !!snapshot.teams?.length;
	return (
		<>
			<FilterField label="Number of teams">
				<ToggleGroup
					aria-label="Number of teams to recommend"
					variant="solid"
					size="sm"
					value={[String(teamCount)]}
					onValueChange={(value) => {
						const count = TEAM_COUNTS.find(
							(count) => String(count) === value[0],
						);
						if (count) onTeamCountChange(count);
					}}
				>
					{TEAM_COUNTS.map((count) => (
						<ToggleGroupItem key={count} value={String(count)}>
							{count}
						</ToggleGroupItem>
					))}
				</ToggleGroup>
			</FilterField>
			{failed && (
				<Alert variant="destructive">
					<AlertDescription>{failed}</AlertDescription>
				</Alert>
			)}
			{suggestion ? (
				<>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<h3 className="font-medium">
							{pending ? "Best combination so far" : "Best combination"}
						</h3>
						<p className="text-xs text-muted-foreground">
							<span className="font-mono text-base font-semibold text-foreground">
								{suggestion.teams.some((team) => team.warning) && "≈ "}
								{formatDamage(suggestion.damage)}
							</span>{" "}
							combined DMG
						</p>
					</div>
					<VirtualGrid
						key={teamCount}
						items={suggestion.teams}
						columns={1}
						gap={12}
						estimateRowHeight={270}
						getItemKey={(team) => team.id}
						className="-mr-3 min-h-0 flex-1 overflow-y-auto pr-3"
						renderItem={(team) => (
							<div className="p-px">
								<SuggestedTeamCard
									team={team}
									chains={chains}
									connected={connected}
									busy={busy}
									selected={selectedId === team.id}
									replaceHint={
										!hasSavedTeams
											? "Sync your saved teams first."
											: !ownedTeamRoleIds(team.profile, snapshot)
												? "Sync the recommended Resonators first."
												: undefined
									}
									onReplace={() => onReplace(team)}
								/>
							</div>
						)}
					/>
				</>
			) : (
				<Empty className="min-h-0 flex-1 border border-dashed">
					<EmptyHeader>
						<EmptyTitle>
							{!hasRoster
								? "Sync your characters first"
								: loading || scoring
									? "Finding team combinations…"
									: failed
										? "Could not score all rotations"
										: `Cannot form ${teamCount} ${teamCount === 1 ? "team" : "teams"}`}
						</EmptyTitle>
						<EmptyDescription>
							{!hasRoster
								? "Sync the selected profile's Resonators to suggest teams from your roster."
								: loading || scoring
									? "Comparing pre-made and saved custom rotations for your owned characters."
									: !rotations.length
										? "No complete rotation matches your owned characters and chains. Add a custom rotation or sync more characters."
										: "Choose fewer teams or add rotations for more of your owned characters. Each team needs three different Resonators, with no characters shared between teams."}
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
			<p role="status" className="text-xs text-muted-foreground">
				{loading
					? "Loading rotations…"
					: `${teams.length.toLocaleString()} owned lineups · ${rotations.length.toLocaleString()} rotations`}
				{scoring && ` · Scoring ${damage.size}/${rotations.length}…`}
			</p>
		</>
	);
}

export function TeamSuggestionsPanel({
	id,
	expanded,
	onExpandedChange,
	snapshot,
	teamCount,
	onTeamCountChange,
	connected,
	busy,
	selectedId,
	onReplace,
}: {
	id: string;
	expanded: boolean;
	onExpandedChange: (expanded: boolean) => void;
	snapshot: AccountSnapshot;
	teamCount: SuggestedTeamCount;
	onTeamCountChange: (count: SuggestedTeamCount) => void;
	connected: boolean;
	busy: boolean;
	selectedId?: string;
	onReplace: (team: SuggestedTeam) => void;
}) {
	return (
		<aside
			id={id}
			aria-label="Suggested teams"
			className={cn(
				"flex min-h-0 min-w-0 shrink-0 flex-col overflow-hidden border bg-card text-card-foreground",
				expanded ? "w-96 max-[1100px]:w-80" : "w-12",
			)}
		>
			<header
				className={cn(
					"flex shrink-0 items-center gap-2 p-2",
					expanded && "border-b",
				)}
			>
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label={expanded ? "Hide suggestions" : "Suggest teams"}
					title={expanded ? "Hide suggestions" : "Suggest teams"}
					aria-expanded={expanded}
					aria-controls={`${id}-content`}
					onClick={() => onExpandedChange(!expanded)}
				>
					<HugeiconsIcon icon={expanded ? ArrowLeft01Icon : AiMagicIcon} />
				</Button>
				{expanded && (
					<>
						<h2 className="flex-1 text-xs font-medium">Suggested teams</h2>
						<OptimizerInfo
							label="How team suggestions are ranked"
							size="icon-sm"
						>
							<p>
								Finds the best combination for your selected number of teams by
								combined rotation damage, using only your owned Resonators. Each
								lineup uses its strongest available rotation.
							</p>
							<p>
								Scores use your synced Resonance Chains, signature/default
								weapons and optimized rotation stats. Your equipped gear and
								levels are not used in these estimates. Rotations that cannot
								model your actual chains are excluded.
							</p>
							<p>Pre-made: opener + 3 repeats. Custom: saved flow.</p>
							<p>
								Each Resonator, including all Rover elements, can appear in only
								one team. If your roster cannot form the requested number of
								complete teams, choose a smaller number.
							</p>
						</OptimizerInfo>
					</>
				)}
			</header>
			<div
				id={`${id}-content`}
				hidden={!expanded}
				className={cn(
					"flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-3",
					!expanded && "hidden",
				)}
			>
				<TeamSuggestions
					key={snapshot.profile?.id ?? "no-profile"}
					snapshot={snapshot}
					enabled={expanded}
					teamCount={teamCount}
					onTeamCountChange={onTeamCountChange}
					connected={connected}
					busy={busy}
					selectedId={selectedId}
					onReplace={onReplace}
				/>
			</div>
		</aside>
	);
}
