"""
Build Asset Manifest Script
Scans the app for game image references and writes asset_manifest.json, the
exact list of source PNGs that copy_assets.py publishes to ../public.

Sources of truth:
- src/configs JSONs (compiled game data), restricted to the fields the UI
  actually renders. Dead fields (icon_head, icon_small, icon_portrait,
  icon_head_80/150/175, icon_head_circle, element_icon_128, the weapon item
  icon, ...) are ignored on purpose so their images stay out of the bundle.
- Literal /wuwa-assets/... paths in src (rarity gradients, weapon type
  glyphs, ...).
- The STAT_ASSETS map in src/lib/stats.ts (paths built with a template).

Paths are stored relative to the wuwa-assets root with their source .png
extension; copy_assets.py converts them to .webp when publishing.
"""

import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DATA_DIR = Path(__file__).resolve().parent
ROOT = DATA_DIR.parent
CONFIGS_DIR = ROOT / "src" / "configs"
SRC_DIR = ROOT / "src"
ASSETS_ROOT = DATA_DIR / "wuwa-assets"
MANIFEST_PATH = DATA_DIR / "asset_manifest.json"

# Config JSON fields whose icons are rendered by the app. Everything else in
# the compiled JSONs is dead weight and must not be copied to public.
RENDERED_FIELDS = {
	"chain_icons",         # resonance chain node icons (IconDevice)
	"element_icon_round",  # element glyphs on character cards (IconElementRound)
	"icon_head_256",       # character portraits (IconRoleHead256)
	"icon_pile",           # formation cards / team art (IconRolePile)
	"weapon_type_icon",    # weapon type glyphs (Com/Icon)
	"echo_sets.icon",      # sonata icons (IconElementAttri128 after transform)
	"icon_middle",         # echo icons (IconMonsterGoods160)
}

# Literal reference scan: "..."-quoted /wuwa-assets paths in TS/TSX sources.
# Both .png and .webp are accepted so the scan works before and after the
# configs/TS sources are switched to the published .webp extension.
LITERAL_REF_RE = re.compile(r'"(/wuwa-assets/[^"]+\.(?:png|webp))"')

# The stat icon paths in src/lib/stats.ts are built from a template, so parse
# the STAT_ASSETS map instead of looking for literal paths.
STAT_ASSETS_RE = re.compile(r"const STAT_ASSETS[^=]*=\s*\{(.*?)\n\};", re.S)
STAT_ASSET_VALUE_RE = re.compile(r'"[^"]+":\s*"([^"]+)"')


def sonata_128(path):
	"""Mirror the runtime transform in EchoCard/CharactersTab/EchoesTab."""
	return path.replace(
		"IconElementAttri/T_IconElementAttri",
		"IconElementAttri128/T_IconElementAttri128_",
	)


def walk_json(obj, path, out):
	if isinstance(obj, dict):
		for key, value in obj.items():
			walk_json(value, path + [key], out)
	elif isinstance(obj, list):
		for value in obj:
			walk_json(value, path + ["[]"], out)
	elif isinstance(obj, str) and "/wuwa-assets/" in obj:
		keypath = ".".join(part for part in path if part != "[]")
		if keypath in RENDERED_FIELDS:
			out.add(obj)


def collect_refs():
	refs = set()

	for cfg in sorted(CONFIGS_DIR.glob("*.json")):
		walk_json(json.loads(cfg.read_text(encoding="utf-8")), [], refs)

	for source in sorted(SRC_DIR.rglob("*.ts")) + sorted(SRC_DIR.rglob("*.tsx")):
		for match in LITERAL_REF_RE.finditer(source.read_text(encoding="utf-8")):
			refs.add(match.group(1))

	stats_source = (SRC_DIR / "lib" / "stats.ts").read_text(encoding="utf-8")
	block = STAT_ASSETS_RE.search(stats_source)
	if not block:
		print("✗ Could not find STAT_ASSETS in src/lib/stats.ts")
		sys.exit(1)
	for value in STAT_ASSET_VALUE_RE.findall(block.group(1)):
		refs.add(
			"/wuwa-assets/UI/UIResources/Common/Image/IconAttribute/"
			f"T_Iconproperty{value}_UI.png"
		)

	# Runtime-rewritten paths (sonata icons resolve to the 128 folder) and
	# normalize back to the source .png extension used by the manifest.
	return {
		re.sub(r"\.(?:png|webp)$", ".png", sonata_128(ref)).removeprefix(
			"/wuwa-assets/"
		)
		for ref in refs
	}


def main():
	print("=" * 60)
	print("Build Asset Manifest")
	print("=" * 60)
	print()

	files = sorted(collect_refs())

	missing = [f for f in files if not (ASSETS_ROOT / f).is_file()]
	if missing:
		print(f"✗ {len(missing)} referenced assets are missing from {ASSETS_ROOT}:")
		for f in missing[:20]:
			print("  ", f)
		if len(missing) > 20:
			print(f"   ... and {len(missing) - 20} more")
		sys.exit(1)

	total_bytes = sum((ASSETS_ROOT / f).stat().st_size for f in files)
	MANIFEST_PATH.write_text(
		json.dumps({"files": files}, indent="\t") + "\n", encoding="utf-8"
	)

	print(f"✓ {len(files)} assets referenced ({total_bytes / 1024 / 1024:.1f} MiB of PNGs)")
	print(f"✓ Manifest written to {MANIFEST_PATH.name}")
	return files


if __name__ == "__main__":
	main()
