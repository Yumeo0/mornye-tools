import { Download, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	dismissUpdateBanner,
	downloadPercent,
	installAvailableUpdate,
	useUpdateState,
} from "@/lib/updater";

/**
 * Startup notice for a newer release: a dismissible card in the bottom-right
 * corner that downloads, installs and relaunches into the update. Details and
 * a retry live in Settings -> Updates; this is only the nudge.
 */
export function UpdateBanner() {
	const { update, dismissed, installing, progress } = useUpdateState();
	const [failed, setFailed] = useState(false);

	if (!update || dismissed) return null;

	const percent = downloadPercent(progress);

	const install = async () => {
		setFailed(false);
		try {
			// The app relaunches into the new build; on Windows the installer
			// may exit it first, so this promise never resolves on success.
			await installAvailableUpdate();
		} catch {
			setFailed(true);
		}
	};

	const detail = failed
		? "Couldn't install the update - retry from Settings."
		: installing
			? percent === null
				? "Downloading the update…"
				: `Downloading the update… ${percent}%`
			: "Install it now and the app restarts into the new build.";

	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-end px-4">
			<Card className="pointer-events-auto w-80 shadow-lg">
				<CardContent className="space-y-3">
					<div className="flex items-start justify-between gap-2">
						<div className="min-w-0 space-y-0.5">
							<p className="text-sm font-medium">
								Mornye Tools {update.version} is available
							</p>
							<p className="text-xs text-muted-foreground">{detail}</p>
						</div>
						<Button
							variant="ghost"
							size="icon-xs"
							title="Dismiss"
							disabled={installing}
							onClick={dismissUpdateBanner}
						>
							<X />
						</Button>
					</div>

					{installing ? (
						<div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
							<div
								className="h-full rounded-full bg-primary transition-[width] duration-200"
								style={{ width: `${percent ?? 5}%` }}
							/>
						</div>
					) : (
						<Button className="w-full" onClick={() => void install()}>
							<Download /> Install and restart
						</Button>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
