import { invoke } from "@tauri-apps/api/core";
import { ScanText } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScanRegion } from "@/lib/scanRegions";
import { readSetting, writeSetting } from "@/lib/settings";

/** The four editable fields of the debug region, in display order. */
const REGION_FIELDS: Array<{ key: keyof ScanRegion; label: string }> = [
	{ key: "x", label: "X Position (px)" },
	{ key: "y", label: "Y Position (px)" },
	{ key: "width", label: "Width (px)" },
	{ key: "height", label: "Height (px)" },
];

/**
 * OCR debug tools: test a custom scan region, toggle the region outline and
 * the overlay's menu-detection panel. Self-contained; both toggles are stored
 * in `settings.json` (and, for the outline, in the backend state).
 */
export function OcrDebugPanel() {
	const [showScanRegion, setShowScanRegion] = useState(false);
	const [showMenuDebug, setShowMenuDebug] = useState(false);
	const [debugRegion, setDebugRegion] = useState<ScanRegion>({
		x: 130,
		y: 65,
		width: 270,
		height: 60,
	});
	const [debugOcrText, setDebugOcrText] = useState<string | null>(null);
	const [isDebugScanning, setIsDebugScanning] = useState(false);

	useEffect(() => {
		invoke<boolean>("get_show_scan_region")
			.then(setShowScanRegion)
			.catch(console.error);

		void readSetting<boolean>("showMenuDebug").then((savedMenuDebug) => {
			if (savedMenuDebug === true) setShowMenuDebug(true);
		});
	}, []);

	// Follow live edits of the debug region while the outline is visible; the
	// toggle seeds the region before showing, so this only syncs later edits.
	// biome-ignore lint/correctness/useExhaustiveDependencies: showScanRegion is read as a guard; visibility changes are seeded by the toggle
	useEffect(() => {
		if (showScanRegion) {
			invoke("set_scan_region", { region: debugRegion }).catch(console.error);
		}
	}, [debugRegion]);

	const toggleShowScanRegion = async () => {
		const newValue = !showScanRegion;
		try {
			// Seed the debug region before the outline shows, so it never
			// flashes the resolution's region.
			if (newValue) {
				await invoke("set_scan_region", { region: debugRegion });
			}
			await invoke("set_show_scan_region", { show: newValue });
			setShowScanRegion(newValue);
		} catch (error) {
			console.error("Failed to toggle scan region visibility:", error);
		}
	};

	const toggleMenuDebug = async () => {
		const next = !showMenuDebug;
		setShowMenuDebug(next);
		try {
			await invoke("set_show_menu_debug", { show: next });
			await writeSetting("showMenuDebug", next);
		} catch (error) {
			console.error("[settings] Failed to toggle menu debug panel:", error);
		}
	};

	const performDebugScan = async () => {
		setIsDebugScanning(true);
		setDebugOcrText(null);
		try {
			const text = await invoke<string>("scan_region_for_text", {
				region: debugRegion,
			});
			setDebugOcrText(text);
		} catch (error) {
			console.error("Debug scan failed:", error);
			setDebugOcrText(`Error: ${error}`);
		} finally {
			setIsDebugScanning(false);
		}
	};

	return (
		<div className="space-y-2">
			<Label className="flex items-center gap-2 text-sm font-medium">
				<ScanText className="size-3.5" /> OCR Debug
			</Label>

			<div className="space-y-2 rounded-md bg-background p-3">
				<Label className="text-sm font-medium">
					Manual Region Configuration
				</Label>
				<p className="text-xs text-muted-foreground">
					Test a custom region (relative to the game window) without saving it
					to the main configuration
				</p>
				<div className="grid grid-cols-2 gap-4">
					{REGION_FIELDS.map(({ key, label }) => (
						<div key={key} className="space-y-2">
							<Label htmlFor={`debug-region-${key}`}>{label}</Label>
							<Input
								id={`debug-region-${key}`}
								type="number"
								value={debugRegion[key]}
								onChange={(event) =>
									setDebugRegion((prev) => ({
										...prev,
										[key]: Number(event.target.value),
									}))
								}
							/>
						</div>
					))}
				</div>
				<Button
					onClick={performDebugScan}
					disabled={isDebugScanning}
					variant="default"
					className="w-full"
				>
					{isDebugScanning ? "Scanning..." : "Test Scan Region"}
				</Button>

				{debugOcrText !== null && (
					<div className="rounded-lg bg-muted/50 border p-3 space-y-2">
						<Label className="text-sm font-medium">OCR Result:</Label>
						<pre className="text-xs text-muted-foreground whitespace-pre-wrap wrap-break-word font-mono">
							{debugOcrText || "(No text detected)"}
						</pre>
					</div>
				)}
			</div>

			<div className="space-y-2 rounded-md bg-background p-3">
				<Label className="text-sm font-medium">Region Outline Visibility</Label>
				<Button
					onClick={toggleShowScanRegion}
					variant={showScanRegion ? "default" : "outline"}
					className="w-full"
				>
					{showScanRegion ? "Hide Region Outline" : "Show Region Outline"}
				</Button>
				<p className="text-xs text-muted-foreground">
					Displays a visual outline of the scan region on the overlay
				</p>
			</div>

			<div className="space-y-2 rounded-md bg-background p-3">
				<Label className="text-sm font-medium">Menu Detection Panel</Label>
				<Button
					onClick={toggleMenuDebug}
					variant={showMenuDebug ? "default" : "outline"}
					className="w-full"
				>
					{showMenuDebug ? "Hide Menu Panel" : "Show Menu Panel"}
				</Button>
				<p className="text-xs text-muted-foreground">
					Shows which menu the overlay believes is on screen - Echo Upgrade
					panel, Tuning Successful screen or another screen - in the bottom-left
					corner of the overlay, with the raw title and banner reads behind the
					decision.
				</p>
			</div>
		</div>
	);
}
