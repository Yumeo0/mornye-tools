// Settings "Export" section: pick which parts of the captured account go into
// the export, then copy the single JSON document to the clipboard or save it
// as a file. The documents themselves are built by `lib/accountExport`.

import { ClipboardCopy, Download, FileJson } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAccount } from "@/lib/account";
import {
	accountExportJson,
	downloadTextFile,
	EXPORT_PART_DESCRIPTIONS,
	EXPORT_PART_LABELS,
	EXPORT_PARTS,
	type ExportPart,
	exportFileName,
	exportPartCount,
} from "@/lib/accountExport";
import { useManualMapMarks } from "@/lib/map/manual";

/** How long a copy/save confirmation stays on screen. */
const STATUS_TIMEOUT_MS = 2400;

type ExportSelection = Record<ExportPart, boolean>;

/** All three types on; the user deselects what should stay out. */
const ALL_PARTS_SELECTED: ExportSelection = {
	resonators: true,
	weapons: true,
	echoes: true,
	map: true,
};

function entryCountLabel(count: number): string {
	return `${count} ${count === 1 ? "entry" : "entries"}`;
}

/** Account export: type selection plus clipboard/file output. */
export function ExportCard() {
	const { snapshot, error } = useAccount();
	const manual = useManualMapMarks(
		snapshot.profile?.playerId ?? snapshot.player?.playerId ?? 0,
	);
	const [selection, setSelection] =
		useState<ExportSelection>(ALL_PARTS_SELECTED);
	const [status, setStatus] = useState<string | null>(null);
	const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const selectedParts = useMemo(
		() => EXPORT_PARTS.filter((part) => selection[part]),
		[selection],
	);
	const selectedLabel = selectedParts
		.map((part) => EXPORT_PART_LABELS[part])
		.join(", ");

	const showStatus = useCallback((message: string) => {
		setStatus(message);
		if (statusTimer.current) clearTimeout(statusTimer.current);
		statusTimer.current = setTimeout(() => setStatus(null), STATUS_TIMEOUT_MS);
	}, []);

	useEffect(
		() => () => {
			if (statusTimer.current) clearTimeout(statusTimer.current);
		},
		[],
	);

	const copyJson = useCallback(async () => {
		try {
			const json = accountExportJson(
				snapshot,
				selectedParts,
				new Date(),
				manual.marks,
			);
			await navigator.clipboard.writeText(json);
			showStatus(`Copied ${selectedLabel} JSON to clipboard`);
		} catch (copyError) {
			console.error("Export copy failed:", copyError);
			showStatus(`Copy failed: ${String(copyError)}`);
		}
	}, [snapshot, selectedParts, selectedLabel, showStatus, manual.marks]);

	const saveJson = useCallback(() => {
		try {
			const fileName = exportFileName();
			downloadTextFile(
				fileName,
				accountExportJson(snapshot, selectedParts, new Date(), manual.marks),
			);
			showStatus(`Saved ${fileName}`);
		} catch (saveError) {
			console.error("Export save failed:", saveError);
			showStatus(`Save failed: ${String(saveError)}`);
		}
	}, [snapshot, selectedParts, showStatus, manual.marks]);

	const nothingSelected = selectedParts.length === 0;
	const mapUnavailable =
		selection.map && (!manual.ready || Boolean(manual.error));

	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="space-y-0.5">
					<Label className="flex items-center gap-2 text-base font-medium">
						<FileJson className="size-4" /> Export account data
					</Label>
					{snapshot.profile && (
						<p className="text-xs text-muted-foreground">
							{snapshot.player?.name || "Player"} · {snapshot.profile.playerId}{" "}
							· {snapshot.profile.region}. Export each player profile separately
							using the sidebar selector.
						</p>
					)}
				</div>

				<div className="space-y-2">
					{EXPORT_PARTS.map((part) => (
						<div key={part} className="flex items-center justify-between gap-4">
							<div className="space-y-0.5">
								<Label htmlFor={`export-part-${part}`}>
									{EXPORT_PART_LABELS[part]}
								</Label>
								<p className="text-xs text-muted-foreground">
									{EXPORT_PART_DESCRIPTIONS[part]}
								</p>
							</div>
							<div className="flex items-center gap-3">
								<span className="text-xs text-muted-foreground tabular-nums">
									{part === "map" && !manual.ready
										? "Loading…"
										: entryCountLabel(
												exportPartCount(snapshot, part, manual.marks),
											)}
								</span>
								<Switch
									id={`export-part-${part}`}
									checked={selection[part]}
									onCheckedChange={(checked) =>
										setSelection((previous) => ({
											...previous,
											[part]: checked,
										}))
									}
								/>
							</div>
						</div>
					))}
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<Button
						size="sm"
						onClick={() => void copyJson()}
						disabled={nothingSelected || mapUnavailable}
					>
						<ClipboardCopy /> Copy JSON
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={saveJson}
						disabled={nothingSelected || mapUnavailable}
					>
						<Download /> Save file
					</Button>
					{status && (
						<span className="text-xs text-muted-foreground">{status}</span>
					)}
				</div>

				{nothingSelected && (
					<p className="text-xs text-muted-foreground">
						Select at least one type to export.
					</p>
				)}

				{error && (
					<p className="text-xs text-destructive">
						Account data may be stale: {error}
					</p>
				)}
				{selection.map && manual.error && (
					<p role="alert" className="text-xs text-destructive">
						{manual.error}. Map export is blocked until all marks can be read.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
