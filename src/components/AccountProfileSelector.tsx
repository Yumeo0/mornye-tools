import { Settings02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { isTauri } from "@tauri-apps/api/core";
import { useState } from "react";
import { ManagePlayerProfilesDialog } from "@/components/settings/PlayerProfilesDialog";
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
import { profileLabel } from "@/lib/profileOverview";

export function AccountProfileSelector({ compact }: { compact: boolean }) {
	const { snapshot, profiles, error: accountError } = useAccount();
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [manageOpen, setManageOpen] = useState(false);
	const profile = snapshot.profile;
	const items = profiles.map((profile, index) => ({
		value: profile.id,
		label: profileLabel(profile, index),
	}));

	return (
		<>
			<Field className="min-w-0 shrink-0 gap-1">
				<FieldLabel
					htmlFor="account-profile"
					className={compact ? "sr-only" : "text-xs text-muted-foreground"}
				>
					Account profile
				</FieldLabel>
				<div
					className={
						compact
							? "flex min-w-0 flex-col items-stretch gap-1"
							: "flex min-w-0 items-center gap-1"
					}
				>
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
					<Button
						type="button"
						variant="outline"
						size="icon-sm"
						className={compact ? "w-full" : "shrink-0"}
						disabled={pending || !isTauri()}
						aria-label="Manage player profiles"
						title="Manage player profiles"
						onClick={() => setManageOpen(true)}
					>
						<HugeiconsIcon icon={Settings02Icon} />
					</Button>
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
			{manageOpen && (
				<ManagePlayerProfilesDialog onClose={() => setManageOpen(false)} />
			)}
		</>
	);
}
