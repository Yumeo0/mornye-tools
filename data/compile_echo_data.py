import json
import os
from pathlib import Path

# Base path for wuwa-data
BASE_PATH = Path("wuwa-data")

# Paths to the JSON files
multitext_path = BASE_PATH / "Textmaps/en/multi_text/MultiText.json"
phantomitem_path = BASE_PATH / "BinData/phantom/phantomitem.json"
phantomfettergroup_path = BASE_PATH / "BinData/phantom/phantomfettergroup.json"
phantommainproperty_path = BASE_PATH / "BinData/phantom/phantommainproperty.json"
phantommainpropitem_path = BASE_PATH / "BinData/phantom/phantommainpropitem.json"
phantomsubproperty_path = BASE_PATH / "BinData/phantom/phantomsubproperty.json"
propertyindex_path = BASE_PATH / "BinData/property/propertyindex.json"

# Output path
output_path = Path("../src/configs/echo_data.json")

def load_json(file_path):
	"""Load a JSON file and return its contents."""
	try:
		with open(file_path, 'r', encoding='utf-8') as f:
			return json.load(f)
	except FileNotFoundError:
		print(f"Error: File not found at {file_path}")
		return None
	except json.JSONDecodeError:
		print(f"Error: Failed to parse {file_path}")
		return None

def get_text_from_id(text_id, multitext_data):
	"""Get text content from MultiText.json using an ID."""
	for entry in multitext_data:
		if entry.get("Id") == text_id:
			return entry.get("Content")
	return None

def convert_unreal_path_to_relative(unreal_path):
	"""Convert Unreal Engine path to relative file path.
	
	Example:
	/Game/Aki/UI/UIResources/Common/Image/IconMonsterGoods160/T_IconMonsterGoods160_YZ_33020_UI.T_IconMonsterGoods160_YZ_33020_UI
	becomes:
	/wuwa-assets/UI/UIResources/Common/Image/IconMonsterGoods160/T_IconMonsterGoods160_YZ_33020_UI.png
	"""
	if not unreal_path:
		return None
	
	# Remove the /Game/Aki/ prefix
	unreal_path = unreal_path.replace("/Game/Aki/", "")
	
	# Remove the duplicate asset name at the end (after the last dot)
	if "." in unreal_path:
		unreal_path = unreal_path.rsplit(".", 1)[0]
	
	# Add .png extension
	unreal_path = f"{unreal_path}.png"
	
	# Convert to relative path format
	return f"/wuwa-assets/{unreal_path}"


def get_property_name(prop_id, property_data, multitext_data):
	"""Get the property name from PropId."""
	for prop in property_data:
		if prop.get("Id") == prop_id:
			name_id = prop.get("Name")
			name = get_text_from_id(name_id, multitext_data)
			return name if name else f"Unknown (PropId: {prop_id})"
	return f"Unknown (PropId: {prop_id})"

def get_echo_set_info(fetter_group_ids, fetter_data, multitext_data):
	"""Get the echo set name and ID from FetterGroup IDs."""
	set_info = []
	for fetter_id in fetter_group_ids:
		# Find the fetter group
		for fetter_entry in fetter_data:
			if fetter_entry.get("Id") == fetter_id:
				fetter_group_name = fetter_entry.get("FetterGroupName")
				set_name = get_text_from_id(fetter_group_name, multitext_data)
				
				# Get the icon path
				fetter_icon_path = convert_unreal_path_to_relative(fetter_entry.get("FetterElementPath"))
				
				if set_name:
					set_info.append({
						"id": fetter_id,
						"name": set_name,
						"icon": fetter_icon_path
					})
				break
	return set_info

def get_possible_mainstats(main_prop, mainprop_data, mainpropitem_data, property_data, multitext_data):
	"""Get possible mainstats from MainProp."""
	rand_group_id = main_prop.get("RandGroupId")
	
	if not rand_group_id:
		return []
	
	# Find all PropGroup entries for this RandGroupId
	prop_groups = []
	for entry in mainprop_data:
		if entry.get("RandGroupId") == rand_group_id:
			prop_groups.extend(entry.get("PropGroup", []))
	
	# Get unique prop groups
	prop_groups = list(set(prop_groups))
	
	# Get the PropId for each prop group
	mainstats = []
	for prop_group_id in prop_groups:
		for item in mainpropitem_data:
			if item.get("Id") == prop_group_id:
				prop_id = item.get("PropId")
				prop_name = get_property_name(prop_id, property_data, multitext_data)
				if prop_name not in mainstats:
					mainstats.append(prop_name)
				break
	
	return sorted(mainstats)

def get_possible_substats(subprop_data, property_data, multitext_data):
	"""Get all possible substats."""
	# Get unique PropIds
	prop_ids = list(set([entry.get("PropId") for entry in subprop_data if entry.get("PropId")]))
	
	substats = []
	for prop_id in prop_ids:
		prop_name = get_property_name(prop_id, property_data, multitext_data)
		if prop_name and prop_name not in substats:
			substats.append(prop_name)
	
	substats.append("HP%")
	substats.append("ATK%")
	substats.append("DEF%")
	
	return sorted(substats)

def compile_echo_data():
	"""Compile all echo data into a single JSON file."""
	print("Loading JSON files...")
	
	# Load all JSON files
	multitext_data = load_json(multitext_path)
	phantom_data = load_json(phantomitem_path)
	fetter_data = load_json(phantomfettergroup_path)
	mainprop_data = load_json(phantommainproperty_path)
	mainpropitem_data = load_json(phantommainpropitem_path)
	subprop_data = load_json(phantomsubproperty_path)
	property_data = load_json(propertyindex_path)
	
	# Check if all files loaded successfully
	if not all([multitext_data, phantom_data, fetter_data, mainprop_data, 
	            mainpropitem_data, subprop_data, property_data]):
		print("Error: Failed to load one or more required files")
		return
	
	print(f"Found {len(phantom_data)} phantom items")
	
	# Get all possible substats (same for all echoes)
	possible_substats = get_possible_substats(subprop_data, property_data, multitext_data)
	
	# Compile echo data
	echo_list = []
	processed = 0
	
	for phantom_item in phantom_data:
		# Only process QualityId 5 (highest quality)
		if phantom_item.get("QualityId") != 5:
			continue
		
		monster_name_id = phantom_item.get("MonsterName")
		echo_id = phantom_item.get("ItemId")
		
		# Skip if no valid ID
		if not monster_name_id or not echo_id:
			continue
		
		# Get echo name
		echo_name = get_text_from_id(monster_name_id, multitext_data)
		
		if not echo_name:
			continue
		
		# Get echo set information
		fetter_groups = phantom_item.get("FetterGroup", [])
		set_info = get_echo_set_info(fetter_groups, fetter_data, multitext_data)
		
		# Get mainstats
		main_prop = phantom_item.get("MainProp", {})
		mainstats = get_possible_mainstats(main_prop, mainprop_data, mainpropitem_data, 
		                                   property_data, multitext_data)
		
		# Get icon paths from the phantom item
		icon_head = convert_unreal_path_to_relative(phantom_item.get("Icon"))
		icon_middle = convert_unreal_path_to_relative(phantom_item.get("IconMiddle"))
		icon_small = convert_unreal_path_to_relative(phantom_item.get("IconSmall"))
		
		# Create echo entry
		echo_entry = {
			"echo_name": echo_name,
			"echo_id": echo_id,
			"icon_head": icon_head,
			"icon_middle": icon_middle,
			"icon_small": icon_small,
			"echo_sets": set_info,
			"possible_mainstats": mainstats,
			"possible_substats": possible_substats
		}
		
		echo_list.append(echo_entry)
		processed += 1
		
		print(f"Processed: {echo_name} (ID: {echo_id})")
	
	# Write to JSON file
	print(f"\nWriting {processed} echoes to {output_path}...")
	
	with open(output_path, 'w', encoding='utf-8') as f:
		json.dump(echo_list, f, indent=2, ensure_ascii=False)
	
	print(f"✓ Successfully compiled echo data to {output_path}")
	print(f"  Total echoes: {processed}")
	print(f"  Total substats: {len(possible_substats)}")

def main():
	print("=" * 60)
	print("Echo Data Compiler")
	print("=" * 60)
	
	compile_echo_data()
	
	print("\nDone!")

if __name__ == "__main__":
	main()
