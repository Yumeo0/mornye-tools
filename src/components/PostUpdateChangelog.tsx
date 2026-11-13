import { useEffect, useState } from "react";
import { ChangelogDialog } from "@/components/ChangelogDialog";
import { updateChangelog } from "@/lib/updateChangelog";
import { currentVersion, updaterSupported } from "@/lib/updater";

/** Only the main window announces a newly installed release, once dismissed. */
export function PostUpdateChangelog() {
	const [version, setVersion] = useState<string | null>(null);
	useEffect(() => {
		if (!import.meta.env.PROD || !updaterSupported()) return;
		let active = true;
		void currentVersion()
			.then((installed) =>
				installed ? updateChangelog.pending(installed) : null,
			)
			.then((pending) => {
				if (active) setVersion(pending);
			})
			.catch((error) => {
				console.warn("[updater] couldn't check the startup changelog:", error);
			});
		return () => {
			active = false;
		};
	}, []);

	if (!version) return null;
	return (
		<ChangelogDialog
			release={{ version }}
			open
			onOpenChange={(open) => {
				if (open) return;
				setVersion(null);
				void updateChangelog.acknowledge(version).catch((error) => {
					console.warn(
						"[updater] couldn't dismiss the startup changelog:",
						error,
					);
				});
			}}
		/>
	);
}
