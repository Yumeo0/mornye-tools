import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { FilterSelect } from "@/components/filters";
import { TeamMember, TeamShowcase } from "@/components/teams/TeamShowcase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { VirtualGrid } from "@/components/VirtualGrid";
import {
	type AccountSnapshot,
	refreshAccount,
	type SavedTeam,
	useAccount,
} from "@/lib/account";
import { charactersById } from "@/lib/catalog";
import { useDangerousFeatures } from "@/lib/dangerous";
import {
	canEditTeams,
	requestTeamSwitch,
	requestTeamUpdate,
	teamEditError,
	teamName,
} from "@/lib/teams";

function TeamEditor({
	team,
	snapshot,
	connected,
	busy,
	onSave,
	onClose,
}: {
	team: SavedTeam;
	snapshot: AccountSnapshot;
	connected: boolean;
	busy: boolean;
	onSave: (name: string, roleIds: number[]) => void;
	onClose: () => void;
}) {
	const [name, setName] = useState(team.name);
	const [slots, setSlots] = useState<(number | null)[]>(
		[0, 1, 2].map((index) => team.roleIds[index] || null),
	);
	const roleIds = slots.filter((id): id is number => id !== null);
	const error = teamEditError(snapshot, team, roleIds);
	const changed =
		name !== team.name || roleIds.join(",") !== team.roleIds.join(",");
	const owned = snapshot.resonators.toSorted((a, b) =>
		(charactersById.get(a.id)?.character_name || a.name).localeCompare(
			charactersById.get(b.id)?.character_name || b.name,
		),
	);
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !busy) onClose();
			}}
		>
			<DialogContent
				className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
				showCloseButton={!busy}
			>
				<DialogHeader>
					<DialogTitle>Edit {teamName(team)}</DialogTitle>
					<DialogDescription>
						Choose up to three owned Resonators. Saving updates this team
						in-game.
					</DialogDescription>
				</DialogHeader>
				<FieldGroup>
					<Field>
						<FieldLabel htmlFor="team-name">Team name</FieldLabel>
						<Input
							id="team-name"
							value={name}
							placeholder={`Team ${team.id}`}
							disabled={busy || !connected}
							onChange={(event) => setName(event.target.value)}
						/>
					</Field>
					<div className="grid grid-cols-3 gap-3">
						{[0, 1, 2].map((index) => (
							<Field key={index}>
								<TeamMember
									compact
									roleId={slots[index] ?? undefined}
									snapshot={snapshot}
									slot={index}
								/>
								<FilterSelect
									label={`Slot ${index + 1}`}
									value={String(slots[index] ?? "none")}
									disabled={busy || !connected}
									options={[
										{ value: "none", label: "Empty slot" },
										...owned
											.filter(
												(role) =>
													!slots.some(
														(held, other) =>
															other !== index && held === role.id,
													),
											)
											.map((role) => ({
												value: String(role.id),
												label:
													charactersById.get(role.id)?.character_name ||
													role.name ||
													String(role.id),
												icon: charactersById.get(role.id)?.icon_head_256,
											})),
									]}
									onChange={(value) =>
										setSlots((previous) =>
											previous.map((held, other) =>
												other === index
													? value === "none"
														? null
														: Number(value)
													: held,
											),
										)
									}
								/>
								<div className="flex justify-center gap-1">
									{[-1, 1].map((direction) => (
										<Button
											key={direction}
											variant="ghost"
											size="icon-sm"
											aria-label={`Move slot ${index + 1} ${direction < 0 ? "left" : "right"}`}
											disabled={
												busy ||
												!connected ||
												index + direction < 0 ||
												index + direction > 2
											}
											onClick={() =>
												setSlots((previous) => {
													const next = [...previous];
													[next[index], next[index + direction]] = [
														next[index + direction],
														next[index],
													];
													return next;
												})
											}
										>
											<HugeiconsIcon
												icon={
													direction < 0 ? ArrowLeft01Icon : ArrowRight01Icon
												}
											/>
										</Button>
									))}
								</div>
							</Field>
						))}
					</div>
				</FieldGroup>
				{(!connected || error) && (
					<p role="status" className="text-xs text-muted-foreground">
						{!connected
							? "Connect to this profile's game account to save changes."
							: error}
					</p>
				)}
				<DialogFooter>
					<Button variant="ghost" disabled={busy} onClick={onClose}>
						Cancel
					</Button>
					<Button
						disabled={busy || !connected || !!error || !changed}
						onClick={() => onSave(name, roleIds)}
					>
						{busy ? "Saving…" : "Save to game"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function TeamsTab() {
	const { snapshot } = useAccount();
	const profileId = snapshot.profile?.id;
	const { status } = useDangerousFeatures();
	const connected = canEditTeams(snapshot, status);
	const [editing, setEditing] = useState<{
		profileId: string;
		team: SavedTeam;
	} | null>(null);
	const [pending, setPending] = useState<{
		id: number;
		action: "save" | "switch";
	} | null>(null);
	const running = useRef(false);
	const teams = (snapshot.teams ?? []).toSorted((a, b) => a.id - b.id);
	const editor =
		editing &&
		editing.profileId === profileId &&
		teams.some((team) => team.id === editing.team.id)
			? editing
			: null;
	const run = async (
		team: SavedTeam,
		action: "save" | "switch",
		operation: () => Promise<void>,
	) => {
		if (!connected || running.current) return;
		running.current = true;
		setPending({ id: team.id, action });
		try {
			await operation();
			if (action === "save") setEditing(null);
			toast.success(
				action === "save" ? "Team saved in-game" : "Active team changed",
			);
		} catch (error) {
			toast.error(
				typeof error === "string"
					? error
					: error instanceof Error
						? error.message
						: "Could not change the team.",
			);
		} finally {
			await refreshAccount();
			running.current = false;
			setPending(null);
		}
	};
	return (
		<div className="@container/teams flex min-h-0 flex-1 flex-col gap-3 px-4 sm:px-6">
			{connected && (
				<div className="flex shrink-0 items-center justify-end">
					<Badge variant="primary">Live connection</Badge>
				</div>
			)}
			{teams.length ? (
				<VirtualGrid
					items={teams}
					columns={1}
					gap={24}
					estimateRowHeight={280}
					getItemKey={(team) => team.id}
					className="-mr-4 min-h-0 flex-1 overflow-y-auto pr-4 sm:-mr-6 sm:pr-6"
					renderItem={(team) => (
						<TeamShowcase
							team={team}
							snapshot={snapshot}
							connected={connected}
							busy={!!pending}
							switching={pending?.id === team.id && pending.action === "switch"}
							onEdit={() =>
								profileId &&
								setEditing({ profileId, team: structuredClone(team) })
							}
							onUse={() =>
								profileId &&
								void run(team, "switch", () =>
									requestTeamSwitch(profileId, team.id),
								)
							}
						/>
					)}
				/>
			) : (
				<Empty className="flex-1 border border-dashed">
					<EmptyHeader>
						<EmptyMedia>
							<img
								src="/icons/navigation/teams.webp"
								alt=""
								className="size-12 opacity-60"
							/>
						</EmptyMedia>
						<EmptyTitle>No teams synced yet</EmptyTitle>
						<EmptyDescription>
							Open the team setup screen in-game while account capture is
							running, or connect to this profile's game account to sync saved
							compositions.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			)}
			{editor && (
				<TeamEditor
					key={`${editor.profileId}:${editor.team.id}`}
					team={editor.team}
					snapshot={snapshot}
					connected={connected}
					busy={!!pending}
					onClose={() => setEditing(null)}
					onSave={(name, roleIds) =>
						void run(editor.team, "save", () =>
							requestTeamUpdate(editor.profileId, editor.team, name, roleIds),
						)
					}
				/>
			)}
		</div>
	);
}
