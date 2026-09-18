import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface InventoryEcho {
	echo_name: string;
	level: string;
	main_stats: string;
	sub_stats: string;
	equippedBy?: string;
}

interface InventoryProgress {
	scanned: number;
	echo: InventoryEcho;
}

interface InventoryDone {
	scanned: number;
	cancelled: boolean;
	error: string | null;
}

function echoKey(echo: InventoryEcho): string {
	return [
		echo.echo_name,
		echo.level,
		echo.main_stats,
		echo.sub_stats,
		echo.equippedBy ?? "",
	].join("|");
}

export function InventoryTab() {
	const [isScanning, setIsScanning] = useState(false);
	const [scanned, setScanned] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [echoes, setEchoes] = useState<InventoryEcho[]>([]);
	const [preview, setPreview] = useState(false);
	const [countdown, setCountdown] = useState<number | null>(null);
	const [scrollStatus, setScrollStatus] = useState<string | null>(null);
	const isScanningRef = useRef(false);

	useEffect(() => {
		invoke<boolean>("get_inventory_preview")
			.then(setPreview)
			.catch(console.error);

		invoke<InventoryEcho[]>("get_saved_echoes")
			.then(setEchoes)
			.catch(console.error);

		const unlistenProgress = listen<InventoryProgress>(
			"inventory-progress",
			(event) => {
				setScanned(event.payload.scanned);
				setEchoes((prev) => {
					const key = echoKey(event.payload.echo);
					if (prev.some((echo) => echoKey(echo) === key)) {
						return prev;
					}
					return [event.payload.echo, ...prev];
				});
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

	const startScan = async () => {
		setError(null);
		setScanned(0);
		try {
			await invoke("scan_echo_inventory");
			setIsScanning(true);
			isScanningRef.current = true;
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

	const clearSaved = async () => {
		try {
			await invoke("clear_saved_echoes");
			setEchoes([]);
		} catch (e) {
			setError(String(e));
		}
	};

	const togglePreview = async () => {
		try {
			await invoke("set_inventory_preview", { show: !preview });
			setPreview(!preview);
		} catch (e) {
			setError(String(e));
		}
	};

	const testScroll = () => {
		if (countdown !== null) return;
		setError(null);
		setScrollStatus(null);
		let remaining = 5;
		setCountdown(remaining);
		const interval = setInterval(() => {
			remaining -= 1;
			if (remaining <= 0) {
				clearInterval(interval);
				setCountdown(null);
				invoke<string>("test_inventory_scroll")
					.then(setScrollStatus)
					.catch((e) => setError(String(e)));
			} else {
				setCountdown(remaining);
			}
		}, 1000);
	};

	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label className="text-base font-medium">
						Echo Inventory Scanner
					</Label>
				<p className="text-sm text-muted-foreground">
					Open the Echo Management page in-game and make sure the game window
					is focused, then start the scan. Do not move the mouse or use the
					keyboard while scanning. Press{" "}
					<kbd className="bg-muted px-1 font-mono text-xs">Ctrl+Shift+S</kbd>{" "}
					to stop the scan.
				</p>
				</div>

				<div className="flex items-center gap-3">
					<Button
						onClick={isScanning ? stopScan : startScan}
						variant={isScanning ? "destructive" : "default"}
					>
						{isScanning ? "Stop Scan" : "Start Scan"}
					</Button>
					<Button
						onClick={togglePreview}
						variant={preview ? "default" : "outline"}
					>
						{preview ? "Hide Region Preview" : "Preview Region Layout"}
					</Button>
					<Button
						onClick={testScroll}
						variant="outline"
						disabled={countdown !== null}
					>
						{countdown !== null ? `Scrolling in ${countdown}...` : "Test Scroll"}
					</Button>
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
					Test Scroll moves to the center of the last grid element, holds left
					click, drags up smoothly, stays at the end position for 0.5 seconds
					and releases — the same motion the scan uses to advance pages.
				</p>

				{preview && (
					<p className="text-xs text-muted-foreground">
						Green boxes = clicked grid cells, yellow boxes = OCR regions, blue
						box = ownership counter. Compare them against the in-game layout via
						the overlay.
					</p>
				)}

				{error && <p className="text-sm text-destructive">{error}</p>}
				{scrollStatus && (
					<p className="text-sm text-green-400">{scrollStatus}</p>
				)}

			{echoes.length > 0 && (
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label className="text-sm text-muted-foreground">
							Saved echoes: {echoes.length}
						</Label>
						<Button variant="ghost" size="sm" onClick={clearSaved}>
							Clear Saved
						</Button>
					</div>
					<div className="max-h-96 space-y-2 overflow-y-auto pr-1">
						{echoes.map((echo) => (
							<div
								key={echoKey(echo)}
								className="bg-muted/50 p-2 text-sm"
							>
								<div className="flex items-center justify-between">
									<span className="font-medium">{echo.echo_name}</span>
									<span className="text-yellow-400 font-bold">
										{echo.level}
									</span>
								</div>
								<p className="text-purple-400 text-xs">{echo.main_stats}</p>
								<p className="text-blue-400 text-xs whitespace-pre-wrap">
									{echo.sub_stats}
								</p>
								{echo.equippedBy && (
									<p className="text-xs text-muted-foreground">
										{echo.equippedBy}
									</p>
								)}
							</div>
						))}
					</div>
				</div>
			)}
			</CardContent>
		</Card>
	);
}
