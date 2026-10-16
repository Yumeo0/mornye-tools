import { getResSeedBy } from "@wuwacalc/core/data/catalog/resonatorSeedService";
import { useMemo } from "react";
import { type FilterOption, FilterSelect } from "@/components/filters";
import {
	chainOptions,
	clampLoadoutNumber,
	MAX_RESONATOR_LEVEL,
	weaponRankOptions,
} from "@/components/optimizer/loadout";
import { Input } from "@/components/ui/input";
import { weaponIconUrl, weaponsById } from "@/components/weapon/WeaponCard";
import type { OptimizerOverrides, TranslatedBuild } from "@/lib/calc/translate";

/** Field label in the loadout editor; the amber `*` marks a saved-data edit. */
function LoadoutLabel({
	label,
	edited,
	owned,
}: {
	label: string;
	edited: boolean;
	owned: boolean;
}) {
	return (
		<span
			className={`text-[10px] leading-none ${
				edited ? "font-semibold text-foreground" : "text-muted-foreground"
			}`}
		>
			{label}
			{edited && owned && (
				<span className="ml-0.5 text-amber-400" title="Changed from saved data">
					*
				</span>
			)}
		</span>
	);
}

/**
 * Loadout fields of the editor dialog: level, chain and weapon, with every
 * deviation from the captured account data marked by an amber `*`.
 */
export function LoadoutForm({
	build,
	owned,
	ownedWeaponItemIds,
	override,
	onPatch,
}: {
	build: TranslatedBuild;
	owned: boolean;
	ownedWeaponItemIds: Set<number>;
	override: OptimizerOverrides;
	onPatch: (patch: Partial<OptimizerOverrides>) => void;
}) {
	const savedWeapon = build.weapon;
	const savedWeaponItemId = savedWeapon ? Number(savedWeapon.id) : null;
	const shownLevel = override.level ?? build.resonator.level;
	const shownChain = override.chain ?? build.resonator.chain;
	const shownWeaponLevel =
		override.weaponLevel ?? savedWeapon?.level ?? MAX_RESONATOR_LEVEL;
	const shownWeaponRank = override.weaponRank ?? savedWeapon?.rank ?? 1;

	// Weapon options for this character, filtered to its weapon type.
	const weaponOptions: FilterOption[] = useMemo(() => {
		const weaponType = getResSeedBy(build.roleId)?.weaponType;
		return [...weaponsById.values()]
			.filter((weapon) => weaponType == null || weapon.type === weaponType)
			.sort((a, b) => b.rarity - a.rarity || a.name.localeCompare(b.name))
			.map((weapon) => ({
				value: String(weapon.item_id),
				label:
					weapon.name +
					(ownedWeaponItemIds.has(weapon.item_id) ? "" : " · not owned"),
				icon: weaponIconUrl(weapon.item_id),
			}));
	}, [build.roleId, ownedWeaponItemIds]);

	const savedWeaponName = savedWeapon
		? (weaponsById.get(savedWeaponItemId ?? 0)?.name ?? savedWeapon.id)
		: null;
	const savedWeaponOption: FilterOption = {
		value: "saved",
		label: savedWeaponName
			? owned
				? `Saved · ${savedWeaponName}`
				: `Default · ${savedWeaponName}`
			: owned
				? "None equipped (default)"
				: "Default weapon",
		icon:
			savedWeaponItemId != null ? weaponIconUrl(savedWeaponItemId) : undefined,
	};
	const weaponSelectValue =
		override.weaponItemId != null ? String(override.weaponItemId) : "saved";

	const clearWeaponPatch = {
		weaponItemId: null,
		weaponLevel: null,
		weaponRank: null,
	} as const;

	return (
		<div className="grid grid-cols-2 gap-x-4 gap-y-3">
			<div className="flex flex-col gap-1">
				<LoadoutLabel
					label="Level"
					edited={override.level != null}
					owned={owned}
				/>
				<Input
					type="number"
					min={1}
					max={MAX_RESONATOR_LEVEL}
					value={String(shownLevel)}
					onChange={(event) => {
						const next = Number.parseInt(event.target.value, 10);
						if (!Number.isFinite(next)) return;
						const level = clampLoadoutNumber(next, 1, MAX_RESONATOR_LEVEL);
						onPatch({ level: level === build.resonator.level ? null : level });
					}}
					className="h-7 px-1.5 text-xs"
				/>
			</div>
			<div className="flex flex-col gap-1">
				<LoadoutLabel
					label="Chain"
					edited={override.chain != null}
					owned={owned}
				/>
				<FilterSelect
					label=""
					value={String(shownChain)}
					options={chainOptions}
					onChange={(value) => {
						const chain = Number.parseInt(value, 10);
						if (!Number.isFinite(chain)) return;
						onPatch({ chain: chain === build.resonator.chain ? null : chain });
					}}
				/>
			</div>
			<div className="col-span-2 flex flex-col gap-1">
				<LoadoutLabel
					label="Weapon"
					edited={override.weaponItemId != null}
					owned={owned}
				/>
				<FilterSelect
					label=""
					value={weaponSelectValue}
					options={[savedWeaponOption, ...weaponOptions]}
					onChange={(value) => {
						if (value === "saved") {
							onPatch({ ...clearWeaponPatch });
							return;
						}
						const itemId = Number.parseInt(value, 10);
						if (!Number.isFinite(itemId)) return;
						onPatch(
							itemId === savedWeaponItemId
								? { ...clearWeaponPatch }
								: { weaponItemId: itemId },
						);
					}}
				/>
			</div>
			<div className="flex flex-col gap-1">
				<LoadoutLabel
					label="Weapon Level"
					edited={override.weaponLevel != null}
					owned={owned}
				/>
				<Input
					type="number"
					min={1}
					max={MAX_RESONATOR_LEVEL}
					value={String(shownWeaponLevel)}
					onChange={(event) => {
						const next = Number.parseInt(event.target.value, 10);
						if (!Number.isFinite(next)) return;
						const level = clampLoadoutNumber(next, 1, MAX_RESONATOR_LEVEL);
						const savedLevel = savedWeapon?.level ?? MAX_RESONATOR_LEVEL;
						onPatch({ weaponLevel: level === savedLevel ? null : level });
					}}
					className="h-7 px-1.5 text-xs"
				/>
			</div>
			<div className="flex flex-col gap-1">
				<LoadoutLabel
					label="Rank"
					edited={override.weaponRank != null}
					owned={owned}
				/>
				<FilterSelect
					label=""
					value={String(shownWeaponRank)}
					options={weaponRankOptions}
					onChange={(value) => {
						const rank = Number.parseInt(value, 10);
						if (!Number.isFinite(rank)) return;
						const savedRank = savedWeapon?.rank ?? 1;
						onPatch({ weaponRank: rank === savedRank ? null : rank });
					}}
				/>
			</div>
		</div>
	);
}
