import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/filters";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { VirtualGrid } from "@/components/VirtualGrid";
import { useRotationDamage } from "@/hooks/useRotationDamage";
import type { AccountSnapshot } from "@/lib/account";
import type { TeamProfile } from "@/lib/calc/types";
import { charactersById } from "@/lib/catalog";
import { rotationFiltersSchema } from "@/lib/filterSchemas";
import { useFilterState } from "@/lib/persistentState";
import { OptimizerInfo } from "./OptimizerInfo";
import { RotationTeamCard } from "./RotationTeamCard";
import {
	EMPTY_ROTATION_FILTERS,
	filterRotationProfiles,
	groupRotationProfiles,
	type RotationFilters,
	sortRotationProfiles,
} from "./rotationProfiles";

function TeamPortraits({ profile }: { profile: TeamProfile }) {
	return (
		<span aria-hidden="true" className="inline-flex shrink-0 gap-1">
			{profile.members.map((member) => {
				const icon = charactersById.get(member.characterId)?.icon_head_256;
				return icon ? (
					<img
						key={member.characterId}
						src={icon}
						alt=""
						className="size-6 shrink-0 object-contain"
					/>
				) : null;
			})}
		</span>
	);
}

export function TeamProfilePicker({
	profiles,
	snapshot,
	selected,
	onSelect,
	loading = false,
}: {
	profiles: TeamProfile[];
	snapshot: AccountSnapshot;
	selected: TeamProfile | null;
	onSelect: (id: string) => void;
	loading?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [filters, setFilters] = useFilterState(
		"optimizer.rotations",
		EMPTY_ROTATION_FILTERS,
		rotationFiltersSchema,
	);
	const patch = (value: Partial<RotationFilters>) =>
		setFilters((previous) => ({ ...previous, ...value }));
	const characters = useMemo(
		() =>
			[
				...new Map(
					profiles
						.flatMap((p) => p.members)
						.map((m) => [
							m.characterId,
							{
								value: String(m.characterId),
								label: m.name,
								icon: charactersById.get(m.characterId)?.icon_head_256,
								preview: charactersById.get(m.characterId)?.preview,
							},
						]),
				).values(),
			].sort((a, b) => a.label.localeCompare(b.label)),
		[profiles],
	);
	const matching = useMemo(
		() =>
			filterRotationProfiles(profiles, snapshot, {
				search: filters.search,
				characterId: filters.characterId,
				role: filters.role,
				ownership: filters.ownership,
				sort: "name",
			}),
		[
			profiles,
			snapshot,
			filters.search,
			filters.characterId,
			filters.role,
			filters.ownership,
		],
	);
	const { damage, error: scoringError } = useRotationDamage(matching, open);
	const options = useMemo(
		() => sortRotationProfiles(matching, filters.sort, damage),
		[matching, filters.sort, damage],
	);
	const groups = useMemo(() => groupRotationProfiles(options), [options]);
	const filtered = Object.keys(EMPTY_ROTATION_FILTERS).some(
		(key) =>
			filters[key as keyof RotationFilters] !==
			EMPTY_ROTATION_FILTERS[key as keyof RotationFilters],
	);
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				disabled={!profiles.length || loading}
				aria-label={
					selected ? `Change rotation: ${selected.label}` : "Load rotation"
				}
				title={selected?.label}
				render={
					<Button
						variant={selected ? "outline" : "default"}
						size="sm"
						className="min-w-0 justify-start"
					/>
				}
			>
				{selected && <TeamPortraits profile={selected} />}
				<span>
					{loading ? "Loading…" : selected ? "Change" : "Load rotation"}
				</span>
			</DialogTrigger>
			{!profiles.length && !loading && (
				<p className="text-xs text-muted-foreground">
					No rotations are available.
				</p>
			)}
			<DialogContent className="flex h-[min(85dvh,760px)] flex-col sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>Load rotation</DialogTitle>
					<DialogDescription className="sr-only">
						Select a team rotation, then choose a Resonator to optimize.
					</DialogDescription>
				</DialogHeader>
				<Field>
					<FieldLabel htmlFor="rotation-search" className="sr-only">
						Search rotations
					</FieldLabel>
					<Input
						id="rotation-search"
						placeholder="Search rotations…"
						value={filters.search}
						onChange={(e) => patch({ search: e.target.value })}
					/>
				</Field>
				<FieldGroup className="grid grid-cols-2 gap-3 sm:grid-cols-4">
					<FilterSelect
						label="Resonator"
						value={filters.characterId}
						options={[{ value: "any", label: "Any Resonator" }, ...characters]}
						onChange={(characterId) => patch({ characterId, role: "any" })}
					/>
					<FilterSelect
						label="Resonator's role"
						value={filters.role}
						disabled={filters.characterId === "any"}
						options={[
							{ value: "any", label: "Any role" },
							{ value: "dps", label: "DPS" },
							{ value: "support", label: "Support" },
						]}
						onChange={(role) =>
							patch({ role: role as RotationFilters["role"] })
						}
					/>
					<FilterSelect
						label="Ownership"
						value={filters.ownership}
						options={[
							{ value: "any", label: "All teams" },
							{ value: "owned", label: "Owned teams" },
						]}
						onChange={(ownership) =>
							patch({ ownership: ownership as RotationFilters["ownership"] })
						}
					/>
					<FilterSelect
						label="Sort"
						value={filters.sort}
						options={[
							{ value: "name", label: "Name" },
							{ value: "damage-desc", label: "Damage ↓" },
							{ value: "damage-asc", label: "Damage ↑" },
						]}
						onChange={(sort) =>
							patch({ sort: sort as RotationFilters["sort"] })
						}
					/>
				</FieldGroup>
				<div className="flex items-center justify-between gap-3">
					<p role="status" className="text-xs text-muted-foreground">
						{groups.length.toLocaleString()} teams ·{" "}
						{options.length.toLocaleString()} rotations
						{damage.size < options.length &&
							` · ${damage.size}/${options.length} scored`}
					</p>
					{options.length > 0 && (
						<OptimizerInfo label="Rotation damage comparison">
							<p>
								Reference team damage · signature/default weapons · minimum
								required chains · optimized rotation stats.
							</p>
							<p>Pre-made: opener + 3 repeats. Custom: saved flow.</p>
						</OptimizerInfo>
					)}
					<Button
						variant="ghost"
						size="sm"
						disabled={!filtered}
						onClick={() => setFilters(EMPTY_ROTATION_FILTERS)}
					>
						Clear filters
					</Button>
				</div>
				{scoringError && (
					<p role="alert" className="text-xs text-destructive">
						{scoringError}
					</p>
				)}
				{!options.length ? (
					<Empty>
						<EmptyHeader>
							<EmptyTitle>No matching rotations</EmptyTitle>
							<EmptyDescription>Clear filters to see more.</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<VirtualGrid
						key={JSON.stringify(filters)}
						items={groups}
						columns={2}
						minItemWidth={340}
						gap={12}
						estimateRowHeight={210}
						getItemKey={(group) => group.id}
						className="min-h-0 flex-1 overflow-y-auto"
						renderItem={(group) => (
							<RotationTeamCard
								profiles={group.profiles}
								selectedId={selected?.id}
								damage={damage}
								onSelect={(id) => {
									onSelect(id);
									setOpen(false);
								}}
							/>
						)}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
