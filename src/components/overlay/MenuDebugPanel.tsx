import type { MenuDebugInfo } from "@/hooks/useEchoTracking";
import { PANEL_SCAN_MENU_MISS_LIMIT } from "@/lib/echoTarget";
import { cn } from "@/lib/utils";

/** Which screen the scan sees, with the label color; the two must agree. */
function classifyScan(scan: MenuDebugInfo["scan"]): {
	label: string;
	color: string;
} {
	if (scan.tuningSuccessful) {
		return {
			label: scan.waitingForBanner
				? "Tuning banner animating in"
				: "Tuning Successful screen",
			color: "text-amber-400",
		};
	}
	if (scan.panelOpen) {
		return { label: "Echo Upgrade panel", color: "text-emerald-400" };
	}
	return {
		label: "Other screen - no Echo Upgrade panel",
		color: "text-zinc-400",
	};
}

/**
 * Menu-detection debug panel (toggled in the settings Debug section): the raw
 * scan input, the trigger state and the last presses, for tuning the OCR
 * regions against the live game.
 */
export function MenuDebugPanel({ info }: { info: MenuDebugInfo }) {
	const { label, color } = classifyScan(info.scan);
	const ago = (at: number) => `${((Date.now() - at) / 1000).toFixed(1)}s ago`;
	const press = (kind: "identify" | "discard") => {
		const last = info.lastPresses[kind];
		return last ? `${ago(last.at)}${last.ok ? "" : " (failed)"}` : "-";
	};

	return (
		<div
			style={{ pointerEvents: "none" }}
			className="fixed bottom-4 left-4 z-50 w-96 space-y-1.5 rounded-md border border-white/10 bg-black/80 p-3 font-mono text-[11px] leading-snug text-zinc-200 shadow-2xl backdrop-blur-sm"
		>
			<div className="text-[10px] uppercase tracking-wider text-zinc-500">
				Menu detection
			</div>
			<div className={cn("font-bold", color)}>{label}</div>
			<div className="grid grid-cols-[auto_1fr] gap-x-3">
				<span className="text-zinc-500">title</span>
				<span className="break-all">
					{info.scan.titleText.trim() || "(no text)"}
				</span>
				<span className="text-zinc-500">banner</span>
				<span className="break-all">
					{info.scan.bannerText.trim() || "(not read)"}
				</span>
				<span className="text-zinc-500">flags</span>
				<span>
					panel {info.scan.panelOpen ? "yes" : "no"} · tuning{" "}
					{info.scan.tuningSuccessful ? "yes" : "no"} · waiting{" "}
					{info.scan.waitingForBanner ? "yes" : "no"} · echoes{" "}
					{info.scan.echoesVisible ? "yes" : "no"} · cost{" "}
					{info.scan.echoCostVisible ? "yes" : "no"}
				</span>
				<span className="text-zinc-500">sortIcon</span>
				<span>
					{info.scan.sortIconVisible ? "yes" : "no"}{" "}
					{info.scan.sortIconScore === null
						? "(no template)"
						: `(${info.scan.sortIconScore.toFixed(2)})`}
				</span>
				<span className="text-zinc-500">rarity</span>
				<span className="break-all">
					{info.scan.highRarityNoticeVisible ? "yes" : "no"}
					{info.scan.highRarityNoticeText.trim()
						? ` (${info.scan.highRarityNoticeText.trim()})`
						: ""}
				</span>
				<span className="text-zinc-500">menu</span>
				<span className="break-all">
					echoes {info.scan.echoesText.trim() || "(no text)"} · cost{" "}
					{info.scan.costText.trim() || "(no text)"}
				</span>
				<span className="text-zinc-500">cadence</span>
				<span>
					{info.scanDelayMs} ms
					{info.menuMisses >= PANEL_SCAN_MENU_MISS_LIMIT
						? " (menus gone)"
						: ` · ${info.menuMisses} missed`}{" "}
					· tick {info.scanMs} ms
				</span>
				<span className="text-zinc-500">card</span>
				<span>
					{info.panelClosed
						? `hidden (closed ${info.closedTicks} scans)`
						: info.panelHidden
							? "hidden (dialog)"
							: "shown"}
				</span>
				<span className="text-zinc-500">trigger</span>
				<span>
					refetch {info.needsRefetch ? "needed" : "no"}
					{info.failures > 0 ? ` (${info.failures} failed)` : ""} · wanted{" "}
					{info.lastAttemptAt ? ago(info.lastAttemptAt) : "-"}
				</span>
				<span className="text-zinc-500">presses</span>
				<span>
					identify {press("identify")} · discard {press("discard")}
				</span>
				<span className="text-zinc-500">queue</span>
				<span>
					{info.pendingDiscard === null
						? "none"
						: `echo ${info.pendingDiscard}`}
				</span>
			</div>
		</div>
	);
}
