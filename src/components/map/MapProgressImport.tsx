import { Dialog } from "@base-ui/react/dialog";
import {
	ArrowLeft01Icon,
	ArrowRight01Icon,
	Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { VirtualGrid } from "@/components/VirtualGrid";
import {
	collectionState,
	itemLabel,
	type ManualMapMarks,
} from "@/lib/map/collection";
import {
	GHZS_MAX_FILE_SIZE,
	type GhzsImportRow,
	matchGhzsExport,
	parseGhzsExport,
} from "@/lib/map/ghzs";
import exportScript from "@/lib/map/ghzs-export.js?raw";
import type {
	ExplorationSnapshot,
	MapCatalog,
	MapReward,
} from "@/lib/map/types";

const rowKey = (row: GhzsImportRow) => row.id;
const GHZS_URL = "https://www.ghzs666.com/wutheringwaves-map#/";
const STEPS = [
	"Choose your map",
	"Open GHZS",
	"Copy the export script",
	"Run the export script",
	"Upload your export",
	"Review your locations",
];

export function MapProgressImport({
	catalog,
	catalogError,
	onRetry,
	snapshot,
	marks,
	playerId,
	playerName,
	ready,
	saving,
	saveError,
	onImport,
	onClose,
}: {
	catalog: MapCatalog | null;
	catalogError: string | null;
	onRetry: () => void;
	snapshot: ExplorationSnapshot;
	marks: ManualMapMarks;
	playerId: number;
	playerName?: string;
	ready: boolean;
	saving: boolean;
	saveError: string | null;
	onImport: (rewards: MapReward[]) => Promise<boolean>;
	onClose: () => void;
}) {
	const [step, setStep] = useState(0);
	const [source, setSource] = useState<"ghzs" | null>(null);
	const [text, setText] = useState("");
	const [rows, setRows] = useState<GhzsImportRow[] | null>(null);
	const [excluded, setExcluded] = useState<Set<string>>(new Set());
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [imported, setImported] = useState<number | null>(null);
	const reading = useRef(0);
	const focusHeading = useCallback((heading: HTMLHeadingElement | null) => {
		heading?.focus({ preventScroll: true });
	}, []);
	const [loading, setLoading] = useState(false);
	useEffect(
		() => () => {
			reading.current++;
		},
		[],
	);
	const alreadyCollected = (row: GhzsImportRow) =>
		Boolean(
			row.reward &&
				collectionState(row.reward, snapshot, marks).state === "collected",
		);
	const selected = useMemo(
		() =>
			(rows ?? []).flatMap((row) =>
				row.reward &&
				!excluded.has(row.id) &&
				collectionState(row.reward, snapshot, marks).state !== "collected"
					? [row.reward]
					: [],
			),
		[rows, excluded, snapshot, marks],
	);
	const matched = rows?.filter((row) => row.reward).length ?? 0;
	const existing = rows?.filter(alreadyCollected).length ?? 0;
	const preview = (value: string) => {
		setError(null);
		setRows(null);
		setExcluded(new Set());
		try {
			if (!catalog)
				throw new Error("Wait for map data to load, then try again.");
			setRows(matchGhzsExport(parseGhzsExport(value), catalog));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : String(cause));
		}
	};
	const readFile = async (file: File) => {
		const sequence = ++reading.current;
		setLoading(true);
		setRows(null);
		setError(null);
		try {
			if (file.size > GHZS_MAX_FILE_SIZE)
				throw new Error("The export must be smaller than 20 MB.");
			const value = await file.text();
			if (sequence === reading.current) {
				setText("");
				preview(value);
			}
		} catch (cause) {
			if (sequence === reading.current)
				setError(cause instanceof Error ? cause.message : String(cause));
		} finally {
			if (sequence === reading.current) setLoading(false);
		}
	};
	const close = () => {
		if (!saving) onClose();
	};
	const go = (next: number) => {
		setError(null);
		setStep(next);
	};
	const copyScript = async () => {
		try {
			await navigator.clipboard.writeText(exportScript);
			setCopied(true);
			setError(null);
		} catch {
			setError(
				"Could not copy the script. Expand View export script and copy it manually.",
			);
		}
	};
	const nextDisabled =
		(step === 0 && !source) || (step === 4 && (!rows || loading));
	return (
		<Dialog.Root
			open
			onOpenChange={(open) => {
				if (!open) close();
			}}
		>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 bg-black/60" />
				<Dialog.Popup className="fixed left-1/2 top-1/2 flex max-h-[calc(100dvh-2rem)] w-[min(40rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden border bg-card text-card-foreground shadow-2xl outline-none">
					<header className="flex shrink-0 items-start justify-between gap-4 p-5">
						<div className="flex min-w-0 flex-col gap-1">
							<Dialog.Title className="text-base font-semibold">
								Import map progress
							</Dialog.Title>
							<Dialog.Description className="text-xs text-muted-foreground">
								Bring over the locations you have already marked.
							</Dialog.Description>
						</div>
						<Button
							variant="ghost"
							size="icon-sm"
							aria-label="Close import"
							disabled={saving}
							onClick={close}
						>
							<HugeiconsIcon icon={Cancel01Icon} />
						</Button>
					</header>
					<Separator />
					{imported !== null ? (
						<>
							<div
								role="status"
								className="flex flex-col gap-3 overflow-y-auto p-5 py-8"
							>
								<h3 className="text-lg font-medium">
									{imported.toLocaleString()}{" "}
									{imported === 1 ? "location" : "locations"} imported
								</h3>
								<p className="text-sm text-muted-foreground">
									Your existing progress is preserved. Enable a map section and
									choose Collected to see your imported locations.
								</p>
							</div>
							<Separator />
							<footer className="flex shrink-0 justify-end p-4">
								<Button onClick={onClose}>Done</Button>
							</footer>
						</>
					) : (
						<>
							<div className="flex min-h-0 flex-col gap-5 overflow-y-auto p-5">
								<div className="flex flex-col gap-2">
									<p className="text-[10px] uppercase tracking-widest text-muted-foreground">
										Step {step + 1} of {STEPS.length}
									</p>
									<h3
										key={step}
										ref={focusHeading}
										tabIndex={-1}
										className="text-lg font-medium outline-none"
									>
										{STEPS[step]}
									</h3>
								</div>
								<section
									key={step}
									aria-label={STEPS[step]}
									className="flex flex-col gap-4 text-sm"
								>
									{step === 0 && (
										<>
											<fieldset className="flex flex-col gap-3">
												<legend className="mb-3 text-sm">
													Which map did you use to track your progress?
												</legend>
												<label className="flex cursor-pointer items-center gap-3 border p-4 has-checked:border-primary has-checked:bg-muted/50">
													<input
														type="radio"
														name="import-source"
														value="ghzs"
														checked={source === "ghzs"}
														onChange={() => setSource("ghzs")}
														className="accent-primary"
													/>
													<span className="flex flex-col gap-1">
														<span className="font-medium">GHZS</span>
														<span className="text-xs text-muted-foreground">
															ghzs666.com · English Wuthering Waves map
														</span>
													</span>
												</label>
											</fieldset>
											<p className="text-xs text-muted-foreground">
												GHZS is currently the only supported map. You can skip
												this and start fresh, or return anytime in Settings →
												Import.
											</p>
										</>
									)}
									{step === 1 && (
										<>
											<p>
												Open the English GHZS map in your browser and sign in
												with the account you used to track your locations.
											</p>
											<Button
												variant="outline"
												className="self-start"
												onClick={async () => {
													setError(null);
													try {
														if (isTauri()) await openUrl(GHZS_URL);
														else
															window.open(
																GHZS_URL,
																"_blank",
																"noopener,noreferrer",
															);
													} catch {
														setError(
															`Could not open your browser. Open ${GHZS_URL} manually, then choose Next.`,
														);
													}
												}}
											>
												Open GHZS map
												<HugeiconsIcon
													icon={ArrowRight01Icon}
													data-icon="inline-end"
												/>
											</Button>
											<p className="text-xs text-muted-foreground">
												Wait until your marked locations appear, then choose
												Next.
											</p>
										</>
									)}
									{step === 2 && (
										<>
											<p>
												Copy this script. You will run it on the GHZS page in
												the next step to download your progress.
											</p>
											<Button
												variant="outline"
												className="self-start"
												onClick={() => void copyScript()}
											>
												{copied ? "Script copied" : "Copy export script"}
											</Button>
											<p className="text-xs text-muted-foreground">
												The script reads your marks and the public map catalog.
												It does not change your GHZS progress or export login
												tokens.
											</p>
											<details className="text-xs text-muted-foreground">
												<summary className="cursor-pointer py-1">
													View export script
												</summary>
												<pre className="mt-2 max-h-44 overflow-auto border bg-background p-3 text-[10px]">
													{exportScript}
												</pre>
											</details>
										</>
									)}
									{step === 3 && (
										<>
											<p>
												On the GHZS page, press{" "}
												<kbd className="border px-1.5 py-0.5 text-xs">F12</kbd>{" "}
												and open the <strong>Console</strong> tab. Paste the
												script and press{" "}
												<kbd className="border px-1.5 py-0.5 text-xs">
													Enter
												</kbd>
												.
											</p>
											<p>
												Wait for <strong>ghzs-progress.json</strong> to
												download, then choose Next.
											</p>
											<p className="text-xs text-muted-foreground">
												If the console reports an error, check that you are
												signed in and your marks have loaded, then run the
												script again.
											</p>
											<Button
												variant="outline"
												className="self-start"
												onClick={() => void copyScript()}
											>
												Copy script again
											</Button>
										</>
									)}
									{step === 4 && (
										<>
											<p>
												Choose the <strong>ghzs-progress.json</strong> file you
												just downloaded.
											</p>
											{!catalog && (
												<div className="flex flex-col gap-2">
													<p
														role={catalogError ? "alert" : "status"}
														className="text-xs text-muted-foreground"
													>
														{catalogError ?? "Loading map data…"}
													</p>
													{catalogError && (
														<Button
															variant="outline"
															className="self-start"
															onClick={onRetry}
														>
															Retry
														</Button>
													)}
												</div>
											)}
											<label htmlFor="ghzs-file" className="sr-only">
												GHZS export file
											</label>
											<Input
												id="ghzs-file"
												type="file"
												accept=".json,application/json"
												disabled={!catalog}
												onChange={(event) => {
													const input = event.currentTarget;
													const file = input.files?.[0];
													if (file)
														void readFile(file).finally(() => {
															input.value = "";
														});
												}}
											/>
											<details className="text-xs text-muted-foreground">
												<summary className="cursor-pointer py-1">
													Or paste export JSON
												</summary>
												<textarea
													aria-label="GHZS export JSON"
													className="mt-2 h-24 w-full resize-y border bg-background p-2 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-ring"
													value={text}
													onChange={(event) => {
														reading.current++;
														setLoading(false);
														setText(event.target.value);
														setRows(null);
														setError(null);
													}}
												/>
												<Button
													variant="outline"
													size="sm"
													disabled={!text.trim() || loading || !catalog}
													onClick={() => preview(text)}
												>
													Read export
												</Button>
											</details>
											{loading && (
												<p
													role="status"
													className="text-xs text-muted-foreground"
												>
													Reading export…
												</p>
											)}
											{rows && (
												<p role="status" className="text-xs">
													{rows.length.toLocaleString()} marked locations read.
													Choose Next to review the matches.
												</p>
											)}
										</>
									)}
									{step === 5 && rows && (
										<>
											<div className="flex flex-col gap-2">
												<p className="text-xs">
													{playerId > 0
														? `Import into ${playerName || "game account"} · ${playerId}`
														: "Connect a game account to save imported progress. You can review your export now."}
												</p>
												<p className="font-medium">
													{selected.length.toLocaleString()} ready ·{" "}
													{existing.toLocaleString()} already collected ·{" "}
													{(rows.length - matched).toLocaleString()} skipped
												</p>
												<p className="text-xs text-muted-foreground">
													Uncheck any locations you do not want to import. Your
													existing marks are preserved.
												</p>
											</div>
											<VirtualGrid
												items={rows}
												columns={1}
												gap={0}
												estimateRowHeight={52}
												getItemKey={rowKey}
												className="h-56 shrink-0 overflow-y-auto border bg-background"
												renderItem={(row) => {
													const existing = alreadyCollected(row);
													return (
														<label className="flex items-center gap-3 border-b px-3 py-2 text-xs">
															<input
																type="checkbox"
																aria-label={`Import ${row.reward ? itemLabel(row.reward) : row.category} ${row.id}`}
																disabled={!row.reward || existing || saving}
																checked={Boolean(
																	row.reward && !excluded.has(row.id),
																)}
																onChange={(event) => {
																	const checked = event.target.checked;
																	setExcluded((current) => {
																		const next = new Set(current);
																		if (checked) next.delete(row.id);
																		else next.add(row.id);
																		return next;
																	});
																}}
																className="accent-primary"
															/>
															<span className="flex min-w-0 flex-1 flex-col gap-1">
																<span className="truncate">
																	{row.reward
																		? itemLabel(row.reward)
																		: row.category}
																</span>
																<span className="truncate text-[10px] text-muted-foreground">
																	{row.reward?.area ?? row.map} ·{" "}
																	{row.reason ??
																		(existing
																			? "Already collected"
																			: `Matched · ${((row.distance ?? 0) / 100).toFixed(1)} m away`)}
																</span>
															</span>
														</label>
													);
												}}
											/>
											<details className="text-xs text-muted-foreground">
												<summary className="cursor-pointer py-1">
													About skipped locations
												</summary>
												<p className="mt-2">
													Only well separated matches within 12 m are offered,
													and nearby marks are assigned one placement each. The
													Roya Frostlands surface has no reliable alignment, and
													Vault Underground floors without enough marked
													locations cannot be aligned yet. Unsupported types and
													uncertain locations are skipped.
												</p>
											</details>
										</>
									)}
								</section>
								{(error || (step === 5 && saveError)) && (
									<p role="alert" className="text-xs text-destructive">
										{(step === 5 && saveError) || error}
									</p>
								)}
							</div>
							<Separator />
							<footer className="flex shrink-0 items-center justify-between gap-3 p-4">
								{step === 0 ? (
									<Button variant="ghost" onClick={close}>
										Not now
									</Button>
								) : (
									<Button
										variant="outline"
										disabled={saving || loading}
										onClick={() => go(step - 1)}
									>
										<HugeiconsIcon
											icon={ArrowLeft01Icon}
											data-icon="inline-start"
										/>
										Back
									</Button>
								)}
								{step < STEPS.length - 1 ? (
									<Button disabled={nextDisabled} onClick={() => go(step + 1)}>
										Next
										<HugeiconsIcon
											icon={ArrowRight01Icon}
											data-icon="inline-end"
										/>
									</Button>
								) : selected.length === 0 ? (
									<Button onClick={close}>Done</Button>
								) : (
									<Button
										disabled={!ready || playerId <= 0 || saving}
										onClick={async () => {
											const count = selected.length;
											setError(null);
											if (await onImport(selected)) setImported(count);
											else
												setError(
													"Progress could not be saved. Check the connected account and try again.",
												);
										}}
									>
										{saving
											? "Importing…"
											: `Import ${selected.length.toLocaleString()} ${selected.length === 1 ? "location" : "locations"}`}
									</Button>
								)}
							</footer>
						</>
					)}
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
