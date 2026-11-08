import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { type Echo, useAccount } from "@/lib/account";
import { useDangerousFeatures } from "@/lib/dangerous";
import {
	canUpgradeEcho,
	DEFAULT_UPGRADE_OPTIONS,
	type EchoUpgradeOptions,
	EXP_MATERIAL_NAMES,
} from "@/lib/echoUpgrade";
import {
	startEchoUpgradeBatch,
	stopEchoUpgradeBatch,
	useEchoUpgradeBatch,
} from "@/lib/echoUpgradeBatch";
import {
	loadEchoUpgradeRules,
	saveEchoUpgradeRules,
} from "@/lib/echoUpgradeRules";

const TUBES = [
	{ id: 36000001, rarity: "2★", exp: 500 },
	{ id: 36000002, rarity: "3★", exp: 1000 },
	{ id: 36000003, rarity: "4★", exp: 2000 },
	{ id: 36000004, rarity: "5★", exp: 5000 },
];
export function EchoUpgradePanel({
	echoes,
	profileId,
	showResults,
	onShowResultsChange,
}: {
	echoes: Echo[];
	profileId: string | null;
	showResults: boolean;
	onShowResultsChange: (show: boolean) => void;
}) {
	const { snapshot } = useAccount();
	const { status } = useDangerousFeatures();
	const batch = useEchoUpgradeBatch();
	const running = batch.phase === "running" || batch.phase === "stopping";
	const [threshold, setThreshold] = useState("75");
	const [options, setOptions] = useState<EchoUpgradeOptions>(() =>
		structuredClone(DEFAULT_UPGRADE_OPTIONS),
	);
	const [rulesLoaded, setRulesLoaded] = useState(false);
	const savedRules = useRef("");
	useEffect(() => {
		let active = true;
		void loadEchoUpgradeRules().then((saved) => {
			if (!active) return;
			savedRules.current = JSON.stringify(saved);
			setThreshold(String(saved.threshold));
			setOptions(saved.options);
			setRulesLoaded(true);
		});
		return () => {
			active = false;
		};
	}, []);
	const value = Number(threshold);
	const valid =
		threshold.trim() !== "" &&
		Number.isFinite(value) &&
		value >= 0 &&
		value <= 100;
	useEffect(() => {
		if (!rulesLoaded || !valid) return;
		const rules = { threshold: value, options };
		const serialized = JSON.stringify(rules);
		if (serialized === savedRules.current) return;
		savedRules.current = serialized;
		void saveEchoUpgradeRules(rules).catch(() => {
			if (savedRules.current === serialized) savedRules.current = "";
			toast.error("Batch rules could not be saved", { id: "echo-rules-save" });
		});
	}, [rulesLoaded, valid, value, options]);
	const connected =
		snapshot.profile?.id === profileId && canUpgradeEcho(snapshot, status);
	const results = showResults || running;
	const finished = batch.rows.filter(
		(row) => row.outcome !== "queued" && row.outcome !== "upgrading",
	).length;
	const complete = batch.rows.filter(
		(row) => row.outcome === "complete",
	).length;
	const discarded = batch.rows.filter(
		(row) => row.outcome === "discarded",
	).length;
	const below = batch.rows.filter(
		(row) => row.outcome === "below_threshold",
	).length;
	const count = (id: number) =>
		snapshot.inventory?.find((item) => item.id === id)?.count ?? 0;
	return (
		<Card className="w-full shrink-0 self-stretch xl:w-80 xl:overflow-y-auto">
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<CardTitle>{results ? "Batch progress" : "Batch rules"}</CardTitle>
					<Badge variant="outline">
						{results
							? `${batch.threshold}% target`
							: `${echoes.length} selected`}
					</Badge>
				</div>
				<CardDescription>
					{results
						? "Each echo is checked after every new substat."
						: "Upgrade in five-level stages. Stop when the best possible rating falls below your target."}
				</CardDescription>
			</CardHeader>
			<CardContent>
				{results ? (
					<div className="flex flex-col gap-3">
						<div
							role="status"
							className="flex items-center justify-between text-xs"
						>
							<span>
								{batch.phase === "stopping"
									? "Stopping after this request…"
									: running
										? "Batch running"
										: batch.phase === "error"
											? "Batch stopped with an error"
											: "Batch finished"}
							</span>
							<span className="tabular-nums">
								{finished} / {batch.rows.length}
							</span>
						</div>
						<progress
							aria-label="Echoes finished"
							max={Math.max(1, batch.rows.length)}
							value={finished}
							className="h-1.5 w-full accent-primary"
						/>
						<div className="flex flex-wrap gap-2">
							<Badge variant="secondary">{complete} complete</Badge>
							<Badge variant="outline">{discarded} marked discard</Badge>
							<Badge variant="outline">{below} below target</Badge>
						</div>
						<p className="text-[11px] text-muted-foreground">
							{batch.options.materials.discard_echoes
								? "Discard echo fodder on"
								: "Discard echo fodder off"}{" "}
							· {batch.options.materials.exp_material_ids.length} tube rarities
							· Auto-discard {batch.options.autoDiscard ? "on" : "off"}
						</p>
						{batch.profileId !== profileId && (
							<p role="status" className="text-xs text-muted-foreground">
								These results belong to the account profile used for this batch.
							</p>
						)}
						{batch.error && (
							<p role="alert" className="break-words text-xs text-destructive">
								{batch.error}
							</p>
						)}
					</div>
				) : (
					<FieldGroup>
						<Field data-invalid={!valid}>
							<FieldLabel htmlFor="echo-upgrade-threshold">
								Rating threshold (%)
							</FieldLabel>
							<Input
								id="echo-upgrade-threshold"
								type="number"
								min={0}
								max={100}
								step={1}
								value={threshold}
								disabled={!rulesLoaded}
								aria-invalid={!valid}
								onChange={(event) => {
									setThreshold(event.target.value);
								}}
							/>
							<FieldDescription>
								Echoes that can still reach this rating continue to their level
								limit.
							</FieldDescription>
						</Field>
						<Separator />
						<FieldSet>
							<FieldLegend>Allowed fodder</FieldLegend>
							<FieldGroup>
								<Field orientation="horizontal">
									<FieldContent>
										<FieldLabel htmlFor="echo-fodder">
											Discard-marked echoes
										</FieldLabel>
										<FieldDescription>
											Use their invested EXP first.
										</FieldDescription>
									</FieldContent>
									<Switch
										disabled={!rulesLoaded}
										id="echo-fodder"
										nativeButton
										render={<button type="button" />}
										checked={options.materials.discard_echoes}
										onCheckedChange={(checked) =>
											setOptions((previous) => ({
												...previous,
												materials: {
													...previous.materials,
													discard_echoes: checked,
												},
											}))
										}
									/>
								</Field>
								{TUBES.map((tube) => (
									<Field key={tube.id} orientation="horizontal">
										<FieldContent>
											<FieldLabel htmlFor={`tube-${tube.id}`}>
												{EXP_MATERIAL_NAMES[tube.id]}
											</FieldLabel>
											<FieldDescription>
												{tube.rarity} · {tube.exp.toLocaleString()} EXP ·{" "}
												{count(tube.id).toLocaleString()} owned
											</FieldDescription>
										</FieldContent>
										<Switch
											disabled={!rulesLoaded}
											id={`tube-${tube.id}`}
											nativeButton
											render={<button type="button" />}
											checked={options.materials.exp_material_ids.includes(
												tube.id,
											)}
											onCheckedChange={(checked) =>
												setOptions((previous) => ({
													...previous,
													materials: {
														...previous.materials,
														exp_material_ids: checked
															? [
																	...previous.materials.exp_material_ids,
																	tube.id,
																]
															: previous.materials.exp_material_ids.filter(
																	(id) => id !== tube.id,
																),
													},
												}))
											}
										/>
									</Field>
								))}
							</FieldGroup>
							{!options.materials.discard_echoes &&
								options.materials.exp_material_ids.length === 0 && (
									<FieldDescription>
										All EXP fodder is off. Only already unlocked substats can be
										tuned.
									</FieldDescription>
								)}
						</FieldSet>
						<Separator />
						<Field orientation="horizontal">
							<FieldContent>
								<FieldLabel htmlFor="echo-auto-discard">
									Mark failed echoes as discard
								</FieldLabel>
								<FieldDescription>
									Mark an echo when its best possible rating falls below the
									threshold, then move to the next.
								</FieldDescription>
							</FieldContent>
							<Switch
								disabled={!rulesLoaded}
								id="echo-auto-discard"
								nativeButton
								render={<button type="button" />}
								checked={options.autoDiscard}
								onCheckedChange={(autoDiscard) =>
									setOptions((previous) => ({ ...previous, autoDiscard }))
								}
							/>
						</Field>
						<p className="text-[11px] text-muted-foreground">
							Selected targets never become fodder during this batch. Locked,
							equipped, and unsplit stacked echoes keep their marks. Tuners and
							Shell Credits are also required.
						</p>
					</FieldGroup>
				)}
			</CardContent>
			<CardFooter className="flex-col gap-2">
				{running ? (
					<>
						<Button
							className="w-full"
							variant="destructive"
							disabled={batch.phase === "stopping"}
							onClick={stopEchoUpgradeBatch}
						>
							Stop batch
						</Button>
						<p className="text-[11px] text-muted-foreground">
							You can switch tabs while the batch runs.
						</p>
					</>
				) : results ? (
					<Button
						className="w-full"
						variant="outline"
						onClick={() => onShowResultsChange(false)}
					>
						Back to batch rules
					</Button>
				) : (
					<>
						<Button
							className="w-full"
							disabled={!rulesLoaded || !connected || !valid || !echoes.length}
							onClick={() => {
								if (profileId) {
									startEchoUpgradeBatch(profileId, echoes, value, options);
									onShowResultsChange(true);
								}
							}}
						>
							Upgrade {echoes.length} selected{" "}
							{echoes.length === 1 ? "echo" : "echoes"}
						</Button>
						{!connected && (
							<p role="status" className="text-[11px] text-muted-foreground">
								Connect to this profile’s account to start.
							</p>
						)}
						{batch.rows.length > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => onShowResultsChange(true)}
							>
								View last batch
							</Button>
						)}
					</>
				)}
			</CardFooter>
		</Card>
	);
}
