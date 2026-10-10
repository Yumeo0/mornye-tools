"""Compile weapon display data for the Account UI.

Produces `src/configs/weapon_data.json`:

    [
      {
        "item_id": 21010074,
        "name": "Emerald of Genesis",
        "type": 1,                 // 1 Broadblade .. 5 Rectifier
        "rarity": 4,
        "icon": "/wuwa-assets/...webp",
        "base_atk": 33,            // level-1 base ATK
        "secondary": { "key": "critRate", "value": 4.5, "is_ratio": true }
      }, ...
    ]

The `secondary.key` uses the same calculator stat keys as `echo_props.json`.
`is_ratio` marks percent scaling; `value` is already in display units.
"""

import json
from pathlib import Path

BASE_PATH = Path("wuwa-data")
ASSETS_PATH = Path(__file__).parent / "wuwa-assets"

multitext_path = BASE_PATH / "Textmaps/en/multi_text/MultiText.json"
weaponconf_path = BASE_PATH / "BinData/weapon/weaponconf.json"
propertyindex_path = BASE_PATH / "BinData/property/propertyindex.json"

output_path = Path("../src/configs/weapon_data.json")

WEAPON_TYPE_NAMES = {
	1: "Broadblade",
	2: "Sword",
	3: "Pistols",
	4: "Gauntlets",
	5: "Rectifier",
}

KEY_TO_STAT_FLAT = {
	"GreenLifeMax": "hpFlat",
	"GreenAtk": "atkFlat",
	"GreenDef": "defFlat",
}
KEY_TO_STAT_PERCENT = {
	"GreenLifeMax": "hpPercent",
	"GreenAtk": "atkPercent",
	"GreenDef": "defPercent",
}
KEY_TO_STAT = {
	"Crit": "critRate",
	"GreenCrit": "critRate",
	"CritDamage": "critDmg",
	"GreenCritDamage": "critDmg",
	"EnergyEfficiency": "energyRegen",
	"GreenEnergyEfficiency": "energyRegen",
	"HealChange": "healingBonus",
	"GreenHealChange": "healingBonus",
	"DamageChangeNormalSkill": "resonanceSkill",
	"DamageChangeAuto": "basicAtk",
	"DamageChangeCast": "heavyAtk",
	"DamageChangeUltra": "resonanceLiberation",
}


def load_json(path):
	with open(path, "r", encoding="utf-8") as f:
		return json.load(f)


def get_text_from_id(text_id, multitext_data):
	for entry in multitext_data:
		if entry.get("Id") == text_id:
			return entry.get("Content")
	return None


def fix_file_path_capitalization(relative_path):
	if not relative_path:
		return None
	fs_path = ASSETS_PATH / relative_path.replace("/wuwa-assets/", "")
	parent_dir = fs_path.parent
	stem = fs_path.stem
	# Compare stems only: the published extension (.webp) differs from the
	# source files on disk (.png).
	if parent_dir.exists():
		for file in parent_dir.iterdir():
			if file.is_file() and file.stem.lower() == stem.lower():
				return (
					relative_path.rsplit("/", 1)[0]
					+ "/"
					+ file.stem
					+ Path(relative_path).suffix
				)
	return relative_path


def convert_unreal_path_to_relative(unreal_path):
	if not unreal_path:
		return None
	unreal_path = unreal_path.replace("/Game/Aki/", "")
	if "." in unreal_path:
		unreal_path = unreal_path.rsplit(".", 1)[0]
	unreal_path = f"{unreal_path}.webp"
	return fix_file_path_capitalization(f"/wuwa-assets/{unreal_path}")


def stat_for(prop_key, is_ratio):
	if prop_key in KEY_TO_STAT_FLAT:
		return KEY_TO_STAT_PERCENT[prop_key] if is_ratio else KEY_TO_STAT_FLAT[prop_key]
	if prop_key in KEY_TO_STAT_PERCENT:
		return KEY_TO_STAT_PERCENT[prop_key]
	return KEY_TO_STAT.get(prop_key)


def compile_weapon_data():
	print("Loading weapon tables...")
	multitext_data = load_json(multitext_path)
	weapon_data = load_json(weaponconf_path)
	property_data = load_json(propertyindex_path)
	key_by_id = {entry.get("Id"): entry.get("Key") for entry in property_data}

	weapons = []
	unmapped_secondary = []
	for weapon in weapon_data:
		item_id = weapon.get("ItemId")
		name = get_text_from_id(weapon.get("WeaponName"), multitext_data)
		if not item_id or not name:
			continue

		first = weapon.get("FirstPropId") or {}
		second = weapon.get("SecondPropId") or {}
		base_atk = first.get("Value") if first.get("Id") == 7 else None

		secondary = None
		if second:
			prop_key = key_by_id.get(second.get("Id"))
			stat = stat_for(prop_key, bool(second.get("IsRatio")))
			if stat:
				value = second.get("Value")
				if second.get("IsRatio"):
					value = round(float(value) * 100, 3)
				secondary = {"key": stat, "value": value, "is_ratio": bool(second.get("IsRatio"))}
			else:
				unmapped_secondary.append((item_id, second.get("Id"), prop_key))

		weapons.append({
			"item_id": item_id,
			"name": name,
			"type": weapon.get("WeaponType"),
			"type_name": WEAPON_TYPE_NAMES.get(weapon.get("WeaponType"), "Unknown"),
			"rarity": weapon.get("QualityId"),
			"icon": convert_unreal_path_to_relative(weapon.get("IconMiddle")),
			"base_atk": base_atk,
			"secondary": secondary,
		})

	if unmapped_secondary:
		print(f"WARNING unmapped weapon secondary props: {unmapped_secondary[:20]}")

	print(f"Writing {len(weapons)} weapons to {output_path}...")
	with open(output_path, "w", encoding="utf-8") as f:
		json.dump(weapons, f, indent=2, ensure_ascii=False)
	print(f"Successfully wrote {output_path}")


def main():
	print("=" * 60)
	print("Weapon Data Compiler")
	print("=" * 60)
	compile_weapon_data()
	print("\nDone!")


if __name__ == "__main__":
	main()