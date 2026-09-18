"""
Build Guide Compiler
Scrapes https://tethys.gg for resonator build guides: best echo sets,
main stat priorities and substat priorities for every role of every resonator.

The tethys.gg build data is not server-rendered - it is bundled into one of
the Next.js build chunks as a JSON.parse('...') dataset. So instead of
driving a browser we:
  1. fetch the resonators overview page and collect its JS chunk URLs
  2. download each chunk and look for the guides dataset
  3. extract the dataset and compile it into ../src/configs/character_builds.json
"""

import json
import re
import urllib.parse
import urllib.request
from pathlib import Path

BASE_URL = "https://tethys.gg"
RESONATORS_URL = f"{BASE_URL}/resonators"

# Output path
output_path = Path(__file__).parent / "../src/configs/character_builds.json"
# Character data for id lookup (produced by compile_character_data.py)
character_data_path = Path(__file__).parent / "../src/configs/character_data.json"

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"

CHUNK_RE = re.compile(r"/_next/static/chunks/[a-z0-9]+\.js")
JSON_PARSE_RE = re.compile(r"JSON\.parse\(")


def fetch_url(url):
	"""Fetch a URL and return its body as text."""
	request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
	with urllib.request.urlopen(request, timeout=30) as response:
		return response.read().decode("utf-8")


def extract_json_parse_strings(js):
	"""Yield the string literals passed to every JSON.parse('...') call.

	Handles JS single-quote escaping so the result matches what the browser
	would hand to JSON.parse.
	"""
	for match in JSON_PARSE_RE.finditer(js):
		pos = match.end()
		# Skip whitespace and find the opening quote
		while pos < len(js) and js[pos] in " \t\r\n":
			pos += 1
		if pos >= len(js) or js[pos] not in "'\"":
			continue
		quote = js[pos]
		pos += 1
		chunks = []
		while pos < len(js):
			char = js[pos]
			if char == "\\" and pos + 1 < len(js):
				next_char = js[pos + 1]
				if next_char == "u" and pos + 5 < len(js):
					chunks.append(chr(int(js[pos + 2 : pos + 6], 16)))
					pos += 6
					continue
				mapping = {
					"'": "'",
					'"': '"',
					"\\": "\\",
					"/": "/",
					"n": "\n",
					"t": "\t",
					"r": "\r",
					"b": "\b",
					"f": "\f",
				}
				chunks.append(mapping.get(next_char, next_char))
				pos += 2
				continue
			if char == quote:
				break
			chunks.append(char)
			pos += 1
		yield "".join(chunks)


def find_guides_dataset(chunk_urls):
	"""Download chunks until the resonator guides dataset is found."""
	for url in chunk_urls:
		try:
			js = fetch_url(url)
		except Exception as error:
			print(f"  ! Failed to download {url}: {error}")
			continue

		for literal in extract_json_parse_strings(js):
			try:
				data = json.loads(literal)
			except json.JSONDecodeError:
				continue
			if (
				isinstance(data, list)
				and data
				and isinstance(data[0], dict)
				and "guides" in data[0]
			):
				print(f"  Found guides dataset in {url}")
				return data
	return None


def load_character_ids():
	"""Map character names to game ids from character_data.json."""
	if not character_data_path.exists():
		print(f"  ! {character_data_path} not found, skipping id mapping")
		return {}
	with open(character_data_path, "r", encoding="utf-8") as f:
		characters = json.load(f)
	ids = {}
	for character in characters:
		name = character.get("character_name")
		character_id = character.get("character_id")
		if name and character_id and name not in ids:
			ids[name] = character_id
	return ids


def compile_guides(dataset, character_ids):
	"""Compile the raw tethys dataset into per-resonator, per-role builds."""
	builds = {}

	for resonator in dataset:
		name = resonator.get("name")
		if not name:
			continue

		entry = {"character_id": character_ids.get(name), "roles": {}}

		for guide in resonator.get("guides", []):
			role = guide.get("role")
			echo_sets = guide.get("echoSets") or []
			if not role or not echo_sets:
				continue

			role_data = {
				"echo_sets": {
					"variant": echo_sets[0].get("variant"),
					"sets": echo_sets[0].get("sets", []),
					"main_stats": (echo_sets[0].get("mainStat") or "").split("\n"),
				},
				"substats_priority": guide.get("substatsPriority"),
			}

			character_id = entry["character_id"]
			if character_id:
				role_query = urllib.parse.quote_plus(role)
				role_data["url"] = f"{BASE_URL}/resonators/{character_id}?role={role_query}"

			entry["roles"][role] = role_data

		if entry["roles"]:
			builds[name] = entry

	return builds


def main():
	print("=" * 60)
	print("Build Guide Compiler (tethys.gg)")
	print("=" * 60)

	print("\nFetching resonators page...")
	page = fetch_url(RESONATORS_URL)

	chunk_urls = [f"{BASE_URL}{path}" for path in CHUNK_RE.findall(page)]
	chunk_urls = list(dict.fromkeys(chunk_urls))
	print(f"Found {len(chunk_urls)} JS chunks to scan")

	print("\nScanning chunks for guides dataset...")
	dataset = find_guides_dataset(chunk_urls)
	if not dataset:
		print("Error: could not find the guides dataset in any chunk")
		return

	print(f"\nFound {len(dataset)} resonators in dataset")

	character_ids = load_character_ids()
	builds = compile_guides(dataset, character_ids)

	roles_total = sum(len(entry["roles"]) for entry in builds.values())
	multi_role = sum(1 for entry in builds.values() if len(entry["roles"]) > 1)
	print(f"Compiled {roles_total} roles across {len(builds)} resonators ({multi_role} with multiple roles)")

	output_path.parent.mkdir(parents=True, exist_ok=True)
	with open(output_path, "w", encoding="utf-8") as f:
		json.dump(builds, f, indent=2, ensure_ascii=False)

	print(f"\nDone! Successfully compiled build guides to {output_path}")


if __name__ == "__main__":
	main()
