import { useMemo, useState } from "react";
import { FilterSelect } from "@/components/filters";
import { Badge } from "@/components/ui/badge";
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
import type { AccountSnapshot } from "@/lib/account";
import { teamAvailability } from "@/lib/calc/optimizer";
import type { TeamProfile } from "@/lib/calc/types";
import { charactersById } from "@/lib/catalog";
import { rotationFiltersSchema } from "@/lib/filterSchemas";
import { useFilterState } from "@/lib/persistentState";
import { RotationMemberArt, shortRotationVariant } from "./RotationMemberArt";
import {
	EMPTY_ROTATION_FILTERS,
	filterRotationProfiles,
	type RotationFilters,
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
							},
						]),
				).values(),
			].sort((a, b) => a.label.localeCompare(b.label)),
		[profiles],
	);
	const options = useMemo(
		() => filterRotationProfiles(profiles, snapshot, filters),
		[profiles, snapshot, filters],
	);
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
						Select a team rotation, then choose a character to optimize.
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
						label="Character"
						value={filters.characterId}
						options={[{ value: "any", label: "Any character" }, ...characters]}
						onChange={(characterId) => patch({ characterId, role: "any" })}
					/>
					<FilterSelect
						label="Character's role"
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
						label="Compatibility"
						value={filters.compatibility}
						options={[
							{ value: "any", label: "All rotations" },
							{ value: "supported", label: "Supported rotations" },
						]}
						onChange={(compatibility) =>
							patch({
								compatibility:
									compatibility as RotationFilters["compatibility"],
							})
						}
					/>
				</FieldGroup>
				<div className="flex items-center justify-between gap-3">
					<p role="status" className="text-xs text-muted-foreground">
						{options.length.toLocaleString()} of{" "}
						{profiles.length.toLocaleString()} rotations
					</p>
					<Button
						variant="ghost"
						size="sm"
						disabled={!filtered}
						onClick={() => setFilters(EMPTY_ROTATION_FILTERS)}
					>
						Clear filters
					</Button>
				</div>
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
						items={options}
						columns={2}
						minItemWidth={340}
						gap={12}
						estimateRowHeight={200}
						getItemKey={(p) => p.id}
						className="min-h-0 flex-1 overflow-y-auto"
						renderItem={(p) => {
							const unavailable = teamAvailability(snapshot, p);
							return (
								<Button
									variant={p.id === selected?.id ? "secondary" : "outline"}
									className="h-auto w-full flex-col items-stretch justify-start gap-2 whitespace-normal p-3 text-left"
									aria-label={`Load ${p.label}, ${p.members.map((m) => `${m.variant}, ${m.mainEcho.name}`).join("; ")}`}
									aria-pressed={p.id === selected?.id}
									title={unavailable.length ? unavailable.join(" · ") : p.label}
									onClick={() => {
										onSelect(p.id);
										setOpen(false);
									}}
								>
									{p.customRotation && (
										<span className="flex items-center gap-2">
											<Badge variant="secondary">Custom</Badge>
											<span className="truncate">{p.label}</span>
										</span>
									)}
									<span className="grid grid-cols-3 gap-3">
										{p.members.map((m) => (
											<span
												key={m.characterId}
												className="flex min-w-0 flex-col items-center gap-1 text-center"
											>
												<RotationMemberArt member={m} />
												<span className="mt-1">{m.name}</span>
												{shortRotationVariant(m.variant) && (
													<span
														className="text-xs text-muted-foreground"
														title={m.variant}
													>
														{shortRotationVariant(m.variant)}
													</span>
												)}
												<Badge variant="outline">
													{m.mainDps ? "DPS" : "Support"}
												</Badge>
											</span>
										))}
									</span>
									{(unavailable.length > 0 || p.id === selected?.id) && (
										<span className="flex justify-end gap-1">
											<Badge>
												{p.id === selected?.id ? "Loaded" : "Unavailable"}
											</Badge>
										</span>
									)}
								</Button>
							);
						}}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
