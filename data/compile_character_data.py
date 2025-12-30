import json
from pathlib import Path
import os

# Base path for wuwa-data
BASE_PATH = Path("wuwa-data")
# Assets path from the source wuwa-assets directory
ASSETS_PATH = Path(__file__).parent / "wuwa-assets"

# Paths to the JSON files
multitext_path = BASE_PATH / "Textmaps/en/multi_text/MultiText.json"
roleinfo_path = BASE_PATH / "BinData/role/roleinfo.json"
rolequalityinfo_path = BASE_PATH / "BinData/role/rolequalityinfo.json"
propertyindex_path = BASE_PATH / "BinData/property/propertyindex.json"
elementinfo_path = BASE_PATH / "BinData/element_info/elementinfo.json"

# Output path
output_path = Path("../src/configs/character_data.json")

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
	/Game/Aki/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_1_UI.T_IconRoleHead256_1_UI
	becomes:
	/wuwa-assets/UI/UIResources/Common/Image/IconRoleHead256/T_IconRoleHead256_1_UI.png
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
	relative_path = f"/wuwa-assets/{unreal_path}"
	
	# Fix capitalization for actual files on disk
	return fix_file_path_capitalization(relative_path)

def fix_file_path_capitalization(relative_path):
	"""Fix file path capitalization to match actual files on disk.
	
	Some asset files have different capitalization than the data references,
	so we check the actual filesystem and correct the path.
	"""
	if not relative_path:
		return None
	
	# Convert web path to filesystem path
	fs_path = ASSETS_PATH / relative_path.replace("/wuwa-assets/", "")
	parent_dir = fs_path.parent
	filename = fs_path.name
	
	# Always do case-insensitive search to find the correct capitalization
	if parent_dir.exists():
		# Look for files with matching name (case-insensitive)
		for file in parent_dir.iterdir():
			if file.is_file() and file.name.lower() == filename.lower():
				# Found a match - use the actual filename from disk
				corrected_relative = relative_path.rsplit("/", 1)[0] + "/" + file.name
				return corrected_relative
	
	# If no match found, return original path
	return relative_path

def get_element_name(element_id):
	"""Get element name from element ID."""
	element_map = {
		0: "None",
		1: "Glacio",
		2: "Fusion",
		3: "Electro",
		4: "Aero",
		5: "Spectro",
		6: "Havoc"
	}
	return element_map.get(element_id, "Unknown")

def get_weapon_type_name(weapon_type):
	"""Get weapon type name from weapon type ID."""
	weapon_map = {
		1: "Sword",
		2: "Broadblade",
		3: "Pistols",
		4: "Gauntlets",
		5: "Rectifier"
	}
	return weapon_map.get(weapon_type, "Unknown")

def get_element_icons(element_id, elementinfo_data):
	"""Get element icon paths from element info data."""
	for element in elementinfo_data:
		if element.get("Id") == element_id:
			return {
				"icon_round": convert_unreal_path_to_relative(element.get("Icon")),
				"icon_128": convert_unreal_path_to_relative(element.get("Icon3")),
				"icon_128_pure": convert_unreal_path_to_relative(element.get("Icon4Pure"))
			}
	return {
		"icon_round": None,
		"icon_128": None,
		"icon_128_pure": None
	}

def compile_character_data():
	"""Compile all character data into a single JSON file."""
	print("Loading JSON files...")
	
	# Load all JSON files
	multitext_data = load_json(multitext_path)
	roleinfo_data = load_json(roleinfo_path)
	rolequalityinfo_data = load_json(rolequalityinfo_path)
	property_data = load_json(propertyindex_path)
	elementinfo_data = load_json(elementinfo_path)
	
	# Check if all files loaded successfully
	if not all([multitext_data, roleinfo_data, property_data, elementinfo_data]):
		print("Error: Failed to load one or more required files")
		return
	
	print(f"Found {len(roleinfo_data)} role entries")
	
	# Compile character data
	character_list = []
	processed = 0
	
	for role in roleinfo_data:
		# Skip if not a playable character (RoleType != 0 means NPC or special)
		# Also skip trial characters
		if role.get("IsTrial", False):
			continue
		
		# Skip if not shown (hidden characters)
		# We'll include all characters regardless of IsShow to get complete data
		
		role_id = role.get("Id")
		if not role_id:
			continue
		
		# Get character name
		name_id = role.get("Name")
		character_name = get_text_from_id(name_id, multitext_data)
		
		# Skip if no name found (likely not a real character)
		if not character_name:
			continue
		
		# Get nickname
		nickname_id = role.get("NickName")
		nickname = get_text_from_id(nickname_id, multitext_data)
		
		# Get introduction
		intro_id = role.get("Introduction")
		introduction = get_text_from_id(intro_id, multitext_data)
		
		# Get element
		element_id = role.get("ElementId")
		element = get_element_name(element_id)
		element_icons = get_element_icons(element_id, elementinfo_data)
		
		# Get weapon type
		weapon_type = get_weapon_type_name(role.get("WeaponType"))
		
		# Get quality/rarity
		quality_id = role.get("QualityId")
		
		# Get icon paths
		icon_head_80 = convert_unreal_path_to_relative(role.get("RoleHeadIcon"))
		icon_head_150 = convert_unreal_path_to_relative(role.get("RoleHeadIconBig"))
		icon_head_175 = convert_unreal_path_to_relative(role.get("Card"))
		icon_head_256 = convert_unreal_path_to_relative(role.get("RoleHeadIconLarge"))
		icon_head_circle = convert_unreal_path_to_relative(role.get("RoleHeadIconCircle"))
		icon_pile = convert_unreal_path_to_relative(role.get("FormationRoleCard"))
		icon_portrait = convert_unreal_path_to_relative(role.get("RolePortrait"))
		
		# Create character entry
		character_entry = {
			"character_id": role_id,
			"character_name": character_name,
			"nickname": nickname,
			"introduction": introduction,
			"element": element,
			"element_id": element_id,
			"element_icon_round": element_icons["icon_round"],
			"element_icon_128": element_icons["icon_128"],
			"element_icon_128_pure": element_icons["icon_128_pure"],
			"weapon_type": weapon_type,
			"weapon_type_id": role.get("WeaponType"),
			"rarity": quality_id,
			"icon_head_80": icon_head_80,
			"icon_head_150": icon_head_150,
			"icon_head_175": icon_head_175,
			"icon_head_256": icon_head_256,
			"icon_head_circle": icon_head_circle,
			"icon_pile": icon_pile,
			"icon_portrait": icon_portrait,
			"max_level": role.get("MaxLevel"),
			"is_show": role.get("IsShow", False)
		}
		
		character_list.append(character_entry)
		processed += 1
		
		print(f"Processed: {character_name} (ID: {role_id}) - {element} - {weapon_type}")
	
	# Write to JSON file
	print(f"\nWriting {processed} characters to {output_path}...")
	
	with open(output_path, 'w', encoding='utf-8') as f:
		json.dump(character_list, f, indent=2, ensure_ascii=False)
	
	print(f"✓ Successfully compiled character data to {output_path}")
	print(f"  Total characters: {processed}")

def main():
	print("=" * 60)
	print("Character Data Compiler")
	print("=" * 60)
	
	compile_character_data()
	
	print("\nDone!")

if __name__ == "__main__":
	main()
