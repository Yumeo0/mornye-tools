// "Add echo" dialog: enter an echo by hand (species, set, level, main stat and
// substats). The backend assigns a synthetic instance id and marks the echo
// with `source: "manual"` so it is distinguishable from captured echoes.

import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { allEchoSpecies, type EchoEntry } from "@/components/echo/EchoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import {
	type Echo,
	type EchoProp,
	formatStatValue,
	isPercentStat,
	STAT_LABELS,
	type StatKey,
} from "@/lib/account";
import { subStatRolls } from "@/lib/stats";
import { cn } from "@/lib/utils";

const STAT_KEYS = Object.keys(STAT_LABELS) as StatKey[];
const MAX_SUBS = 5;
const MAIN_VALUE_STEP = 0.1;

interface SubRow {
	id: number;
	key: StatKey;
	value: number;
}

/** Roll value for a stat, or 0 when the stat has no roll table. */
function firstRoll(key: StatKey): number {
	return subStatRolls(STAT_LABELS[key])?.[0] ?? 0;
}

function echoProp(key: StatKey, value: number): EchoProp {
	const rounded = isPercentStat(key) ? Math.round(value * 100) / 100 : value;
	return {
		propId: 0,
		key,
		raw: isPercentStat(key) ? Math.round(rounded * 100) : Math.round(rounded),
		value: rounded,
	};
}

function StatSelect({
	value,
	onChange,
	className,
}: {
	value: StatKey;
	onChange: (key: StatKey) => void;
	className?: string;
}) {
	return (
		<Select value={value} onValueChange={(next) => onChange(next as StatKey)}>
			<SelectTrigger size="sm" className={cn("w-full", className)}>
				{STAT_LABELS[value]}
			</SelectTrigger>
			<SelectContent>
				{STAT_KEYS.map((key) => (
					<SelectItem key={key} value={key}>
						{STAT_LABELS[key]}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function AddEchoDialog({
	onClose,
	onAdded,
}: {
	onClose: () => void;
	/** Called with the prepared echo; the caller persists it. */
	onAdded: (echo: Echo) => void;
}) {
	const [search, setSearch] = useState("");
	const [species, setSpecies] = useState<EchoEntry | null>(null);
	const [setId, setSetId] = useState<number | null>(null);
	const [level, setLevel] = useState(25);
	const [mainKey, setMainKey] = useState<StatKey>("critRate");
	const [mainValue, setMainValue] = useState(0);
	const [subs, setSubs] = useState<SubRow[]>([]);
	const nextSubId = useRef(1);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	const matches = useMemo(() => {
		const query = search.trim().toLowerCase();
		const list = query
			? allEchoSpecies.filter((entry) =>
					entry.echo_name.toLowerCase().includes(query),
				)
			: allEchoSpecies;
		return list.slice(0, 60);
	}, [search]);

	const sets = species?.echo_sets ?? [];

	const pickSpecies = (entry: EchoEntry) => {
		setSpecies(entry);
		setSetId(entry.echo_sets?.[0]?.id ?? null);
	};

	const addSub = () => {
		setSubs((prev) =>
			prev.length >= MAX_SUBS
				? prev
				: [
						...prev,
						{
							id: nextSubId.current++,
							key: "critRate",
							value: firstRoll("critRate"),
						},
					],
		);
	};

	const updateSub = (id: number, patch: Partial<Omit<SubRow, "id">>) => {
		setSubs((prev) =>
			prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
		);
	};

	const removeSub = (id: number) => {
		setSubs((prev) => prev.filter((row) => row.id !== id));
	};

	const canSubmit =
		species !== null && species.monster_id != null && setId !== null;

	const submit = () => {
		if (!species || species.monster_id == null || setId === null) return;
		onAdded({
			incrId: 0,
			itemId: species.echo_id,
			monsterId: species.monster_id,
			setId,
			level: Number.isFinite(level) ? level : 0,
			funcValue: 0,
			stackCount: 1,
			mainProps: [echoProp(mainKey, mainValue)],
			subProps: subs.map((row) => echoProp(row.key, row.value)),
			equippedBy: null,
			slot: null,
			source: "manual",
		});
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="Close"
				title="Close"
				className="absolute inset-0 cursor-default bg-black/60"
				onClick={onClose}
			/>
			<div className="bg-card text-card-foreground ring-foreground/20 relative flex max-h-full w-full max-w-3xl flex-col gap-3 p-4 shadow-2xl ring-1">
				<header className="flex shrink-0 items-center gap-3">
					<h3 className="min-w-0 flex-1 text-sm font-semibold">
						Add echo manually
					</h3>
					<Button
						variant="ghost"
						size="icon-sm"
						title="Close"
						onClick={onClose}
					>
						<X className="size-4" />
					</Button>
				</header>

				<div className="grid min-h-0 flex-1 gap-4 sm:grid-cols-[5fr_7fr]">
					<div className="flex min-h-0 flex-col gap-2">
						<Input
							autoFocus
							type="text"
							placeholder="Search echo..."
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							className="h-7 text-xs"
						/>
						<div className="ring-border min-h-0 flex-1 overflow-y-auto bg-muted/40 ring-1">
							{matches.map((entry) => (
								<button
									key={entry.monster_id ?? entry.echo_name}
									type="button"
									onClick={() => pickSpecies(entry)}
									className={cn(
										"hover:bg-muted flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs",
										species?.monster_id === entry.monster_id && "bg-muted",
									)}
								>
									{entry.icon_middle && (
										<img
											src={entry.icon_middle}
											alt=""
											className="size-6 shrink-0 object-contain"
										/>
									)}
									<span className="min-w-0 flex-1 truncate">
										{entry.echo_name}
									</span>
									{entry.echo_cost != null && (
										<span className="text-muted-foreground shrink-0 text-[10px]">
											{entry.echo_cost} cost
										</span>
									)}
								</button>
							))}
							{matches.length === 0 && (
								<p className="text-muted-foreground px-2 py-4 text-center text-xs">
									No echoes match.
								</p>
							)}
						</div>
					</div>

					{species ? (
						<div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
							<div className="flex items-center gap-2">
								{species.icon_middle && (
									<img
										src={species.icon_middle}
										alt=""
										className="size-8 shrink-0 bg-black/30 object-contain"
									/>
								)}
								<span className="truncate font-medium">
									{species.echo_name}
								</span>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label>Sonata set</Label>
									<Select
										value={setId === null ? "" : String(setId)}
										onValueChange={(value) =>
											setSetId(value ? Number(value) : null)
										}
									>
										<SelectTrigger size="sm" className="w-full">
											{sets.find((set) => set.id === setId)?.name ??
												"Select set"}
										</SelectTrigger>
										<SelectContent>
											{sets.map((set) => (
												<SelectItem key={set.id} value={String(set.id)}>
													{set.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-1">
									<Label htmlFor="add-echo-level">Level</Label>
									<Input
										id="add-echo-level"
										type="number"
										min={0}
										max={25}
										value={level}
										onChange={(event) => setLevel(Number(event.target.value))}
									/>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1">
									<Label>Main stat</Label>
									<StatSelect value={mainKey} onChange={setMainKey} />
								</div>
								<div className="space-y-1">
									<Label htmlFor="add-echo-main-value">Main value</Label>
									<Input
										id="add-echo-main-value"
										type="number"
										step={MAIN_VALUE_STEP}
										value={mainValue}
										onChange={(event) =>
											setMainValue(Number(event.target.value))
										}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<div className="flex items-center justify-between gap-2">
									<Label>
										Substats ({subs.length}/{MAX_SUBS})
									</Label>
									<Button
										variant="outline"
										size="sm"
										onClick={addSub}
										disabled={subs.length >= MAX_SUBS}
									>
										Add substat
									</Button>
								</div>
								{subs.map((row) => {
									const rolls = subStatRolls(STAT_LABELS[row.key]) ?? [];
									return (
										<div key={row.id} className="flex items-center gap-2">
											<StatSelect
												value={row.key}
												onChange={(key) =>
													updateSub(row.id, { key, value: firstRoll(key) })
												}
											/>
											<Select
												value={String(row.value)}
												onValueChange={(value) =>
													updateSub(row.id, { value: Number(value) })
												}
											>
												<SelectTrigger size="sm" className="w-28">
													{formatStatValue(row.key, row.value)}
												</SelectTrigger>
												<SelectContent>
													{rolls.map((roll) => (
														<SelectItem key={roll} value={String(roll)}>
															{formatStatValue(row.key, roll)}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											<Button
												variant="ghost"
												size="icon-sm"
												title="Remove substat"
												onClick={() => removeSub(row.id)}
											>
												<X className="size-4" />
											</Button>
										</div>
									);
								})}
								{subs.length === 0 && (
									<p className="text-muted-foreground text-xs">
										No substats yet.
									</p>
								)}
							</div>
						</div>
					) : (
						<p className="text-muted-foreground text-xs">
							Pick an echo on the left to fill in its stats.
						</p>
					)}
				</div>

				<footer className="flex shrink-0 justify-end gap-2 border-t pt-3">
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={submit} disabled={!canSubmit}>
						Add echo
					</Button>
				</footer>
			</div>
		</div>
	);
}
