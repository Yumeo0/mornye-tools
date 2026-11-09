import {
	Add01Icon,
	Alert02Icon,
	Loading03Icon,
	PlugSocketIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { isTauri } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
	AddPlayerProfileDialog,
	ManagePlayerProfilesDialog,
} from "@/components/settings/PlayerProfilesDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
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
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAccount } from "@/lib/account";
import {
	connectDangerous,
	connectionAction,
	disconnectDangerous,
	refreshDangerousStatus,
	selectDangerousAccount,
	selectLinkedDangerousAccount,
	setDangerousEnabled,
	useDangerousFeatures,
} from "@/lib/dangerous";

const NOTICE =
	"Dangerous Features interact directly with your game account and can join the game world. The developer believes these features should be compatible with the terms of service, but this has not been verified or approved by Kuro Games. Use them at your own discretion.";

export function DangerousFeaturesPrompt() {
	const { status, error } = useDangerousFeatures();
	const [saving, setSaving] = useState(false);
	async function decide(enabled: boolean) {
		setSaving(true);
		try {
			await setDangerousEnabled(enabled);
		} finally {
			setSaving(false);
		}
	}
	return (
		<Dialog
			open={Boolean(status && !status.asked)}
			onOpenChange={() => {
				/* Choose one of the explicit options. */
			}}
		>
			<DialogContent showCloseButton={false} className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Activate Dangerous Features?</DialogTitle>
					<DialogDescription>{NOTICE}</DialogDescription>
				</DialogHeader>
				<p className="text-sm text-muted-foreground">
					This is optional. You can change your choice at any time in Settings →
					Dangerous Features. Enabling it does not log in or connect
					automatically.
				</p>
				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}
				<DialogFooter>
					<Button
						variant="outline"
						disabled={saving}
						onClick={() => void decide(false)}
					>
						Keep disabled
					</Button>
					<Button disabled={saving} onClick={() => void decide(true)}>
						Activate Dangerous Features
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function DangerousFeaturesCard() {
	const { status, error } = useDangerousFeatures();
	const { profiles } = useAccount();
	const [dialog, setDialog] = useState<"add" | "manage" | null>(null);
	const [pending, setPending] = useState(false);
	const busy =
		pending ||
		Boolean(status && !["ready", "signed_out"].includes(status.phase));
	async function select(id: string) {
		setPending(true);
		try {
			await selectDangerousAccount(id);
		} finally {
			setPending(false);
		}
	}
	if (!status)
		return (
			<Card>
				<CardHeader>
					<CardTitle>Dangerous Features</CardTitle>
					<CardDescription>
						{error ?? "Loading your saved choice…"}
					</CardDescription>
				</CardHeader>
				<CardFooter>
					<Button
						variant="outline"
						onClick={() => void refreshDangerousStatus()}
					>
						Retry
					</Button>
				</CardFooter>
			</Card>
		);
	const accounts = status.accounts;
	return (
		<>
			<Card className="max-w-3xl">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HugeiconsIcon icon={Alert02Icon} />
						Dangerous Features
						<Badge variant={status.enabled ? "outline" : "secondary"}>
							{status.enabled ? "Enabled" : "Disabled"}
						</Badge>
					</CardTitle>
					<CardDescription>
						Manage the player profiles you connect to from Mornye Tools.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-5">
					<Field orientation="horizontal">
						<div className="flex flex-1 flex-col gap-1">
							<FieldLabel htmlFor="dangerous-enabled">
								Enable Dangerous Features
							</FieldLabel>
							<FieldDescription>
								Disabling disconnects and signs out all saved accounts.
							</FieldDescription>
						</div>
						<Switch
							id="dangerous-enabled"
							checked={status.enabled}
							onCheckedChange={(value) => void setDangerousEnabled(value)}
						/>
					</Field>
					<Alert>
						<HugeiconsIcon icon={Alert02Icon} />
						<AlertTitle>Direct account access</AlertTitle>
						<AlertDescription>{NOTICE}</AlertDescription>
					</Alert>
					{status.enabled && (
						<>
							<Field>
								<FieldLabel htmlFor="dangerous-account">
									Game account
								</FieldLabel>
								<Select
									value={
										accounts.some((a) => a.id === status.account_id)
											? status.account_id
											: null
									}
									disabled={busy || !accounts.length || !isTauri()}
									items={accounts.map((a) => ({ value: a.id, label: a.email }))}
									onValueChange={(value) => {
										if (value) void select(value);
									}}
								>
									<SelectTrigger id="dangerous-account" className="w-full">
										<SelectValue
											placeholder={
												accounts.length
													? "Choose an account"
													: "No accounts added yet"
											}
										/>
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{accounts.map((account) => (
												<SelectItem key={account.id} value={account.id}>
													{account.email}
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
								<FieldDescription>
									{accounts.length
										? "Connect uses the account belonging to the player profile selected in the sidebar."
										: "Add a player profile to sign in and choose your server."}
								</FieldDescription>
							</Field>
							<div className="flex flex-wrap gap-2">
								<Button
									disabled={busy || !isTauri()}
									onClick={() => setDialog("add")}
								>
									<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
									Add player profile
								</Button>
							</div>
							{!isTauri() && (
								<p className="text-xs text-muted-foreground">
									Player profiles are available in the desktop app.
								</p>
							)}
						</>
					)}
					<div>
						<Button
							variant="outline"
							disabled={
								busy || !profiles.some((p) => p.playerId > 0) || !isTauri()
							}
							onClick={() => setDialog("manage")}
						>
							Manage player profiles
						</Button>
					</div>
					{(error || status.error) && (
						<Alert variant="destructive">
							<AlertDescription>{error ?? status.error}</AlertDescription>
						</Alert>
					)}
				</CardContent>
			</Card>
			{dialog === "add" && (
				<AddPlayerProfileDialog onClose={() => setDialog(null)} />
			)}
			{dialog === "manage" && (
				<ManagePlayerProfilesDialog onClose={() => setDialog(null)} />
			)}
		</>
	);
}

export function DangerousConnectButton({
	compact,
	onConfigure,
}: {
	compact: boolean;
	onConfigure: () => void;
}) {
	const { status, error } = useDangerousFeatures();
	const { snapshot } = useAccount();
	const profileId = snapshot.profile?.id;
	const linkedAccountId = profileId && status?.profile_accounts[profileId];
	const enabled = status?.enabled;
	useEffect(() => {
		if (enabled && profileId && linkedAccountId)
			void selectLinkedDangerousAccount(profileId);
	}, [profileId, linkedAccountId, enabled]);
	useEffect(() => {
		if (error)
			toast.error("Account connection", {
				id: "account-connection-error",
				description: error,
			});
	}, [error]);
	useEffect(() => {
		if (status?.error)
			toast.error("Account connection", {
				id: "account-connection-error",
				description: status.error,
			});
	}, [status?.error]);
	if (!status?.enabled) return null;
	const action = connectionAction(status, snapshot.profile);
	const label =
		action === "disconnect"
			? "Disconnect"
			: action === "cancel"
				? "Cancel connection"
				: action === "wait"
					? status.phase === "authenticating"
						? "Signing in…"
						: status.phase === "discovering"
							? "Checking servers…"
							: "Disconnecting…"
					: "Connect";
	return (
		<div className="w-full min-w-0 shrink-0">
			<Button
				variant={action === "disconnect" ? "outline" : "default"}
				size={compact ? "icon-sm" : "sm"}
				title={
					status.error ??
					(action === "configure"
						? "Add or sign in to a player profile in Settings"
						: label)
				}
				aria-label={label}
				disabled={action === "wait" || !isTauri()}
				className="w-full"
				onClick={() => {
					if (action === "configure") {
						if (profileId) void selectLinkedDangerousAccount(profileId);
						onConfigure();
					} else if (action === "disconnect" || action === "cancel")
						void disconnectDangerous();
					else void connectDangerous();
				}}
			>
				<HugeiconsIcon
					icon={
						action === "wait" || action === "cancel"
							? Loading03Icon
							: PlugSocketIcon
					}
					data-icon="inline-start"
					className={
						action === "wait" || action === "cancel"
							? "animate-spin"
							: undefined
					}
				/>
				{!compact && label}
			</Button>
		</div>
	);
}
