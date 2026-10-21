// Run on the English GHZS Wuthering Waves map after signing in and loading progress.
// Reads marked IDs and public map catalogs. Does not upload or change progress.
(async () => {
	if (
		location.hostname !== "www.ghzs666.com" ||
		!location.pathname.startsWith("/wutheringwaves-map")
	) {
		throw new Error("Open https://www.ghzs666.com/wutheringwaves-map#/ first.");
	}
	const queue = [document.getElementById("map-app")?.__vue__];
	const seen = new Set();
	let map;
	while (queue.length) {
		const vm = queue.shift();
		if (!vm || seen.has(vm)) continue;
		seen.add(vm);
		if (typeof vm.getLeafsIds === "function" && Array.isArray(vm.leafsId)) {
			map = vm;
			break;
		}
		queue.push(...(vm.$children || []));
	}
	if (!map)
		throw new Error("The map is not ready. Wait for it to load and try again.");
	const markedIds = [...new Set([...map.getLeafsIds(), ...map.leafsId])];
	if (!markedIds.length)
		throw new Error(
			"No marked locations found. Sign in with the account you tracked with and wait for progress to load.",
		);
	const api = "https://api-wiki-game.ghzs.com/v1d0/web/kurogame-mc/map";
	const read = async (url) => {
		const response = await fetch(url, { credentials: "omit" });
		if (!response.ok)
			throw new Error(
				`GHZS catalog request failed (${response.status}). Try again later.`,
			);
		const value = await response.json();
		if (!Array.isArray(value))
			throw new Error(
				"GHZS changed its catalog format. No export was created.",
			);
		return value;
	};
	const maps = [{ _id: "" }, ...(await read(`${api}/maps`))];
	const marked = new Set(markedIds),
		points = [];
	for (const entry of maps) {
		const groups = await read(`${api}?map_id=${encodeURIComponent(entry._id)}`);
		for (const group of groups)
			for (const resource of group.resources || []) {
				for (const point of resource.points || []) {
					if (marked.has(point._id))
						points.push({
							id: point._id,
							map: entry._id,
							category: resource.name_en || resource.name,
							coordinates: point.coordinates.map(Number),
						});
				}
			}
	}
	const data = {
		format: "mornye-ghzs",
		version: 1,
		exportedAt: new Date().toISOString(),
		markedIds,
		points,
	};
	const url = URL.createObjectURL(
		new Blob([JSON.stringify(data)], { type: "application/json" }),
	);
	const link = document.createElement("a");
	link.href = url;
	link.download = "ghzs-progress.json";
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
	console.info(
		`Exported ${markedIds.length} marked locations. Import ghzs-progress.json in Mornye Tools → Settings → Import.`,
	);
})().catch((error) => console.error("GHZS export failed:", error.message));
