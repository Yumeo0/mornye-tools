import { ArrowUpRight01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { lazy, Suspense, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { preferredReleaseNotes } from "@/lib/changelog";
import {
	loadReleaseNotes,
	type ReleaseNotes,
	releaseNotesUrl,
} from "@/lib/releaseNotes";

const ChangelogContent = lazy(() =>
	import("@/components/ChangelogContent").then((module) => ({
		default: module.ChangelogContent,
	})),
);

type NotesState =
	| { status: "loading" }
	| { status: "ready"; notes: ReleaseNotes }
	| { status: "error" };

/** The same release viewer is available before installing and after a restart. */
export function ChangelogDialog({
	release,
	label = "View changelog",
	size = "default",
}: {
	release: ReleaseNotes;
	label?: string;
	size?: "default" | "sm";
}) {
	const { version, body, date } = preferredReleaseNotes(release);
	const [open, setOpen] = useState(false);
	const [state, setState] = useState<NotesState>({ status: "loading" });
	const [attempt, setAttempt] = useState(0);
	const [linkError, setLinkError] = useState(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: Retrying must reload the same release.
	useEffect(() => {
		if (!open) return;
		let active = true;
		setLinkError(false);
		if (body?.trim()) {
			setState({ status: "ready", notes: { version, body, date } });
			return;
		}
		setState({ status: "loading" });
		void loadReleaseNotes(version).then(
			(notes) => {
				if (active) setState({ status: "ready", notes });
			},
			() => {
				if (active) setState({ status: "error" });
			},
		);
		return () => {
			active = false;
		};
	}, [open, version, body, date, attempt]);

	const published = state.status === "ready" ? state.notes.date : undefined;
	// A changelog's calendar date should not shift to the previous day in western timezones.
	const publishedDate = published
		? new Date(
				/^\d{4}-\d{2}-\d{2}$/.test(published)
					? `${published}T00:00:00`
					: published,
			)
		: null;
	const released =
		publishedDate && Number.isFinite(publishedDate.getTime())
			? publishedDate.toLocaleDateString(undefined, {
					day: "numeric",
					month: "long",
					year: "numeric",
				})
			: null;
	async function openRelease() {
		setLinkError(false);
		const url = releaseNotesUrl(version);
		try {
			if (isTauri()) await openUrl(url);
			else window.open(url, "_blank", "noopener,noreferrer");
		} catch {
			setLinkError(true);
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger render={<Button variant="outline" size={size} />}>
				{label}
			</DialogTrigger>
			<DialogContent className="flex max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
				<DialogHeader className="gap-2 border-b px-6 py-5 pr-10">
					<Badge variant="outline">Version {version}</Badge>
					<DialogTitle>What's new in Mornye Tools</DialogTitle>
					<DialogDescription>
						{released ? `Released ${released}` : "What's new in this version."}
					</DialogDescription>
				</DialogHeader>
				<div className="min-h-0 overflow-y-auto px-6 py-5">
					{state.status === "loading" ? (
						<p role="status" className="flex items-center gap-2 py-6">
							<HugeiconsIcon
								icon={Loading03Icon}
								className="size-4 animate-spin"
							/>
							Loading changelog…
						</p>
					) : state.status === "error" ? (
						<div className="flex flex-col items-start gap-3">
							<Alert variant="destructive">
								<AlertDescription>
									Couldn't load the changelog. Check your connection and try
									again.
								</AlertDescription>
							</Alert>
							<Button
								variant="outline"
								onClick={() => setAttempt((n) => n + 1)}
							>
								Try again
							</Button>
						</div>
					) : state.notes.body?.trim() ? (
						<Suspense fallback={<p role="status">Loading changelog…</p>}>
							<ChangelogContent body={state.notes.body} />
						</Suspense>
					) : (
						<p>No changelog has been published for this version.</p>
					)}
				</div>
				{linkError && (
					<Alert variant="destructive">
						<AlertDescription>
							Couldn't open the release in your browser.
						</AlertDescription>
					</Alert>
				)}
				<DialogFooter className="border-t px-6 py-4" showCloseButton>
					<Button variant="outline" onClick={() => void openRelease()}>
						<HugeiconsIcon icon={ArrowUpRight01Icon} data-icon="inline-start" />
						View on GitHub
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
