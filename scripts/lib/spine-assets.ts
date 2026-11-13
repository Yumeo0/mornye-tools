import type { SpinePortraitPlacement } from "../../src/lib/spine-types";

export interface PortraitSkin {
	Id: number;
	RoleId: number;
	FormationSpineSkeletonData: string;
	FormationSpineAtlas: string;
	SpineParam: number[];
}

export interface ExtractedSpineModel {
	category: string;
	characterIds: number[];
	skeleton: string;
	atlas: string;
	version: string;
	textures: { file: string }[];
}

/** Use base formation portraits; costume variants must not replace the default artwork. */
export function characterPortraits(models: ExtractedSpineModel[]) {
	const portraits = models
		.filter(
			(model) =>
				model.category === "portrait" &&
				model.characterIds.length > 0 &&
				!/_Skin\d/i.test(model.skeleton),
		)
		.sort((a, b) => a.skeleton.localeCompare(b.skeleton));
	const owners = new Map<number, string>();
	for (const model of portraits) {
		if (!model.version.startsWith("4.1.") || !model.skeleton.endsWith(".skel"))
			throw new Error(`Unsupported portrait format: ${model.skeleton}`);
		for (const id of model.characterIds) {
			if (owners.has(id))
				throw new Error(`Multiple base portraits for character ${id}`);
			owners.set(id, model.skeleton);
		}
	}
	return portraits;
}

/** Match the complete export path, including its object name (not only its package). */
function extractedPath(asset: string, suffix: string, extension: string) {
	const [packagePath, object] = asset.split(".");
	if (!packagePath.startsWith("/Game/Aki/") || !object?.endsWith(suffix))
		return undefined;
	const directory = packagePath.slice("/Game/Aki/".length).split("/");
	directory.pop();
	return `${directory.join("/")}/${object.slice(0, -suffix.length)}.${extension}`;
}

/** Read each ID's default skin; shared skeletons can have different placements. */
export function portraitPlacement(
	skins: PortraitSkin[],
	characterId: number,
	model: ExtractedSpineModel,
): SpinePortraitPlacement {
	const skin = skins.find(
		(entry) =>
			entry.Id === 81000000 + characterId && entry.RoleId === characterId,
	);
	if (
		!skin ||
		extractedPath(skin.FormationSpineSkeletonData, "-data", "skel") !==
			model.skeleton ||
		extractedPath(skin.FormationSpineAtlas, "-atlas", "atlas") !== model.atlas
	)
		throw new Error(
			`Base skin does not match portrait for character ${characterId}`,
		);
	const params = skin.SpineParam;
	if (params.length !== 3 || !params.every(Number.isFinite) || params[2] <= 0)
		throw new Error(`Invalid SpineParam for character ${characterId}`);
	return { x: params[0], y: params[1], scale: params[2] };
}

/** Only page declarations change; region names and pixel coordinates stay intact. */
export function webpAtlas(text: string, pages: string[]): string {
	const names = new Set(pages);
	const lines = text.split(/\r?\n/);
	return lines
		.map((line, index) =>
			(index === 0 || !lines[index - 1].trim()) && names.has(line.trim())
				? line.trim().replace(/\.png$/i, ".webp")
				: line,
		)
		.join("\n");
}
