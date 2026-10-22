import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useMemo, useState } from "react";
import { FilterField } from "@/components/filters";
import type { SlotKey } from "@/components/optimizer/CharacterSlotBox";
import { roleLabel } from "@/components/optimizer/display";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import type { SavedTeam } from "@/lib/account";
import {
	recommendedTeamPresets,
	savedTeamPresets,
	type TeamPreset,
	teammatesForPreset,
} from "@/lib/calc/teamPresets";
import type { TranslatedBuild } from "@/lib/calc/translate";
import { charactersById } from "@/lib/catalog";
import { cn } from "@/lib/utils";

function TeamPortraits({
	roleIds,
	compact = false,
}: {
	roleIds: readonly string[];
	compact?: boolean;
}) {
	return (
		<span aria-hidden="true" className="flex shrink-0 items-center gap-1">
			{roleIds.map((id) => {
				const character = charactersById.get(Number(id));
				return (
					<span
						key={id}
						title={character?.character_name}
						className={cn(
							"flex shrink-0 items-center justify-center overflow-hidden bg-muted",
							compact ? "size-5" : "size-10",
						)}
					>
						{character?.icon_head_256 ? (
							<img
								src={character.icon_head_256}
								alt=""
								className="size-full object-contain"
							/>
						) : (
							<span className="text-[10px] text-muted-foreground">?</span>
						)}
					</span>
				);
			})}
		</span>
	);
}

export function TeamPresetPicker({
	slotRoleIds,
	buildsByRoleId,
	ownedRoleIds,
	teams,
	onApply,
}: {
	slotRoleIds: Record<SlotKey, string>;
	buildsByRoleId: Map<string, TranslatedBuild>;
	ownedRoleIds: Set<string>;
	teams: readonly SavedTeam[];
	onApply: (roleIds: readonly string[]) => void;
}) {
	const target = slotRoleIds.target;
	const recommended = useMemo(() => recommendedTeamPresets(target), [target]);
	const saved = useMemo(() => savedTeamPresets(target, teams), [target, teams]);
	const [chosenId, setChosenId] = useState<string | null>(null);
	const [linkError, setLinkError] = useState<string | null>(null);
	const all = [...recommended, ...saved];
	const chosen = all.find((preset) => preset.id === chosenId);
	const selected =
		chosen &&
		teammatesForPreset(target, chosen.roleIds)?.every(
			(id, index) => id === slotRoleIds[index === 0 ? "mateOne" : "mateTwo"],
		)
			? chosen
			: null;
	const nameFor = (id: string) => {
		const build = buildsByRoleId.get(id);
		return build ? roleLabel(build) : `Unknown character (${id})`;
	};
	const members = (preset: TeamPreset) =>
		preset.roleIds.map(nameFor).join(" / ");
	const label = (preset: TeamPreset) => `${preset.name} · ${members(preset)}`;
	const missing = (preset: TeamPreset) =>
		preset.roleIds.filter((id) => !ownedRoleIds.has(id));
	const renderPicker = (
		presets: TeamPreset[],
		source: "tethys" | "saved",
		caption: string,
		empty: string,
	) => (
		<FilterField label={caption}>
			<Select
				value={selected?.id.startsWith(`${source}:`) ? selected.id : null}
				disabled={!target || presets.length === 0}
				onValueChange={(id) => {
					const preset = presets.find((entry) => entry.id === id);
					if (!preset) return;
					onApply(preset.roleIds);
					setChosenId(preset.id);
					setLinkError(null);
				}}
			>
				<SelectTrigger aria-label={caption} size="sm" className="w-full">
					{selected?.id.startsWith(`${source}:`) && (
						<TeamPortraits roleIds={selected.roleIds} compact />
					)}
					<span className="truncate">
						{selected?.id.startsWith(`${source}:`)
							? label(selected)
							: !target
								? "Select a target first"
								: presets.length
									? "Choose a team…"
									: empty}
					</span>
				</SelectTrigger>
				<SelectContent alignItemWithTrigger={false}>
					<SelectGroup>
						{presets.map((preset) => (
							<SelectItem
								key={preset.id}
								value={preset.id}
								disabled={preset.roleIds.some((id) => !buildsByRoleId.has(id))}
							>
								<div className="flex min-w-0 items-center gap-3 whitespace-normal py-0.5">
									<TeamPortraits roleIds={preset.roleIds} />
									<div className="flex min-w-0 flex-col gap-1">
										<span>{preset.name}</span>
										<span className="text-muted-foreground">
											{members(preset)}
										</span>
										{source === "tethys" && missing(preset).length > 0 && (
											<span className="text-muted-foreground">
												Unowned: {missing(preset).map(nameFor).join(", ")}
											</span>
										)}
									</div>
								</div>
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</FilterField>
	);
	return (
		<div className="flex flex-col gap-2">
			<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
				{renderPicker(
					recommended,
					"tethys",
					"Recommended teams · Tethys.gg",
					"No recommendations for this target",
				)}
				{renderPicker(
					saved,
					"saved",
					"Your in-game teams",
					"No captured teams with this target",
				)}
			</div>
			{selected?.url && (
				<p className="text-[11px] text-muted-foreground">
					<a
						href={selected.url}
						target="_blank"
						rel="noreferrer"
						onClick={async (event) => {
							if (!isTauri() || !selected.url) return;
							event.preventDefault();
							try {
								await openUrl(selected.url);
							} catch {
								setLinkError(
									`Could not open your browser. Open ${selected.url} manually.`,
								);
							}
						}}
						className="underline underline-offset-2"
					>
						View Tethys.gg guide
					</a>
					{selected.notes.length > 0 &&
						` · ${selected.notes.join("; ")}.`}
				</p>
			)}
			{linkError && (
				<p role="alert" className="text-xs text-destructive">
					{linkError}
				</p>
			)}
		</div>
	);
}
