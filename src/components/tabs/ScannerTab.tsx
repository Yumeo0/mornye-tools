import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface InventoryProgress {
	scanned: number;
}

interface InventoryDone {
	scanned: number;
	cancelled: boolean;
	error: string | null;
}

export function ScannerTab() {
	const [isScanning, setIsScanning] = useState(false);
	const [scanned, setScanned] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const isScanningRef = useRef(false);

	useEffect(() => {
		const unlistenProgress = listen<InventoryProgress>(
			"inventory-progress",
			(event) => {
				setScanned(event.payload.scanned);
			},
		);

		const unlistenDone = listen<InventoryDone>("inventory-done", (event) => {
			setIsScanning(false);
			isScanningRef.current = false;
			setScanned(event.payload.scanned);
			if (event.payload.error) {
				setError(event.payload.error);
			} else if (event.payload.cancelled) {
				setError(null);
			}
		});

		return () => {
			unlistenProgress.then((fn) => fn());
			unlistenDone.then((fn) => fn());
		};
	}, []);

	const startScan = async (mode: "all" | "leveled") => {
		setError(null);
		setScanned(0);
		try {
			await invoke("scan_echo_inventory", { mode });
			setIsScanning(true);
			isScanningRef.current = true;
		} catch (e) {
			setError(String(e));
		}
	};

	const scanCurrent = async () => {
		setError(null);
		try {
			await invoke("scan_current_echo");
		} catch (e) {
			setError(String(e));
		}
	};

	const stopScan = async () => {
		try {
			await invoke("stop_echo_inventory");
		} catch (e) {
			setError(String(e));
		}
	};

	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label className="text-base font-medium">Echo Scanner</Label>
					<p className="text-sm text-muted-foreground">
						Open the Echo Management page in-game and make sure the game
						window is focused, then start a scan. Do not move the mouse or
						use the keyboard while scanning. Press{" "}
						<kbd className="bg-muted px-1 font-mono text-xs">
							Ctrl+Shift+S
						</kbd>{" "}
						to stop the scan.
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					{isScanning ? (
						<Button onClick={stopScan} variant="destructive">
							Stop Scan
						</Button>
					) : (
						<>
							<Button onClick={scanCurrent}>Scan Current Echo</Button>
							<Button onClick={() => startScan("all")}>Scan All Echoes</Button>
							<Button onClick={() => startScan("leveled")}>
								Scan Leveled Echoes
							</Button>
						</>
					)}
					{isScanning && (
						<span className="text-sm text-muted-foreground">
							Scanned echoes: {scanned}
						</span>
					)}
					{!isScanning && scanned > 0 && (
						<span className="text-sm text-muted-foreground">
							Last scan: {scanned} echoes
						</span>
					)}
				</div>

				<p className="text-xs text-muted-foreground">
					Scan Current Echo saves the echo that is open on the detail page.
					Scan All Echoes walks the whole inventory grid page by page. Scan
					Leveled Echoes stops as soon as it reaches an echo at level 0.
				</p>

				{error && <p className="text-sm text-destructive">{error}</p>}
			</CardContent>
		</Card>
	);
}
