import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { importPcap } from "@/lib/sniffer";

/**
 * Offline `.pcap` / `.pcapng` import: feeds a saved capture through the same
 * extractor as live capture. A test tool, not a substitute for sniffing.
 */
export function PcapImportPanel() {
	const [pcapPath, setPcapPath] = useState("");
	const [pcapStatus, setPcapStatus] = useState<string | null>(null);

	const runImport = async () => {
		if (!pcapPath.trim()) return;
		setPcapStatus("Importing…");
		try {
			const decoded = await importPcap(pcapPath.trim());
			setPcapStatus(`Decoded ${decoded} game packets.`);
		} catch (error) {
			setPcapStatus(String(error));
		}
	};

	return (
		<div className="space-y-2">
			<Label className="text-sm font-medium">
				Offline packet import (.pcap / .pcapng)
			</Label>
			<p className="text-xs text-muted-foreground">
				Test tool: feeds a saved capture through the same extractor as live
				capture. It is not a substitute for always-on sniffing.
			</p>
			<div className="flex gap-2">
				<Input
					value={pcapPath}
					onChange={(e) => setPcapPath(e.target.value)}
					placeholder="C:\\path\\to\\capture.pcapng"
					className="font-mono text-xs"
				/>
				<Button
					variant="outline"
					onClick={runImport}
					disabled={!pcapPath.trim()}
				>
					Import
				</Button>
			</div>
			{pcapStatus && (
				<p className="text-[11px] text-muted-foreground">{pcapStatus}</p>
			)}
		</div>
	);
}
