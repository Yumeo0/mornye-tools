import { isTauri } from "@tauri-apps/api/core";
import { type FormEvent, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { identifyAccountProfile, type ProfileIdentity } from "@/lib/account";

export function AccountProfileIdentifyDialog({
	profile,
	onClose,
	initialName,
}: {
	profile: ProfileIdentity;
	onClose: () => void;
	initialName: string;
}) {
	const lockedPlayerId = profile.playerId > 0;
	const [playerId, setPlayerId] = useState(
		lockedPlayerId ? String(profile.playerId) : "",
	);
	const [region, setRegion] = useState(
		/^(local|unknown|region not identified)$/i.test(profile.region.trim())
			? ""
			: profile.region.trim(),
	);
	const [name, setName] = useState(initialName);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const parsed = Number(playerId);
		if (!Number.isSafeInteger(parsed) || parsed <= 0) {
			setError("Enter a positive player ID.");
			return;
		}
		if (!region.trim()) {
			setError("Enter the server or region for this profile.");
			return;
		}
		setPending(true);
		setError(null);
		try {
			await identifyAccountProfile({
				profileId: profile.id,
				playerId: parsed,
				region: region.trim(),
				name: name.trim(),
			});
			onClose();
		} catch (cause) {
			setError(
				typeof cause === "string" ? cause : "Could not save this profile.",
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
			<DialogContent className="sm:max-w-lg">
				<form
					onSubmit={(event) => void submit(event)}
					className="flex flex-col gap-4"
				>
					<DialogHeader>
						<DialogTitle>Identify account profile</DialogTitle>
						<DialogDescription>
							The player UID identifies this account. Add an optional display
							name and its server or region for your reference.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="identify-player-name">
								Player name
							</FieldLabel>
							<Input
								id="identify-player-name"
								value={name}
								maxLength={64}
								placeholder="Rover"
								autoComplete="off"
								onChange={(event) => setName(event.target.value)}
								disabled={pending}
							/>
							<FieldDescription>
								Optional. Shown in the profile selector.
							</FieldDescription>
						</Field>
						<Field>
							<FieldLabel htmlFor="identify-player-id">Player ID</FieldLabel>
							<Input
								id="identify-player-id"
								type="number"
								min={1}
								inputMode="numeric"
								value={playerId}
								onChange={(event) => setPlayerId(event.target.value)}
								disabled={pending || lockedPlayerId}
								required
							/>
							<FieldDescription>
								{lockedPlayerId
									? "Captured from the game."
									: "The numeric ID from the game account."}
							</FieldDescription>
						</Field>
						<Field>
							<FieldLabel htmlFor="identify-region">
								Server or region
							</FieldLabel>
							<Input
								id="identify-region"
								value={region}
								maxLength={64}
								placeholder="Asia"
								autoComplete="off"
								onChange={(event) => setRegion(event.target.value)}
								disabled={pending}
								required
							/>
							<FieldDescription>
								For example Asia, America, Europe, SEA or your server name. A
								later game connection replaces this with the official server ID.
							</FieldDescription>
						</Field>
					</FieldGroup>
					{error && (
						<Alert variant="destructive">
							<AlertTitle>Could not save profile</AlertTitle>
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={pending}
							onClick={onClose}
						>
							Not now
						</Button>
						<Button type="submit" disabled={pending || !isTauri()}>
							{pending ? "Saving…" : "Save profile"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
