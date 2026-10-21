import { CircleCheck, Download, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	checkForUpdate,
	currentVersion,
	downloadPercent,
	installAvailableUpdate,
	setAvailableUpdate,
	updaterSupported,
	useUpdateState,
} from "@/lib/updater";

/**
 * Update checker: shows the installed version, checks the release manifest on
 * demand and downloads/installs a newer release in place.
 *
 * The release itself comes from the shared updater store (the startup check can
 * find one before this card is ever opened); only the check/error bookkeeping
 * is local to the card.
 */
export function UpdatesCard() {
	const { update, installing, progress } = useUpdateState();
	const [version, setVersion] = useState<string | null>(null);
	const [checking, setChecking] = useState(false);
	const [checked, setChecked] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		void currentVersion().then(setVersion);
	}, []);

	const check = useCallback(async () => {
		setChecking(true);
		setError(null);
		try {
			const next = await checkForUpdate();
			setAvailableUpdate(next);
			setChecked(true);
		} catch (checkError) {
			console.error("[updater] update check failed:", checkError);
			setError("Couldn't check for updates - try again later.");
		} finally {
			setChecking(false);
		}
	}, []);

	const install = useCallback(async () => {
		setError(null);
		try {
			// The app relaunches into the new build; on Windows the installer
			// may exit it first, so this promise never resolves on success.
			await installAvailableUpdate();
		} catch {
			setError("Couldn't install the update - try again later.");
		}
	}, []);

	const percent = downloadPercent(progress);
	const upToDate = checked && !update;

	// One line of state for the card: a running download wins, then a check in
	// flight, then whatever the last check found.
	let statusText = "Check for a newer release.";
	if (installing) {
		statusText =
			percent === null
				? "Downloading the update…"
				: `Downloading the update… ${percent}%`;
	} else if (checking) {
		statusText = "Checking for updates…";
	} else if (error) {
		statusText = error;
	} else if (update) {
		statusText = `Version ${update.version} is ready to install.`;
	} else if (upToDate) {
		statusText = "You're on the latest version.";
	}

	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="space-y-0.5">
					<Label className="flex items-center gap-2 text-base font-medium">
						<RefreshCw className="size-4" /> Updates
					</Label>
					<p className="text-xs text-muted-foreground">
						{updaterSupported()
							? "Mornye Tools updates itself from its GitHub releases."
							: "Update checks run in the installed desktop app."}
					</p>
				</div>

				<div className="flex items-center justify-between gap-4">
					<div className="min-w-0 space-y-0.5">
						<p className="text-sm font-medium">
							App version{version ? ` — v${version}` : ""}
						</p>
						<p className="text-xs text-muted-foreground">{statusText}</p>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						{update && !installing && (
							<Button onClick={() => void install()}>
								<Download /> Install and restart
							</Button>
						)}
						<Button
							variant="outline"
							disabled={checking || installing || !updaterSupported()}
							onClick={() => void check()}
						>
							{checking ? (
								<Loader2 className="animate-spin" />
							) : upToDate ? (
								<CircleCheck />
							) : (
								<RefreshCw />
							)}
							{checking ? "Checking" : upToDate ? "Up to date" : "Check"}
						</Button>
					</div>
				</div>

				{update && !installing && (
					<div className="space-y-2 rounded-md bg-muted/50 p-3">
						<div className="flex items-baseline justify-between gap-4">
							<p className="text-sm font-medium">
								Mornye Tools {update.version}
							</p>
							{update.date && (
								<p className="text-xs text-muted-foreground">
									Released {new Date(update.date).toLocaleDateString()}
								</p>
							)}
						</div>
						{update.body && (
							<pre className="max-h-40 overflow-y-auto whitespace-pre-wrap font-sans text-[11px] text-muted-foreground">
								{update.body}
							</pre>
						)}
					</div>
				)}

				{installing && (
					<div className="space-y-2 rounded-md bg-muted/50 p-3">
						<div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
							<div
								className="h-full rounded-full bg-primary transition-[width] duration-200"
								style={{ width: `${percent ?? 5}%` }}
							/>
						</div>
						<p className="text-xs text-muted-foreground">
							The app will restart when the update is ready.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
