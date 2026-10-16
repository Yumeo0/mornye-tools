import { Activity } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getStatus, type SnifferStatus } from "@/lib/sniffer";

/** Live packet-capture status, polled from the backend every couple seconds. */
export function CaptureCard() {
	const [status, setStatus] = useState<SnifferStatus | null>(null);

	const refresh = useCallback(
		() =>
			getStatus()
				.then(setStatus)
				.catch(() => undefined),
		[],
	);

	useEffect(() => {
		refresh();
		const timer = setInterval(refresh, 2000);
		return () => clearInterval(timer);
	}, [refresh]);

	const statusLine = !status
		? "starting…"
		: [
				status.capturing ? "capturing" : "armed",
				status.game_process_found ? "game process found" : "waiting for game",
				status.capture_available ? "capture available" : "capture unavailable",
				status.session_key_cached
					? "session key cached"
					: "waiting for session key",
			].join(" · ");

	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="space-y-0.5">
					<Label className="flex items-center gap-2 text-base font-medium">
						<Activity className="size-4" /> Packet capture
					</Label>
				</div>

				<p className="text-xs text-muted-foreground">{statusLine}</p>

				<div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
					<div>
						<p className="text-muted-foreground">RSA key</p>
						<p>{status?.rsa_key_fingerprint ?? "—"}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Elevated</p>
						<p>{status?.is_elevated ? "yes" : "no"}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Packets seen</p>
						<p>{status?.packets_seen ?? 0}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Inventory tables</p>
						<p>{status?.tables_loaded ? "loaded" : "missing"}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Frames fed</p>
						<p>{status?.frames_fed ?? 0}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Frame errors</p>
						<p>
							{status?.frame_errors ?? 0}
							{status && status.conv_mismatches > 0
								? ` (${status.conv_mismatches} stale conv)`
								: ""}
						</p>
					</div>
					<div>
						<p className="text-muted-foreground">Packet errors</p>
						<p>{status?.packet_errors ?? 0}</p>
					</div>
					<div>
						<p className="text-muted-foreground">Decode failures</p>
						<p>{status?.decode_failures ?? 0}</p>
					</div>
				</div>

				{status?.stream_stalled && (
					<p className="rounded-md bg-destructive/10 p-2 text-[11px] text-destructive">
						Stream stalled: game frames keep arriving but nothing has decoded
						for a while - the passive KCP mirror most likely lost a segment.
						Account data stays stale until the game restarts its connection
						(relaunch the game or reconnect in-game).
					</p>
				)}

				{status?.last_error && (
					<p className="rounded-md bg-destructive/10 p-2 text-[11px] text-destructive">
						{status.last_error}
					</p>
				)}

				{status && status.log.length > 0 && (
					<details className="rounded-md bg-muted/50 p-2">
						<summary className="cursor-pointer text-xs text-muted-foreground">
							Capture log
						</summary>
						<pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono text-[10px] text-muted-foreground">
							{status.log.slice(-40).join("\n")}
						</pre>
					</details>
				)}
			</CardContent>
		</Card>
	);
}
