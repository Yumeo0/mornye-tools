import type { KeyboardEvent } from "react";
import { FilterSelect } from "@/components/filters";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { ToggleGroupItem } from "@/components/ui/toggle-group";
import { weaponIconUrl } from "@/components/weapon/WeaponCard";
import type { AccountSnapshot } from "@/lib/account";
import type { OptimizerOverrides } from "@/lib/calc/translate";
import type {
	MemberBuild,
	OptResultStats,
	TeamMemberProfile,
} from "@/lib/calc/types";
import { echoesByMonsterId } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { OptimizerInfo } from "./OptimizerInfo";
import { RotationMemberArt } from "./RotationMemberArt";

function keepFormNavigation(event: KeyboardEvent<HTMLElement>) {
	if (
		["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(
			event.key,
		)
	)
		event.stopPropagation();
}

function LoadoutInfo({
	member,
	build,
	stats,
}: {
	member: TeamMemberProfile;
	build: MemberBuild;
	stats?: OptResultStats;
}) {
	return (
		<OptimizerInfo label={`${member.name} loadout details`}>
			<p>
				{member.variant} · Slot 1: {member.mainEcho.name}.
			</p>
			<p>
				{build.echoSource === "rotation"
					? "Recommended echo stats with rotation ER; no inventory reserved."
					: "Uses equipped echoes."}
			</p>
			{stats && build.echoSource === "rotation" && (
				<dl className="grid grid-cols-2 gap-x-4 gap-y-1">
					{[
						["HP", stats.hp.toFixed(0)],
						["ATK", stats.atk.toFixed(0)],
						["DEF", stats.def.toFixed(0)],
						["ER", `${stats.er.toFixed(1)}%`],
						["CR", `${stats.cr.toFixed(1)}%`],
						["CD", `${stats.cd.toFixed(1)}%`],
					].map(([label, value]) => (
						<div key={label} className="flex justify-between gap-2">
							<dt>{label}</dt>
							<dd>{value}</dd>
						</div>
					))}
				</dl>
			)}
		</OptimizerInfo>
	);
}

export function OptimizerMemberCard({
	member,
	build,
	selected,
	owned,
	snapshot,
	edit,
	stats,
	onPatch,
}: {
	member: TeamMemberProfile;
	build?: MemberBuild;
	selected: boolean;
	owned: boolean;
	snapshot: AccountSnapshot;
	edit?: OptimizerOverrides;
	stats?: OptResultStats;
	onPatch: (patch: OptimizerOverrides) => void;
}) {
	return (
		<Card size="sm" className="gap-2 py-2">
			<CardHeader className="grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1">
				{/* The target button sits behind the identity; chain remains a separate control. */}
				<ToggleGroupItem
					value={String(member.characterId)}
					aria-label={`Optimize ${member.name}, ${member.variant}, main echo ${member.mainEcho.name}`}
					title={`${member.variant} · Slot 1: ${member.mainEcho.name}`}
					className="col-span-2 col-start-1 row-span-2 row-start-1 h-full w-full min-w-0 focus:z-auto focus-visible:z-auto"
				/>
				<RotationMemberArt
					member={member}
					compact
					className="pointer-events-none col-start-1 row-span-2 row-start-1 m-1 self-center"
				/>
				<div
					className={cn(
						"pointer-events-none relative col-start-2 row-start-1 flex min-w-0 items-center gap-1.5 pr-1 pt-1",
						!build && "row-span-2 self-center pb-1",
					)}
				>
					<span className="truncate">{member.name}</span>
					<Badge>
						{selected ? "Target" : member.mainDps ? "DPS" : "Support"}
					</Badge>
				</div>
				{build && (
					<FieldGroup
						className="relative col-start-2 row-start-2 flex-row items-center gap-1 self-start pb-1"
						onKeyDown={keepFormNavigation}
					>
						<div className="w-16 shrink-0">
							<FilterSelect
								label={`${member.name} chain`}
								hideLabel
								value={String(build.chain)}
								options={Array.from({ length: 7 }, (_, i) => ({
									value: String(i),
									label: `S${i}`,
								}))}
								onChange={(v) => onPatch({ chain: Number(v) })}
							/>
						</div>
						<LoadoutInfo member={member} build={build} stats={stats} />
					</FieldGroup>
				)}
			</CardHeader>
			{build && (
				<CardContent
					className="flex flex-col gap-1.5"
					onKeyDown={keepFormNavigation}
				>
					<FieldGroup className="grid grid-cols-[minmax(0,1fr)_4rem] items-center gap-1.5">
						<FilterSelect
							label={`${member.name} weapon`}
							hideLabel
							iconSize="lg"
							value={String(build.weaponId)}
							options={[
								{ value: "0", label: "Select weapon" },
								...member.weapons
									.toSorted((a, b) => a.name.localeCompare(b.name))
									.map((w) => ({
										value: String(w.id),
										label: w.name,
										icon: weaponIconUrl(w.id),
									})),
							]}
							onChange={(v) => {
								const id = Number(v);
								onPatch({
									weaponItemId: id,
									weaponRank:
										snapshot.weapons.find((w) => w.itemId === id)?.rank ??
										edit?.weaponRank ??
										1,
								});
							}}
						/>
						<FilterSelect
							label={`${member.name} refinement`}
							hideLabel
							value={String(build.weaponRank)}
							options={Array.from({ length: 5 }, (_, i) => ({
								value: String(i + 1),
								label: `R${i + 1}`,
							}))}
							onChange={(v) => onPatch({ weaponRank: Number(v) })}
						/>
					</FieldGroup>
					<FieldGroup className="grid grid-cols-2 items-center gap-1.5">
						<FilterSelect
							label={`${member.name} echoes`}
							hideLabel
							disabled={!owned || selected}
							value={build.echoSource ?? "equipped"}
							options={[
								{ value: "equipped", label: "Equipped" },
								{ value: "rotation", label: "Rotation" },
							]}
							onChange={(v) =>
								onPatch({
									echoSource: v === "rotation" ? "rotation" : "equipped",
								})
							}
						/>
						<div className="min-w-0">
							{build.echoSource !== "rotation" && !!build.echoes.length && (
								<figure
									className="grid grid-cols-5 items-center justify-items-center gap-0.5"
									aria-label={`${member.name} equipped echoes`}
								>
									{build.echoes.map((echo, i) => (
										<img
											key={echo.uid}
											src={echoesByMonsterId.get(echo.typeId)?.icon_middle}
											alt={echo.name}
											title={`Slot ${i + 1} · ${echo.name} +${echo.level}`}
											className="aspect-square w-full max-w-6 min-w-0 object-contain"
										/>
									))}
								</figure>
							)}
							{build.echoSource === "rotation" && stats && (
								<dl
									className="grid h-7 grid-cols-3 gap-0.5 text-center tabular-nums"
									title={`${member.name} rotation stats`}
								>
									{[
										["CR", stats.cr],
										["CD", stats.cd],
										["ER", stats.er],
									].map(([label, value]) => (
										<div
											key={label}
											title={`${label}: ${Number(value).toFixed(1)}%`}
										>
											<dt className="text-[9px] leading-3 text-muted-foreground">
												{label}
											</dt>
											<dd className="text-[10px] leading-4">
												{Number(value).toFixed(0)}%
											</dd>
										</div>
									))}
								</dl>
							)}
						</div>
					</FieldGroup>
				</CardContent>
			)}
		</Card>
	);
}
