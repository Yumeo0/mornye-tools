import {
	Add01Icon,
	Delete02Icon,
	Logout01Icon,
	UserAccountIcon,
	UserIcon,
	ViewIcon,
	ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { isTauri } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import { AccountProfileIdentifyDialog } from "@/components/AccountProfileIdentifyDialog";
import { AddPlayerProfileDialog } from "@/components/settings/PlayerProfilesDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
	EmptyTitle,
} from "@/components/ui/empty";
import { VirtualGrid } from "@/components/VirtualGrid";
import {
	type AccountProfile,
	refreshAccount,
	selectAccountProfile,
	useAccount,
} from "@/lib/account";
import {
	type DangerousStatus,
	readDangerousFeatures,
	removeDangerousProfile,
	signOutDangerous,
} from "@/lib/dangerous";
import {
	type GameAccountGroup,
	gameAccountGroups,
} from "@/lib/gameAccountGroups";
import { hasAccountData } from "@/lib/profileOverview";
import { cn } from "@/lib/utils";

type AccountRow =
	| { kind: "account"; key: string; group: GameAccountGroup }
	| { kind: "profile"; key: string; profile: AccountProfile; last: boolean }
	| { kind: "empty"; key: string };

const rowHeight = (row: AccountRow) =>
	row.kind === "profile" ? 64 : row.kind === "account" ? 52 : 36;

function PrivateEmail({ email }: { email: string }) {
	const [revealed, setRevealed] = useState(false);
	const at = email.lastIndexOf("@");
	const masked =
		at > 0
			? `${email.slice(0, Math.min(2, at - 1))}••••${email.slice(at)}`
			: "••••";
	return (
		<Button
			variant="ghost"
			size="sm"
			className="min-w-0 max-w-full justify-start"
			aria-label={revealed ? "Hide email address" : "Show email address"}
			aria-pressed={revealed}
			title={revealed ? "Click to hide email" : "Click to reveal email"}
			onClick={() => setRevealed((value) => !value)}
		>
			<span className="truncate">{revealed ? email : masked}</span>
			<HugeiconsIcon
				icon={revealed ? ViewOffIcon : ViewIcon}
				data-icon="inline-end"
			/>
		</Button>
	);
}

export function GameAccountsCard({
	status,
	error,
}: {
	status: DangerousStatus;
	error: string | null;
}) {
	const { profiles, snapshot } = useAccount();
	const [addAccountId, setAddAccountId] = useState<string | null>(null);
	const [removeProfile, setRemoveProfile] = useState<AccountProfile | null>(
		null,
	);
	const [identify, setIdentify] = useState<AccountProfile | null>(null);
	const [pending, setPending] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const busy = pending || !["ready", "signed_out"].includes(status.phase);
	const desktop = isTauri();
	const populatedProfileId = hasAccountData(snapshot)
		? snapshot.profile?.id
		: undefined;
	const rows = useMemo(() => {
		const result: AccountRow[] = [];
		for (const group of gameAccountGroups(
			status.accounts,
			profiles,
			status.profile_accounts,
			populatedProfileId,
		)) {
			const key = group.account?.id ?? "unlinked";
			result.push({ kind: "account", key: `account:${key}`, group });
			if (!group.profiles.length)
				result.push({ kind: "empty", key: `empty:${key}` });
			group.profiles.forEach((profile, index) => {
				result.push({
					kind: "profile",
					key: `profile:${profile.id}`,
					profile,
					last: index === group.profiles.length - 1,
				});
			});
		}
		return result;
	}, [status.accounts, status.profile_accounts, profiles, populatedProfileId]);

	async function act(action: () => Promise<void>) {
		setPending(true);
		setActionError(null);
		try {
			await action();
		} catch (cause) {
			setActionError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			setPending(false);
		}
	}

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Accounts</CardTitle>
					<CardDescription>
						Game accounts and their player profiles.
					</CardDescription>
					<CardAction>
						<Button
							size="sm"
							variant="outline"
							disabled={busy || !status.enabled || !desktop}
							onClick={() => setAddAccountId("new")}
						>
							<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
							Add account
						</Button>
					</CardAction>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{rows.length ? (
						<div
							style={{
								height: Math.min(
									448,
									rows.reduce((height, row) => height + rowHeight(row), 0),
								),
							}}
						>
							<VirtualGrid
								items={rows}
								columns={1}
								gap={0}
								estimateRowHeight={64}
								getItemKey={(row) => row.key}
								className="h-full overflow-y-auto"
								renderItem={(row) => {
									if (row.kind === "account") {
										const account = row.group.account;
										return (
											<div
												className="flex h-[52px] items-center gap-3 border-b bg-muted/40 px-3"
												data-account-row
											>
												<HugeiconsIcon
													icon={UserAccountIcon}
													className="size-5 shrink-0 text-muted-foreground"
												/>
												<div className="min-w-0 flex-1">
													{account ? (
														<PrivateEmail
															key={account.email}
															email={account.email}
														/>
													) : (
														<span className="text-sm font-medium">
															Unlinked profiles
														</span>
													)}
												</div>
												{account && (
													<>
														<Badge variant="outline">
															{account.remembered ? "Signed in" : "Signed out"}
														</Badge>
														{status.signed_in &&
															status.account_id === account.id && (
																<Button
																	size="icon-sm"
																	variant="ghost"
																	aria-label="Sign out of account"
																	title="Sign out of account"
																	disabled={busy || !desktop}
																	onClick={() =>
																		void act(async () => {
																			if (!(await signOutDangerous()))
																				throw new Error(
																					readDangerousFeatures().error ??
																						"Could not sign out.",
																				);
																		})
																	}
																>
																	<HugeiconsIcon icon={Logout01Icon} />
																</Button>
															)}
														<Button
															size="icon-sm"
															variant="outline"
															aria-label="Add player profile"
															title="Add player profile"
															disabled={busy || !status.enabled || !desktop}
															onClick={() => setAddAccountId(account.id)}
														>
															<HugeiconsIcon icon={Add01Icon} />
														</Button>
													</>
												)}
											</div>
										);
									}
									if (row.kind === "empty")
										return (
											<div className="ml-5 flex h-9 items-center border-l pl-7 text-xs text-muted-foreground">
												No player profiles added
											</div>
										);
									const { profile, last } = row;
									const selected = profile.id === snapshot.profile?.id;
									return (
										<div
											className="relative flex h-16 items-center gap-2 pl-9 pr-2"
											data-profile-row
										>
											<span
												aria-hidden
												className={cn(
													"absolute left-5 top-0 w-4 border-l",
													last
														? "h-8 border-b"
														: "h-full before:absolute before:top-8 before:w-4 before:border-b",
												)}
											/>
											<button
												type="button"
												disabled={busy || !desktop}
												aria-label={`Select ${profile.name || "player profile"}`}
												aria-pressed={selected}
												onClick={() =>
													void act(() => selectAccountProfile(profile.id))
												}
												className={cn(
													"flex min-w-0 flex-1 items-center gap-3 rounded-sm p-2 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
													selected && "bg-primary/5",
												)}
											>
												<HugeiconsIcon
													icon={UserIcon}
													className={cn(
														"size-5 shrink-0",
														selected ? "text-primary" : "text-muted-foreground",
													)}
												/>
												<span className="flex min-w-0 flex-1 flex-col gap-0.5">
													<span className="truncate text-sm font-medium">
														{profile.name || "Player"}
													</span>
													<span className="truncate text-xs text-muted-foreground">
														{profile.serverId === "unknown"
															? "Region unknown"
															: profile.region}
														{profile.level ? ` · Lv. ${profile.level}` : ""}
													</span>
												</span>
												{selected && (
													<Badge variant="secondary">Selected</Badge>
												)}
											</button>
											{profile.serverId === "unknown" && (
												<Button
													variant="outline"
													size="sm"
													disabled={busy || !desktop}
													onClick={() => setIdentify(profile)}
												>
													Set region
												</Button>
											)}
											<Button
												size="icon-sm"
												variant="ghost"
												aria-label={`Remove ${profile.name || "player profile"}`}
												title="Remove profile"
												disabled={busy || !desktop || profile.playerId <= 0}
												onClick={() => setRemoveProfile(profile)}
											>
												<HugeiconsIcon icon={Delete02Icon} />
											</Button>
										</div>
									);
								}}
							/>
						</div>
					) : (
						<Empty>
							<EmptyHeader>
								<EmptyTitle>No accounts or profiles yet</EmptyTitle>
								<EmptyDescription>
									Add a game account, or open the game with the passive listener
									running.
								</EmptyDescription>
							</EmptyHeader>
						</Empty>
					)}
					{!status.enabled && (
						<p className="text-xs text-muted-foreground">
							Enable Dangerous Features to add accounts and player profiles.
						</p>
					)}
					{!desktop && (
						<p className="text-xs text-muted-foreground">
							Account actions are available in the desktop app.
						</p>
					)}
					{(actionError || error || status.error) && (
						<Alert variant="destructive">
							<AlertDescription>
								{actionError ?? error ?? status.error}
							</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>
			{addAccountId && (
				<AddPlayerProfileDialog
					accountId={addAccountId}
					onClose={() => setAddAccountId(null)}
				/>
			)}
			{identify && (
				<AccountProfileIdentifyDialog
					profile={identify}
					initialName={identify.name}
					onClose={() => setIdentify(null)}
				/>
			)}
			<Dialog
				open={Boolean(removeProfile)}
				onOpenChange={(open) => {
					if (!open && !pending) setRemoveProfile(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							Remove {removeProfile?.name || "player profile"}?
						</DialogTitle>
						<DialogDescription>
							Removes this profile from the list. Its cached data and map
							progress are kept.
						</DialogDescription>
					</DialogHeader>
					{actionError && (
						<Alert variant="destructive">
							<AlertDescription>{actionError}</AlertDescription>
						</Alert>
					)}
					<DialogFooter>
						<Button
							variant="outline"
							disabled={pending}
							onClick={() => setRemoveProfile(null)}
						>
							Cancel
						</Button>
						<Button
							variant="destructive"
							disabled={busy || !removeProfile}
							onClick={() => {
								if (removeProfile)
									void act(async () => {
										const result = await removeDangerousProfile(
											removeProfile.id,
										);
										if (!result)
											throw new Error(
												readDangerousFeatures().error ??
													"Could not remove this profile.",
											);
										await refreshAccount();
										setRemoveProfile(null);
									});
							}}
						>
							Remove profile
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
