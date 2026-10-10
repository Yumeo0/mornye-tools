"""Compile the echo property-id -> calculator stat-key tables.

Produces `src/configs/echo_props.json`:

    {
      "main": { "<phantom main prop item id>": "<statKey>", ... },
      "sub":  { "<phantomsubproperty id>": "<statKey>",
                "<propId>|<addType>": "<statKey>", ... }
    }

`main` maps `PhantomMainPropItem.Id` (e.g. 5001) and `sub` maps
`PhantomSubProperty.Id` (1..19) - both are what the packet sends as
`PhantomPropInfo.PhantomPropId`. The `propId|addType` aliases are included so
the table stays robust if the game switches to raw property ids.

Keys match the snake/camel keys of the calculator core echo scope:
hpFlat, hpPercent, atkFlat, atkPercent, defFlat, defPercent, critRate, critDmg,
energyRegen, basicAtk, heavyAtk, resonanceSkill, resonanceLiberation,
healingBonus, aero, glacio, electro, fusion, spectro, havoc.
"""

import json
from pathlib import Path

BASE_PATH = Path("wuwa-data")

phantommainpropitem_path = BASE_PATH / "BinData/phantom/phantommainpropitem.json"
phantomsubproperty_path = BASE_PATH / "BinData/phantom/phantomsubproperty.json"
propertyindex_path = BASE_PATH / "BinData/property/propertyindex.json"

output_path = Path("../src/configs/echo_props.json")

# (propertyindex.Key, AddType) -> calculator stat key. AddType 1 is flat,
# AddType 2 is percent for the hp/atk/def triples.
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
	"GreenDamageChangeNormalSkill": "resonanceSkill",
	"DamageChangeAuto": "basicAtk",
	"GreenDamageChangeAuto": "basicAtk",
	"DamageChangeCast": "heavyAtk",
	"GreenDamageChangeCast": "heavyAtk",
	"DamageChangeUltra": "resonanceLiberation",
	"GreenDamageChangeUltra": "resonanceLiberation",
	# ElementDamageChangeN -> element id N (1 Glacio, 2 Fusion, 3 Electro,
	# 4 Aero, 5 Spectro, 6 Havoc).
	"DamageChangeElement1": "glacio",
	"DamageChangeElement2": "fusion",
	"DamageChangeElement3": "electro",
	"DamageChangeElement4": "aero",
	"DamageChangeElement5": "spectro",
	"DamageChangeElement6": "havoc",
	"GreenDamageChangeElement1": "glacio",
	"GreenDamageChangeElement2": "fusion",
	"GreenDamageChangeElement3": "electro",
	"GreenDamageChangeElement4": "aero",
	"GreenDamageChangeElement5": "spectro",
	"GreenDamageChangeElement6": "havoc",
}


def load_json(path):
	with open(path, "r", encoding="utf-8") as f:
		return json.load(f)


def stat_for(prop_key, add_type):
	"""Map a (propertyindex.Key, AddType) pair to a calculator stat key."""
	if prop_key in KEY_TO_STAT_FLAT or prop_key in KEY_TO_STAT_PERCENT:
		if add_type == 1:
			return KEY_TO_STAT_FLAT.get(prop_key)
		if add_type == 2:
			return KEY_TO_STAT_PERCENT.get(prop_key)
		return None
	return KEY_TO_STAT.get(prop_key)


def compile_echo_props():
	print("Loading property tables...")
	mainpropitem_data = load_json(phantommainpropitem_path)
	subprop_data = load_json(phantomsubproperty_path)
	property_data = load_json(propertyindex_path)

	key_by_id = {entry.get("Id"): entry.get("Key") for entry in property_data}

	main = {}
	unmapped_main = []
	for item in mainpropitem_data:
		item_id = item.get("Id")
		prop_id = item.get("PropId")
		add_type = item.get("AddType")
		prop_key = key_by_id.get(prop_id)
		stat = stat_for(prop_key, add_type) if prop_key else None
		if stat:
			main[str(item_id)] = stat
		else:
			unmapped_main.append((item_id, prop_id, add_type, prop_key))

	sub = {}
	unmapped_sub = []
	for entry in subprop_data:
		sub_id = entry.get("Id")
		prop_id = entry.get("PropId")
		add_type = entry.get("AddType")
		prop_key = key_by_id.get(prop_id)
		stat = stat_for(prop_key, add_type) if prop_key else None
		if stat:
			# Packet identity is the sub property id (1..19).
			sub[str(sub_id)] = stat
			# Robust alias by raw property id + add type.
			sub[f"{prop_id}|{add_type}"] = stat
		else:
			unmapped_sub.append((sub_id, prop_id, add_type, prop_key))

	print(f"Mapped {len(main)} main prop ids, {len(sub)} sub prop entries")
	if unmapped_main:
		print(f"WARNING unmapped main props: {unmapped_main}")
	if unmapped_sub:
		print(f"WARNING unmapped sub props: {unmapped_sub}")

	with open(output_path, "w", encoding="utf-8") as f:
		json.dump({"main": main, "sub": sub}, f, indent=2, ensure_ascii=False)

	print(f"Successfully wrote {output_path}")


def main():
	print("=" * 60)
	print("Echo Props Compiler")
	print("=" * 60)
	compile_echo_props()
	print("\nDone!")


if __name__ == "__main__":
	main()