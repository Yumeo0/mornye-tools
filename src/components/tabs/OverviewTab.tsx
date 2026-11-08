import {
	ArrowRight01Icon,
	Clock01Icon,
	Globe02Icon,
	UserCircleIcon,
	ViewIcon,
	ViewOffIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { type AccountSnapshot, useAccount } from "@/lib/account";
import { hasAccountData, overviewCounts, profilePortrait } from "@/lib/profileOverview";

const COLLECTIONS = [
	{ value: "characters", title: "Characters", image: "/icons/navigation/characters.webp" },
	{ value: "weapons", title: "Weapons", image: "/icons/navigation/weapons.webp" },
	{ value: "echoes", title: "Echoes", image: "/icons/navigation/echoes.webp" },
] as const;

export type OverviewDestination =
	| "characters"
	| "weapons"
	| "echoes"
	| "settings";

/** Remounted on profile/tab changes; hidden UIDs never enter the DOM. */
function PrivateUid({ uid }: { uid: number }) {
	const [revealed, setRevealed] = useState(false);
	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			disabled={uid <= 0}
			aria-label={revealed ? "Hide UID" : "Show UID"}
			aria-pressed={revealed}
			onClick={() => setRevealed((value) => !value)}
		>
			<HugeiconsIcon
				icon={revealed ? ViewOffIcon : ViewIcon}
				data-icon="inline-start"
			/>
			{uid <= 0
				? "UID not captured"
				: revealed
					? `UID ${uid}`
					: "UID ·········"}
		</Button>
	);
}

function LastUpdated({ value }: { value: string }) {
	const date = new Date(value);
	const valid = Number.isFinite(date.getTime());
	return (
		<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
			<HugeiconsIcon icon={Clock01Icon} className="size-4" />
			<span>Last updated</span>
			{valid ? (
				<time dateTime={date.toISOString()}>{date.toLocaleString()}</time>
			) : (
				<span>Not yet captured</span>
			)}
		</div>
	);
}

export function ProfileOverview({
	snapshot,
	error,
	active,
	onNavigate,
}: {
	snapshot: AccountSnapshot;
	error: string | null;
	active: boolean;
	onNavigate: (destination: OverviewDestination) => void;
}) {
	const { player, profile } = snapshot;
	const uid = profile?.playerId || player?.playerId || 0;
	const name = player?.name.trim() || "Unnamed profile";
	const portrait = profilePortrait(player?.headId);
	const counts = overviewCounts(snapshot);
	const profileKey = profile?.id ?? String(uid);
	const region =
		profile?.serverId === "unknown" ? "Region not identified" : profile?.region;
	return (
		<div className="min-h-0 flex-1 overflow-y-auto pb-6 pr-1">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-1 sm:p-3">
				{error && (
					<Alert variant="destructive">
						<AlertTitle>Account data unavailable</AlertTitle>
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				{!hasAccountData(snapshot) ? (
					<Empty className="min-h-80 border">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<HugeiconsIcon icon={UserCircleIcon} />
							</EmptyMedia>
							<EmptyTitle>No profile data yet</EmptyTitle>
							<EmptyDescription>
								Log in to the game while Mornye Tools is running, or connect
								your account in Settings. Your profile and collection will
								appear here.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button variant="outline" onClick={() => onNavigate("settings")}>
								Open settings
								<HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
							</Button>
						</EmptyContent>
					</Empty>
				) : (
					<>
						<Card>
							<CardHeader>
								<CardTitle>Current profile</CardTitle>
								<CardDescription>Wuthering Waves</CardDescription>
								{region && (
									<CardAction className="max-w-48">
										<Badge
											variant="outline"
											className="max-w-full whitespace-normal break-words"
										>
											<HugeiconsIcon
												icon={Globe02Icon}
												data-icon="inline-start"
											/>
											{region}
										</Badge>
									</CardAction>
								)}
							</CardHeader>
							<CardContent className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8 sm:py-4">
								<Avatar
										className="size-28"
										key={`${profileKey}:${player?.headId ?? "none"}`}
									>
										{portrait && (
											<AvatarImage
												src={portrait}
												alt="Selected in-game profile portrait"
											/>
										)}
										<AvatarFallback>
											<HugeiconsIcon
												icon={UserCircleIcon}
												className="size-12"
											/>
										</AvatarFallback>
								</Avatar>
								<div className="flex min-w-0 flex-1 flex-col gap-5">
									<div className="flex flex-wrap items-center justify-between gap-3">
										<h2 className="min-w-0 break-words text-3xl font-semibold tracking-tight">
											{name}
										</h2>
										<PrivateUid
											key={`${profileKey}:${uid}:${active}`}
											uid={uid}
										/>
									</div>
									<p className="max-w-xl whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
										{player?.signature?.trim() || "No signature captured yet."}
									</p>
									<dl className="flex flex-wrap gap-8">
										{[
											["Union level", player && player.level > 0 ? player.level : "—"],
											["World level", player?.worldLevel ?? "—"],
										].map(([label, value]) => (
											<div key={label} className="flex flex-col gap-1">
												<dt className="text-xs text-muted-foreground">{label}</dt>
												<dd className="text-2xl font-medium tabular-nums">{value}</dd>
											</div>
										))}
									</dl>
									{!portrait && (
										<p className="text-xs text-muted-foreground">
											Your selected portrait will appear after it is captured
											from the game.
										</p>
									)}
								</div>
							</CardContent>
							<CardFooter>
								<LastUpdated value={snapshot.updatedAt} />
							</CardFooter>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle>Collection</CardTitle>
								<CardDescription>
									Saved locally for this profile.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<dl className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-4">
									{COLLECTIONS.map((item) => (
										<div
											key={item.value}
											className="flex flex-col items-start gap-3"
										>
											<dt className="flex items-center gap-2 text-xs text-muted-foreground">
												<img
													src={item.image}
													alt=""
													className="size-6 object-contain"
												/>
												{item.title}
											</dt>
											<dd className="text-4xl font-medium tracking-tight tabular-nums">
												{counts[item.value].toLocaleString()}
											</dd>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => onNavigate(item.value)}
											>
												View {item.title.toLowerCase()}
												<HugeiconsIcon
													icon={ArrowRight01Icon}
													data-icon="inline-end"
												/>
											</Button>
										</div>
									))}
								</dl>
							</CardContent>
							<CardFooter className="flex-wrap justify-between gap-3">
								<span>
									{counts.inventory.toLocaleString()} material / item types
								</span>
								<span>{counts.teams.toLocaleString()} saved formations</span>
							</CardFooter>
						</Card>
					</>
				)}
			</div>
		</div>
	);
}

export function OverviewTab({
	active,
	onNavigate,
}: {
	active: boolean;
	onNavigate: (destination: OverviewDestination) => void;
}) {
	const { snapshot, error } = useAccount();
	return (
		<ProfileOverview
			snapshot={snapshot}
			error={error}
			active={active}
			onNavigate={onNavigate}
		/>
	);
}
