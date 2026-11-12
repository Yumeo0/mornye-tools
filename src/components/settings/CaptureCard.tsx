import { Pulse02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { PacketCapturePanel } from "@/components/settings/PacketCapturePanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { captureHealth } from "@/lib/sniffer";
import { useSnifferStatus } from "@/lib/snifferStatus";

function ago(timestamp: number | undefined) {
	if (!timestamp) return "Not yet";
	const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
	return seconds < 2 ? "Just now" : `${seconds}s ago`;
}

export function CaptureCard() {
	const { status, error } = useSnifferStatus();
	const health = captureHealth(status, error);
	const metrics = [
		["Installed game version", status?.game_version.installed ?? "Unknown"],
		["Supported game version", status?.game_version.supported ?? "—"],
		["Game process", status?.game_pid ? `PID ${status.game_pid}` : "Waiting"],
		["UDP ports", status?.game_ports?.join(", ") || "None detected"],
		[
			"Session key",
			status?.session_key_cached ? "Available" : "Waiting for login",
		],
		[
			"Capture permission",
			status?.capture_available ? "Available" : "Unavailable",
		],
		["Game frames", status?.frames_fed ?? 0],
		["Decoded packets", status?.packets_seen ?? 0],
		["Last game frame", ago(status?.last_frame_at_ms)],
		["Last decoded packet", ago(status?.last_packet_at_ms)],
		["Frame errors", status?.frame_errors ?? 0],
		["Conversation mismatches", status?.conv_mismatches ?? 0],
		["Packet errors", status?.packet_errors ?? 0],
		["Proto decode failures", status?.decode_failures ?? 0],
		["RSA fingerprint", status?.rsa_key_fingerprint ?? "—"],
		["Inventory tables", status?.tables_loaded ? "Loaded" : "Missing"],
	] as const;
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<HugeiconsIcon icon={Pulse02Icon} className="size-4" /> Passive
					listener
				</CardTitle>
				<CardDescription>
					Captures game data automatically while the game runs.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<Alert
					role="note"
					variant={health.tone === "error" ? "destructive" : "default"}
				>
					<AlertTitle>{health.label}</AlertTitle>
					<AlertDescription>{health.detail}</AlertDescription>
				</Alert>
				<dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
					{metrics.map(([label, value]) => (
						<div key={label} className="min-w-0">
							<dt className="text-muted-foreground">{label}</dt>
							<dd className="break-words tabular-nums">
								{status ? value : "—"}
							</dd>
						</div>
					))}
				</dl>
				<Separator />
				<PacketCapturePanel
					status={status?.recording}
					available={Boolean(status) && !error}
				/>
				<Separator />
				<div className="flex flex-col gap-2">
					<p className="text-xs font-medium">
						Capture log{" "}
						<span className="font-normal text-muted-foreground">
							· newest first · UTC
						</span>
					</p>
					{/* biome-ignore-start lint/a11y/noNoninteractiveTabindex: The scrollable log needs keyboard focus for scrolling and selection. */}
					<section
						aria-label="Capture log"
						tabIndex={0}
						className="max-h-60 overflow-auto whitespace-pre-wrap break-words bg-muted/50 p-3 font-mono text-xs text-muted-foreground"
					>
						<pre className="whitespace-pre-wrap break-words">
							{status?.log.length
								? status.log.slice(-40).reverse().join("\n")
								: "No capture events yet. Waiting for the game…"}
						</pre>
					</section>
					{/* biome-ignore-end lint/a11y/noNoninteractiveTabindex: End keyboard-scrollable log region. */}
				</div>
			</CardContent>
		</Card>
	);
}
