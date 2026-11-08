import { isTauri } from "@tauri-apps/api/core";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { AccountProfileIdentifyDialog } from "@/components/AccountProfileIdentifyDialog";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { selectAccountProfile, useAccount } from "@/lib/account";
import { hasAccountData, profileLabel } from "@/lib/profileOverview";

const DISMISSED_KEY = "mornye-identify-dismissed-profiles";

function readDismissed(): string[] {
	try {
		const value: unknown = JSON.parse(
			localStorage.getItem(DISMISSED_KEY) ?? "[]",
		);
		return Array.isArray(value)
			? value.filter((item): item is string => typeof item === "string")
			: [];
	} catch {
		return [];
	}
}

export function AccountProfileSelector({ compact }: { compact: boolean }) {
	const { snapshot, profiles, error: accountError } = useAccount();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [identifyId, setIdentifyId] = useState<string | null>(null);
	const [dismissed, setDismissed] = useState<string[]>(readDismissed);
	const profile = snapshot.profile;
	const unidentified = profile?.serverId === "unknown";
	const identifyOpen =
		unidentified &&
		profile &&
		(identifyId === profile.id ||
			(isTauri() &&
				hasAccountData(snapshot) &&
				!dismissed.includes(profile.id)));
	const items = profiles.map((profile, index) => ({
		value: profile.id,
		label: profileLabel(profile, index),
	}));

	function dismissIdentify() {
		setIdentifyId(null);
		if (!profile || dismissed.includes(profile.id)) return;
		const next = [...dismissed, profile.id];
		setDismissed(next);
		try {
			localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
		} catch {
			// Keep the dismissal for this run if storage is unavailable.
		}
	}

	return (
		<>
			<Field className="min-w-0 shrink-0 gap-1">
				<FieldLabel
					htmlFor="account-profile"
					className={compact ? "sr-only" : "text-xs text-muted-foreground"}
				>
					Account profile
				</FieldLabel>
				<div className="flex min-w-0 items-center gap-1">
					<Select
						value={profile?.id ?? null}
						items={items}
						disabled={!isTauri() || pending || !profiles.length}
						onValueChange={(value) => {
							if (!value) return;
							setPending(true);
							setError(null);
							void selectAccountProfile(value)
								.catch((cause) => setError(String(cause)))
								.finally(() => setPending(false));
						}}
					>
						<SelectTrigger
							id="account-profile"
							className={
								compact
									? "w-full min-w-0 justify-center overflow-hidden px-1 [&>svg:last-child]:hidden"
									: "w-full min-w-0 overflow-hidden"
							}
							title={items.find((item) => item.value === profile?.id)?.label}
							aria-label="Account profile"
						>
							{compact ? (
								<span aria-hidden="true">
									{snapshot.player?.name?.slice(0, 1) || "P"}
								</span>
							) : (
								<SelectValue
									className="min-w-0 truncate"
									placeholder="No account captured"
								/>
							)}
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{items.map((item) => (
									<SelectItem key={item.value} value={item.value}>
										{item.label}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
					{!compact && unidentified && (
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							className="shrink-0"
							disabled={pending || !isTauri()}
							aria-label="Identify account profile"
							title="Identify account profile"
							onClick={() => setIdentifyId(profile.id)}
						>
							<Pencil />
						</Button>
					)}
				</div>
				{(error || accountError) && (
					<p
						role="status"
						className={compact ? "sr-only" : "text-xs text-destructive"}
					>
						{error || accountError}
					</p>
				)}
			</Field>
			{identifyOpen && (
				<AccountProfileIdentifyDialog
					key={profile.id}
					profile={profile}
					initialName={snapshot.player?.name ?? ""}
					onClose={dismissIdentify}
				/>
			)}
		</>
	);
}
