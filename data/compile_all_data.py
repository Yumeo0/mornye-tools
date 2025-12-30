"""
Compile All Data Script
Runs both echo and character data compilation scripts.
"""

import sys
from pathlib import Path

def main():
	print("=" * 60)
	print("Compile All Game Data")
	print("=" * 60)
	print()
	
	# Import and run echo data compilation
	try:
		print("Starting Echo Data Compilation...")
		print("-" * 60)
		import compile_echo_data
		compile_echo_data.main()
		print()
	except Exception as e:
		print(f"Error compiling echo data: {e}")
		sys.exit(1)
	
	# Import and run character data compilation
	try:
		print("Starting Character Data Compilation...")
		print("-" * 60)
		import compile_character_data
		compile_character_data.main()
		print()
	except Exception as e:
		print(f"Error compiling character data: {e}")
		sys.exit(1)
	
	# Copy assets to public folder
	try:
		print("Copying Assets to Public Folder...")
		print("-" * 60)
		import copy_assets
		copy_assets.main()
		print()
	except Exception as e:
		print(f"Error copying assets: {e}")
		sys.exit(1)
	
	print("=" * 60)
	print("✓ All data compilation and asset copying complete!")
	print("=" * 60)

if __name__ == "__main__":
	main()
