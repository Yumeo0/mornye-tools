"""
Copy Assets Script
Copies required image assets from wuwa-assets to the public folder for Tauri app.
"""

import shutil
import sys
from pathlib import Path

# Fix emoji output on Windows consoles (cp1252)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Paths
ASSETS_PATH = Path("wuwa-assets/UI/UIResources/Common/Image")
PUBLIC_PATH = Path("../public/wuwa-assets/UI/UIResources/Common/Image")

# Asset folders to copy
ASSET_FOLDERS = [
	# Echo assets
	"IconMonsterHead",
	"IconMonsterGoods160",
	"IconMonsterGoods80",
	"IconElementAttri128",
	
	# Character assets
	"IconRoleHead256",
	"IconRoleHeadCircle256",
	"IconRolePile",
	"PixActivity",
	
	# Element assets
	"IconElement128",
	"IconElementRound",

	# Stat icons
	"IconAttribute",
]

def copy_assets():
	"""Copy asset folders from wuwa-assets to public folder."""
	print("=" * 60)
	print("Copy Assets to Public Folder")
	print("=" * 60)
	print()
	
	# Create public assets directory if it doesn't exist
	PUBLIC_PATH.mkdir(parents=True, exist_ok=True)
	
	copied = 0
	skipped = 0
	
	for folder in ASSET_FOLDERS:
		source = ASSETS_PATH / folder
		destination = PUBLIC_PATH / folder
		
		if not source.exists():
			print(f"⚠ Skipped: {folder} (source not found)")
			skipped += 1
			continue
		
		# Remove existing destination if it exists
		if destination.exists():
			print(f"🗑 Removing existing: {folder}")
			shutil.rmtree(destination)
		
		# Copy the folder
		print(f"📁 Copying: {folder}...")
		shutil.copytree(source, destination)
		
		# Count files
		file_count = len(list(destination.rglob("*.png")))
		print(f"   ✓ Copied {file_count} files")
		copied += 1
	
	print()
	print("=" * 60)
	print(f"✓ Asset copy complete!")
	print(f"  Copied: {copied} folders")
	if skipped > 0:
		print(f"  Skipped: {skipped} folders")
	print("=" * 60)

def main():
	copy_assets()

if __name__ == "__main__":
	main()
