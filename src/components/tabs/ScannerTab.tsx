import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import {
	EchoCard,
	type InventoryEcho,
} from "@/components/echo/EchoCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface InventoryProgress {
	scanned: number;
	echo: InventoryEcho;
	duplicate: boolean;
}

interface InventoryDone {
	scanned: number;
	cancelled: boolean;
	error: string | null;
}

interface RecentEcho {
	id: number;
	echo: InventoryEcho;
	duplicate: boolean;
	status: "pending" | "kept" | "removed";
}

const MAX_RECENT = 50;

export function ScannerTab() {
	const [isScanning, setIsScanning] = useState(false);
	const [scanned, setScanned] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [recent, setRecent] = useState<RecentEcho[]>([]);
	const isScanningRef = useRef(false);
	const recentIdRef = useRef(0);

	useEffect(() => {
		const unlistenProgress = listen<InventoryProgress>(
			"inventory-progress",
			(event) => {
				setScanned(event.payload.scanned);
				setRecent((prev) =>
					[
						{
							id: recentIdRef.current++,
							echo: event.payload.echo,
							duplicate: event.payload.duplicate,
							status: "pending" as const,
						},
						...prev,
					].slice(0, MAX_RECENT),
				);
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
		setRecent([]);
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

	// "Keep" adds a second copy of the duplicate echo to the inventory
	const keepRecent = async (entry: RecentEcho) => {
		try {
			await invoke("save_echo", { echo: entry.echo });
			setRecent((prev) =>
				prev.map((e) =>
					e.id === entry.id ? { ...e, status: "kept" as const } : e,
				),
			);
		} catch (e) {
			setError(String(e));
		}
	};

	// "Remove" discards the duplicate scan; the original stays untouched
	const removeRecent = (id: number) => {
		setRecent((prev) =>
			prev.map((e) =>
				e.id === id ? { ...e, status: "removed" as const } : e,
			),
		);
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

				{recent.length > 0 && (
					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label className="text-sm text-muted-foreground">
								Recently scanned
							</Label>
							<Button variant="ghost" size="sm" onClick={() => setRecent([])}>
								Clear
							</Button>
						</div>
						<div className="max-h-[60vh] overflow-y-auto pr-1">
							<div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-3">
								{recent.map((entry) => (
									<EchoCard
										key={entry.id}
										echo={entry.echo}
										footer={
											entry.duplicate ? (
												entry.status === "kept" ? (
													<span className="text-xs text-muted-foreground">
														Kept
													</span>
												) : entry.status === "removed" ? (
													<span className="text-xs text-muted-foreground">
														Removed
													</span>
												) : (
													<>
														<span className="text-xs font-medium text-amber-500">
															Duplicate
														</span>
														<div className="flex shrink-0 items-center gap-1.5">
															<Button
																variant="outline"
																size="sm"
																onClick={() => keepRecent(entry)}
															>
																Keep
															</Button>
															<Button
																variant="destructive"
																size="sm"
																onClick={() => removeRecent(entry.id)}
															>
																Remove
															</Button>
														</div>
													</>
												)
											) : (
												<span className="text-xs font-medium text-green-500">
													New
												</span>
											)
										}
									/>
								))}
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
