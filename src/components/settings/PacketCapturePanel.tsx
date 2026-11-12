import { Download01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import {
	clearPacketRecording,
	exportPacketCapture,
	type RecordingStatus,
	setPacketRecording,
} from "@/lib/sniffer";

export function PacketCapturePanel({
	status,
	available,
}: {
	status: RecordingStatus | undefined;
	available: boolean;
}) {
	const id = useId();
	const [updated, setUpdated] = useState<RecordingStatus>();
	const [busy, setBusy] = useState<string | null>(null);
	const [savedPath, setSavedPath] = useState<string | null>(null);
	const recording =
		updated && (!status || updated.revision > status.revision)
			? updated
			: status;
	const active = recording?.recording ?? false;
	const hasFrames = (recording?.frames ?? 0) > 0;
	const disabled = !available || busy !== null;

	async function run(action: "record" | "clear" | "raw" | "parsed") {
		setBusy(action);
		try {
			if (action === "record") {
				setUpdated(await setPacketRecording(!active));
			} else if (action === "clear") {
				setUpdated(await clearPacketRecording());
				setSavedPath(null);
			} else {
				const result = await exportPacketCapture(action);
				setSavedPath(result.path);
				toast.success(
					`Saved ${result.frames.toLocaleString()} frames to Downloads`,
				);
			}
		} catch (error) {
			toast.error(String(error));
		} finally {
			setBusy(null);
		}
	}

	return (
		<FieldGroup>
			<Field>
				<FieldLabel>Packet recording</FieldLabel>
				<FieldDescription id={`${id}-help`}>
					Start before reconnecting the game to include login and the key
					exchange. Packets stay in memory until you clear the recording or
					close Mornye Tools.
				</FieldDescription>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						size="sm"
						variant={active ? "secondary" : "default"}
						disabled={disabled || (!active && recording?.limit_reached)}
						aria-pressed={active}
						aria-describedby={`${id}-help`}
						onClick={() => void run("record")}
					>
						{busy === "record"
							? "Updating…"
							: active
								? "Stop recording"
								: "Start recording"}
					</Button>
					<Button
						size="sm"
						variant="ghost"
						disabled={
							disabled || active || (!hasFrames && !recording?.limit_reached)
						}
						onClick={() => void run("clear")}
					>
						Clear recording
					</Button>
				</div>
				<p role="status" className="text-xs text-muted-foreground tabular-nums">
					{recording?.limit_reached
						? "Limit reached · "
						: active
							? "Recording · "
							: "Stopped · "}
					{(recording?.frames ?? 0).toLocaleString()} frames ·{" "}
					{(recording?.packets ?? 0).toLocaleString()} decoded packets ·{" "}
					{((recording?.stored_bytes ?? 0) / 1024 / 1024).toFixed(1)} MiB
				</p>
				<FieldDescription>
					Stops at{" "}
					{Math.round((recording?.max_bytes ?? 64 * 1024 * 1024) / 1024 / 1024)}{" "}
					MiB or {(recording?.max_frames ?? 50_000).toLocaleString()} frames to
					preserve the start of the capture.
					{recording?.limit_reached &&
						" Export and clear the recording to start again."}
				</FieldDescription>
			</Field>
			<Field>
				<FieldLabel>Export capture</FieldLabel>
				<FieldDescription>
					Raw PCAP keeps network frames, including packets that could not be
					decrypted. Parsed JSON includes message fields, payload bytes, decode
					errors, and the pinned protocol version.
				</FieldDescription>
				<div className="flex flex-wrap items-center gap-2">
					<Button
						size="sm"
						variant="outline"
						disabled={disabled || !hasFrames}
						onClick={() => void run("raw")}
					>
						<HugeiconsIcon icon={Download01Icon} data-icon="inline-start" />
						{busy === "raw" ? "Exporting…" : "Export raw (.pcap)"}
					</Button>
					<Button
						size="sm"
						variant="outline"
						disabled={disabled || !hasFrames}
						onClick={() => void run("parsed")}
					>
						<HugeiconsIcon icon={Download01Icon} data-icon="inline-start" />
						{busy === "parsed" ? "Exporting…" : "Export parsed (.json)"}
					</Button>
				</div>
				<FieldDescription>
					Files are saved to Downloads. Captures can contain account and login
					data; keep them private.
				</FieldDescription>
				{savedPath && (
					<p role="status" className="break-all text-xs text-muted-foreground">
						Saved: <span className="select-all font-mono">{savedPath}</span>
					</p>
				)}
				{!available && (
					<FieldDescription>
						Packet recording requires the desktop app and a working listener
						connection.
					</FieldDescription>
				)}
			</Field>
		</FieldGroup>
	);
}
