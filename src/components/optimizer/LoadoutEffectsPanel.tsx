// Effect toggles for one optimizer slot: the resonator's kit effects (inherent
// skills, resonance chain, outro, states) plus the equipped weapon's passive
// controls.
//
// Rows edit `runtime.state.controls` through the slot's control overrides
// (`OptimizerOverrides.controls`). A value equal to the un-edited runtime's
// value is not stored, so edits only persist as deviations from the defaults.

import {
	getOwnForKey,
	listStatesFor,
} from "@wuwacalc/core/data/catalog/gameDataService";
import { getWpnsById } from "@wuwacalc/core/data/gameData/weapons/weaponDataStore";
import type { ResRuntime } from "@wuwacalc/core/domain/entities/runtime";
import { isNoWeaponId } from "@wuwacalc/core/domain/entities/runtime";
import type { SourceState } from "@wuwacalc/core/domain/gameData/contracts";
import { readRtPath } from "@wuwacalc/core/domain/gameData/runtimePath";
import {
	getSrcSttNct,
	sourceOptions,
} from "@wuwacalc/core/engine/gameData/controlOptions";
import {
	srcSttKey,
	srcSttNumMax,
} from "@wuwacalc/core/engine/runtime/sourceStateInit";
import {
	isStateEnabled,
	isStateVisible,
} from "@wuwacalc/core/engine/services/sourceStateService";
import { type FilterOption, FilterSelect } from "@/components/filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { OptimizerControlValue } from "@/lib/calc/translate";
import { cn } from "@/lib/utils";

type ControlOverrides = Record<string, OptimizerControlValue>;

interface EffectSection {
	id: string;
	label: string;
	states: SourceState[];
}

function sameValue(
	left: OptimizerControlValue,
	right: OptimizerControlValue,
): boolean {
	if (typeof left === "boolean" || typeof right === "boolean") {
		return left === right;
	}
	return String(left) === String(right);
}

function toBoolean(value: OptimizerControlValue): boolean {
	if (typeof value === "boolean") return value;
	if (typeof value === "number") return value > 0;
	return value === "true";
}

/** Current effective value of a state's control (explicit or authored). */
function controlValue(
	runtime: ResRuntime,
	state: SourceState,
): OptimizerControlValue {
	const raw = readRtPath(runtime, state.path);
	if (
		typeof raw === "boolean" ||
		typeof raw === "number" ||
		typeof raw === "string"
	) {
		return raw;
	}
	return getSrcSttNct(runtime, runtime, state, runtime);
}

/** Visible control states for one source, in authored order. */
function visibleStates(
	sourceType: SourceState["source"]["type"],
	sourceId: string,
	runtime: ResRuntime,
): SourceState[] {
	return listStatesFor(sourceType, sourceId).filter(
		(state) =>
			state.path.startsWith("runtime.state.controls.") &&
			isStateVisible(runtime, runtime, state, runtime),
	);
}

/** Group the resonator's states by ownership kind, like the calculator UI. */
function buildSections(roleId: string, runtime: ResRuntime): EffectSection[] {
	const inherent: SourceState[] = [];
	const sequence: SourceState[] = [];
	const outro: SourceState[] = [];
	const other: SourceState[] = [];

	for (const state of visibleStates("resonator", roleId, runtime)) {
		const kind = getOwnForKey(state.ownerKey)?.kind;
		if (kind === "inherent") inherent.push(state);
		else if (kind === "sequence") sequence.push(state);
		else if (kind === "outroSkill") outro.push(state);
		else other.push(state);
	}

	const weaponId = runtime.build.weapon.id;
	const weapon = !isNoWeaponId(weaponId)
		? visibleStates("weapon", weaponId, runtime)
		: [];

	return [
		{ id: "inherent", label: "Inherent Skills", states: inherent },
		{ id: "sequence", label: "Resonance Chain", states: sequence },
		{ id: "outro", label: "Outro Skill", states: outro },
		{ id: "other", label: "States & Buffs", states: other },
		{ id: "weapon", label: "Weapon", states: weapon },
	].filter((section) => section.states.length > 0);
}

/** Weapon passive description parameters for the effective rank. */
function passiveParams(params: string[][] | undefined, rank: number): string[] {
	if (!params) return [];
	const index = Math.min(Math.max(Math.round(rank), 1) - 1, 4);
	return params.map((group) => group[index] ?? "");
}

const CUSTOM_PLURAL = /\{Cus:[^}]*S=([^ ]+)\s+P=([^ ]+)\s+SapTag=(\d+)[^}]*\}/g;
const CUSTOM_INPUT =
	/\{Cus:Ipt,[^}]*Touch=([^ ]+)\s+PC=([^ ]+)\s+Gamepad=([^ }]+)[^}]*\}/g;

/**
 * Flatten an authored description into readable text: resolve `{n}` params
 * (weapon passives) and the `{Cus:...}` tags, keep line breaks, drop markup.
 */
function formatEffectText(
	description: string | undefined,
	params: Array<string | number>,
): string {
	if (!description) return "";
	let text = description.replace(/\r\n?/g, "\n");
	text = text.replace(
		CUSTOM_PLURAL,
		(_, singular: string, plural: string, tag: string) =>
			Number.parseFloat(String(params[Number.parseInt(tag, 10)] ?? "0")) === 1
				? singular
				: plural,
	);
	text = text.replace(
		CUSTOM_INPUT,
		(_, touch: string, pc: string, gamepad: string) =>
			[...new Set([touch, pc, gamepad])].join("/"),
	);
	text = text.replace(/\{(\d+)\}/g, (_, index: string) =>
		String(params[Number(index)] ?? `{${index}}`),
	);
	text = text.replace(/<br\s*\/?>/gi, "\n");
	text = text.replace(/<\/?(?:te|size)\b[^>]*>/gi, "");
	text = text.replace(/<[^>]*>/g, "");
	text = text
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"');
	return text
		.replace(/[ \t]+\n/g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/** Description text with percentage values picked out for readability. */
function EffectDescription({ text }: { text: string }) {
	if (!text) return null;
	return (
		<p
			className="mt-0.5 line-clamp-3 text-[10px] leading-snug text-muted-foreground"
			title={text}
		>
			{text.split("\n").map((line, lineIndex) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: line order is positional
				<span key={lineIndex}>
					{lineIndex > 0 && <br />}
					{line.split(/(\d+(?:\.\d+)?%)/g).map((part, partIndex) =>
						/^\d+(?:\.\d+)?%$/.test(part) ? (
							// biome-ignore lint/suspicious/noArrayIndexKey: token order is positional
							<span key={partIndex} className="font-medium text-foreground/80">
								{part}
							</span>
						) : (
							part
						),
					)}
				</span>
			))}
		</p>
	);
}

/** First argument that is a number; `undefined` when none is. */
function firstNumber(...values: unknown[]): number | undefined {
	for (const value of values) {
		if (typeof value === "number") return value;
	}
	return undefined;
}

/** Kind-specific editor for one state: switch, dropdown or number field. */
function EffectControl({
	state,
	runtime,
	value,
	disabled,
	onCommit,
}: {
	state: SourceState;
	runtime: ResRuntime;
	value: OptimizerControlValue;
	disabled: boolean;
	onCommit: (next: OptimizerControlValue) => void;
}) {
	if (state.kind === "toggle") {
		return (
			<Switch
				size="sm"
				checked={toBoolean(value)}
				disabled={disabled}
				onCheckedChange={(checked) => onCommit(checked)}
			/>
		);
	}

	if (state.kind === "select") {
		const options: FilterOption[] = sourceOptions(
			runtime,
			runtime,
			state,
			runtime,
		).map((option) => ({ value: option.id, label: option.label }));
		return (
			<FilterSelect
				label=""
				value={String(value)}
				options={options}
				onChange={(next) => onCommit(next)}
			/>
		);
	}

	const min = state.min ?? 0;
	const dynamicMax = srcSttNumMax(runtime, runtime, state, runtime);
	const max =
		firstNumber(dynamicMax, state.maxValue) ??
		Math.max(min, Number(value) || 0);
	const numeric = Number(value);
	return (
		<Input
			type="number"
			min={min}
			max={max}
			step={state.kind === "stack" ? 1 : undefined}
			value={String(Number.isFinite(numeric) ? numeric : min)}
			disabled={disabled}
			onChange={(event) => {
				const parsed = Number.parseFloat(event.target.value);
				if (!Number.isFinite(parsed)) return;
				const next = Math.min(
					max,
					Math.max(min, state.kind === "stack" ? Math.round(parsed) : parsed),
				);
				onCommit(next);
			}}
			className="h-6 w-20 px-1.5 text-right text-xs"
		/>
	);
}

function EffectRow({
	state,
	runtime,
	baseline,
	controls,
	description,
	onChange,
}: {
	state: SourceState;
	runtime: ResRuntime;
	baseline: ResRuntime;
	controls: ControlOverrides | null;
	description: string;
	onChange: (next: ControlOverrides | null) => void;
}) {
	const key = srcSttKey(state);
	const value = controlValue(runtime, state);
	const enabled = isStateEnabled(runtime, runtime, state, runtime);
	const edited = controls != null && key in controls;

	const commit = (nextValue: OptimizerControlValue) => {
		const record: ControlOverrides = { ...(controls ?? {}) };
		const apply = (target: SourceState, targetValue: OptimizerControlValue) => {
			const targetKey = srcSttKey(target);
			if (sameValue(targetValue, controlValue(baseline, target))) {
				delete record[targetKey];
			} else {
				record[targetKey] = targetValue;
			}
		};

		apply(state, nextValue);
		// Turning a grouped toggle on clears its exclusive siblings, matching
		// how the calculator applies `resets`.
		if (state.kind === "toggle" && nextValue === true) {
			const siblings = new Map(
				listStatesFor(state.source.type, state.source.id).map((entry) => [
					entry.controlKey,
					entry,
				]),
			);
			for (const resetKey of state.resets ?? []) {
				const resetState = siblings.get(resetKey);
				if (resetState?.kind === "toggle") apply(resetState, false);
			}
		}

		onChange(Object.keys(record).length > 0 ? record : null);
	};

	return (
		<div className="flex items-start gap-3 border-b border-border/40 px-2 py-2 last:border-b-0">
			<div className="min-w-0 flex-1">
				<p className={cn("text-xs leading-snug", edited && "font-semibold")}>
					{state.label}
					{edited && (
						<span
							className="ml-0.5 text-amber-400"
							title="Changed from default"
						>
							*
						</span>
					)}
					{state.displayScope === "team" && (
						<span
							className="ml-1.5 align-middle text-[9px] text-muted-foreground"
							title="Applies to the whole team"
						>
							[team]
						</span>
					)}
				</p>
				<EffectDescription text={description} />
				{!enabled && (
					<p className="mt-0.5 text-[10px] text-amber-400">
						{state.disabledReason ?? "Locked by the current settings."}
					</p>
				)}
			</div>
			<div className="flex w-36 shrink-0 justify-end pt-0.5">
				<EffectControl
					state={state}
					runtime={runtime}
					value={value}
					disabled={!enabled}
					onCommit={commit}
				/>
			</div>
		</div>
	);
}

/**
 * Effects tab body of the loadout dialog. `runtime` carries the current edits,
 * `baseline` is the same runtime without control overrides (used to keep the
 * stored record free of values that match the defaults).
 */
export function LoadoutEffectsPanel({
	roleId,
	runtime,
	baseline,
	controls,
	onChange,
}: {
	roleId: string;
	runtime: ResRuntime | null;
	baseline: ResRuntime | null;
	controls: ControlOverrides | null;
	onChange: (next: ControlOverrides | null) => void;
}) {
	if (!runtime || !baseline) {
		return (
			<p className="text-xs text-muted-foreground">
				Effects are unavailable for this character.
			</p>
		);
	}

	const sections = buildSections(roleId, runtime);
	const weaponId = runtime.build.weapon.id;
	const weapon = !isNoWeaponId(weaponId) ? getWpnsById()[weaponId] : undefined;
	const weaponParams = passiveParams(
		weapon?.passive.params,
		runtime.build.weapon.rank,
	);
	const hasEdits = controls != null && Object.keys(controls).length > 0;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between gap-2">
				{hasEdits && (
					<Button
						variant="ghost"
						size="sm"
						title="Reset all effect changes"
						onClick={() => onChange(null)}
					>
						Reset effects
					</Button>
				)}
			</div>

			{sections.length === 0 ? (
				<p className="text-xs text-muted-foreground">
					No editable effects found.
				</p>
			) : (
				sections.map((section) => (
					<div key={section.id} className="flex flex-col gap-1">
						<p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
							{section.label}
						</p>
						<div className="bg-muted/30 ring-1 ring-foreground/5">
							{section.states.map((state) => (
								<EffectRow
									key={state.controlKey}
									state={state}
									runtime={runtime}
									baseline={baseline}
									controls={controls}
									description={formatEffectText(
										state.description,
										state.source.type === "weapon" ? weaponParams : [],
									)}
									onChange={onChange}
								/>
							))}
						</div>
					</div>
				))
			)}
		</div>
	);
}
