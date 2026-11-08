import {
	Add01Icon,
	Loading03Icon,
	Login01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { type FormEvent, useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
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
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { VirtualGrid } from "@/components/VirtualGrid";
import { refreshAccount, useAccount } from "@/lib/account";
import {
	addDangerousProfile,
	disconnectDangerous,
	discoverDangerousProfiles,
	loginDangerousAccount,
	readDangerousFeatures,
	removeDangerousProfile,
	type ServerPlayer,
	selectDangerousAccount,
	signOutDangerous,
	useDangerousFeatures,
} from "@/lib/dangerous";

export function AddPlayerProfileDialog({ onClose }: { onClose: () => void }) {
	const { status } = useDangerousFeatures();
	const accounts = status?.accounts ?? [];
	const [choice, setChoice] = useState(
		accounts.some((a) => a.id === status?.account_id)
			? (status?.account_id ?? "new")
			: "new",
	);
	const selected = accounts.find((a) => a.id === choice);
	const [email, setEmail] = useState(selected?.email ?? "");
	const [password, setPassword] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [discovery, setDiscovery] = useState<{
		accountId: string;
		rows: ServerPlayer[];
	} | null>(null);
	const run = useRef(0);
	const savedSignIn = Boolean(selected?.remembered);
	function close() {
		run.current += 1;
		const phase = readDangerousFeatures().status?.phase;
		if (phase === "authenticating" || phase === "discovering")
			void disconnectDangerous();
		setPassword("");
		onClose();
	}
	async function findProfiles(event?: FormEvent) {
		event?.preventDefault();
		const operation = ++run.current;
		setPending(true);
		setError(null);
		const secret = password;
		setPassword("");
		try {
			const signedIn = savedSignIn
				? await selectDangerousAccount(choice)
				: await loginDangerousAccount(email.trim(), secret);
			if (operation !== run.current) return;
			if (!signedIn?.signed_in)
				throw new Error(
					readDangerousFeatures().error ??
						signedIn?.error ??
						"Sign-in failed. Try again.",
				);
			const rows = await discoverDangerousProfiles(signedIn.account_id);
			if (operation === run.current)
				setDiscovery({ accountId: signedIn.account_id, rows });
		} catch (cause) {
			if (operation === run.current)
				setError(
					cause instanceof Error
						? cause.message
						: "Could not find player profiles.",
				);
		} finally {
			if (operation === run.current) setPending(false);
		}
	}
	async function add(serverId: string) {
		if (!discovery) return;
		setPending(true);
		setError(null);
		try {
			const result = await addDangerousProfile(discovery.accountId, serverId);
			if (!result)
				throw new Error(
					readDangerousFeatures().error ?? "Could not add this player profile.",
				);
			await refreshAccount();
			close();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Could not add this player profile.",
			);
		} finally {
			setPending(false);
		}
	}
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) close();
			}}
		>
			<DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>
						{discovery ? "Choose your player profile" : "Add player profile"}
					</DialogTitle>
					<DialogDescription>
						{discovery
							? "Choose the server you play on. This profile will use the signed-in account whenever you connect."
							: "Sign in to find your existing players across the official servers."}
					</DialogDescription>
				</DialogHeader>
				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				{discovery ? (
					<div className="flex flex-col gap-3">
						{discovery.rows.map((row) => {
							const profileId = row.player
								? `${row.server.id}-${row.player.playerId}`
								: null;
							const alreadyAdded =
								profileId &&
								status?.profile_accounts[profileId] === discovery.accountId;
							return (
								<Card key={row.server.id}>
									<CardHeader>
										<div className="flex items-center justify-between gap-3">
											<CardTitle>{row.server.name}</CardTitle>
											<Badge variant="outline">{row.server.region}</Badge>
										</div>
										<CardDescription>
											{row.error
												? "Could not check this server"
												: row.player
													? row.player.name
													: "No player on this server"}
										</CardDescription>
									</CardHeader>
									{(row.player || row.error) && (
										<CardContent className="flex flex-wrap items-center justify-between gap-3">
											{row.player ? (
												<>
													<p className="text-sm tabular-nums">
														Union level {row.player.level} · UID{" "}
														{row.player.playerId}
													</p>
													<Button
														disabled={pending || Boolean(alreadyAdded)}
														onClick={() => void add(row.server.id)}
													>
														<HugeiconsIcon
															icon={Add01Icon}
															data-icon="inline-start"
														/>
														{alreadyAdded ? "Already added" : "Add profile"}
													</Button>
												</>
											) : (
												<p className="text-sm text-destructive">{row.error}</p>
											)}
										</CardContent>
									)}
								</Card>
							);
						})}
					</div>
				) : (
					<form
						id="add-player-profile"
						onSubmit={(event) => void findProfiles(event)}
					>
						<FieldGroup>
							{accounts.length > 0 && (
								<Field>
									<FieldLabel htmlFor="profile-login-account">
										Game account
									</FieldLabel>
									<Select
										value={choice}
										disabled={pending}
										items={[
											...accounts.map((a) => ({ value: a.id, label: a.email })),
											{ value: "new", label: "Sign in to another account" },
										]}
										onValueChange={(value) => {
											if (value) {
												setChoice(value);
												setEmail(
													accounts.find((a) => a.id === value)?.email ?? "",
												);
												setPassword("");
												setError(null);
											}
										}}
									>
										<SelectTrigger
											id="profile-login-account"
											className="w-full"
										>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectGroup>
												{accounts.map((a) => (
													<SelectItem key={a.id} value={a.id}>
														{a.email}
													</SelectItem>
												))}
												<SelectItem value="new">
													Sign in to another account
												</SelectItem>
											</SelectGroup>
										</SelectContent>
									</Select>
								</Field>
							)}
							{!savedSignIn && (
								<>
									<Field>
										<FieldLabel htmlFor="profile-login-email">
											Kuro account email
										</FieldLabel>
										<Input
											id="profile-login-email"
											type="email"
											autoComplete="username"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											disabled={pending}
											required
										/>
									</Field>
									<Field>
										<FieldLabel htmlFor="profile-login-password">
											Password
										</FieldLabel>
										<Input
											id="profile-login-password"
											type="password"
											autoComplete="current-password"
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											disabled={pending}
											required
										/>
										<FieldDescription>
											Your password is never saved. Sign-in is kept in your OS
											credential store.
										</FieldDescription>
									</Field>
								</>
							)}
							<p className="text-xs text-muted-foreground">
								Checking existing players can briefly sign you out of another
								game session. Empty servers are left untouched.
							</p>
						</FieldGroup>
					</form>
				)}
				<DialogFooter>
					<Button variant="outline" onClick={close}>
						{pending ? "Cancel" : "Close"}
					</Button>
					{discovery ? (
						<Button
							variant="outline"
							disabled={pending}
							onClick={() => {
								setDiscovery(null);
								setError(null);
							}}
						>
							Back to account
						</Button>
					) : (
						<Button type="submit" form="add-player-profile" disabled={pending}>
							<HugeiconsIcon
								icon={pending ? Loading03Icon : Login01Icon}
								data-icon="inline-start"
								className={pending ? "animate-spin" : undefined}
							/>
							{pending
								? status?.phase === "discovering"
									? "Checking servers…"
									: "Signing in…"
								: "Find player profiles"}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function ManagePlayerProfilesDialog({
	onClose,
}: {
	onClose: () => void;
}) {
	const { status } = useDangerousFeatures();
	const { profiles } = useAccount();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const linked = profiles.filter(
		(profile) =>
			profile.playerId > 0 &&
			status?.profile_accounts[profile.id] === status?.account_id,
	);
	async function remove(profileId: string) {
		setPending(true);
		setError(null);
		try {
			const result = await removeDangerousProfile(profileId);
			if (!result)
				throw new Error(
					readDangerousFeatures().error ?? "Could not remove this profile.",
				);
			await refreshAccount();
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "Could not remove this profile.",
			);
		} finally {
			setPending(false);
		}
	}
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent className="flex max-h-[85dvh] flex-col sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Manage player profiles</DialogTitle>
					<DialogDescription>
						{status?.email}. Removing a profile keeps its map progress and
						cached data for when you add it again.
					</DialogDescription>
				</DialogHeader>
				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				{linked.length ? (
					<VirtualGrid
						items={linked}
						columns={1}
						gap={12}
						estimateRowHeight={100}
						className="h-80 min-h-0"
						getItemKey={(profile) => profile.id}
						renderItem={(profile) => (
							<Card>
								<CardContent className="flex items-center justify-between gap-4">
									<div className="flex min-w-0 flex-col gap-1">
										<p className="truncate text-sm font-medium">
											{profile.name || "Player"} · {profile.region}
										</p>
										<p className="text-xs text-muted-foreground tabular-nums">
											Union level {profile.level || "—"} · UID{" "}
											{profile.playerId}
										</p>
									</div>
									<Button
										variant="outline"
										disabled={pending}
										onClick={() => void remove(profile.id)}
									>
										Remove
									</Button>
								</CardContent>
							</Card>
						)}
					/>
				) : (
					<Empty>
						<EmptyHeader>
							<EmptyTitle>No player profiles</EmptyTitle>
							<EmptyDescription>
								Add a player profile to this account to connect to it.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				)}
				<DialogFooter>
					{status?.signed_in && (
						<Button
							variant="outline"
							disabled={pending}
							onClick={() => void signOutDangerous()}
						>
							Sign out of account
						</Button>
					)}
					<Button onClick={onClose}>Done</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
