/** Publish formation portraits without bundling the much larger gacha scenes. */
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	statSync,
	unlinkSync,
} from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { TextureAtlas } from "@esotericsoftware/spine-webgl";
import type { SpinePortraitSource } from "../src/lib/spine-types";
import { dataLog } from "./lib/data-log";
import { filesIn, gameRoot, publicRoot, root } from "./lib/public-assets";
import {
	characterPortraits,
	type ExtractedSpineModel,
	type PortraitSkin,
	portraitPlacement,
	webpAtlas,
} from "./lib/spine-assets";
import { publishSpinePosters } from "./lib/spine-posters";

export async function publishSpine(): Promise<void> {
	const manifest = (await Bun.file(join(gameRoot, "SPINE.json")).json()) as {
		models: ExtractedSpineModel[];
	};
	const models = characterPortraits(manifest.models);
	if (!models.length)
		throw new Error("SPINE.json contains no mapped character portraits");
	const skins: PortraitSkin[] = await Bun.file(
		join(root, "data/wuwa-data/BinData/role/roleskin.json"),
	).json();
	// Validate placement metadata before publishing or pruning any assets.
	const placements = new Map(
		models.flatMap((model) =>
			model.characterIds.map(
				(id) => [id, portraitPlacement(skins, id, model)] as const,
			),
		),
	);
	const directory = resolve(publicRoot, "spine/portraits");
	const expected = new Set<string>();
	const sources: Record<number, SpinePortraitSource> = {};
	let encoded = 0;
	for (const model of models) {
		const key = basename(dirname(model.skeleton));
		if (!/^[\w-]+$/.test(key))
			throw new Error(`Invalid portrait directory: ${key}`);
		const destination = join(directory, key);
		mkdirSync(destination, { recursive: true });
		const atlasText = await Bun.file(join(gameRoot, model.atlas)).text();
		const atlas = new TextureAtlas(atlasText);
		for (const page of atlas.pages) {
			if (basename(page.name) !== page.name || !/\.png$/i.test(page.name))
				throw new Error(`Unsupported portrait page: ${page.name}`);
			const input = resolve(gameRoot, dirname(model.atlas), page.name);
			if (
				!model.textures.some(
					(texture) => resolve(gameRoot, texture.file) === input,
				)
			)
				throw new Error(`Portrait page absent from SPINE.json: ${input}`);
			const output = join(destination, page.name.replace(/\.png$/i, ".webp"));
			expected.add(output);
			if (
				existsSync(output) &&
				statSync(output).mtimeMs >= statSync(input).mtimeMs
			)
				continue;
			const image = new Bun.Image(input);
			const { width, height } = await image.metadata();
			if (width !== page.width || height !== page.height)
				throw new Error(`Portrait page dimensions differ from atlas: ${input}`);
			// Keep the atlas resolution and alpha channel; resizing would invalidate UVs.
			await image.webp({ quality: 90 }).write(output);
			encoded++;
		}
		const skeletonPath = join(destination, "portrait.skel");
		const atlasPath = join(destination, "portrait.atlas");
		copyFileSync(join(gameRoot, model.skeleton), skeletonPath);
		await Bun.write(
			atlasPath,
			webpAtlas(
				atlasText,
				atlas.pages.map((page) => page.name),
			),
		);
		expected.add(skeletonPath);
		expected.add(atlasPath);
		const published = {
			skeleton: `/spine/portraits/${key}/portrait.skel`,
			atlas: `/spine/portraits/${key}/portrait.atlas`,
		};
		for (const id of model.characterIds) {
			const placement = placements.get(id);
			if (!placement) throw new Error(`Missing placement for character ${id}`);
			sources[id] = { ...published, placement };
		}
	}
	const { catalog, rendered } = await publishSpinePosters(sources);
	for (const model of Object.values(catalog))
		expected.add(join(publicRoot, model.poster.slice(1)));
	// Validate resolved targets before pruning individual files within the managed directory.
	for (const path of filesIn(directory)) {
		const target = resolve(path);
		if (!target.startsWith(directory + sep))
			throw new Error(`Unsafe Spine path: ${path}`);
		if (!expected.has(target)) unlinkSync(target);
	}
	copyFileSync(
		join(root, "node_modules/@esotericsoftware/spine-webgl/LICENSE"),
		join(publicRoot, "spine/LICENSE.txt"),
	);
	await Bun.write(
		join(root, "src/configs/spine_portraits.json"),
		`${JSON.stringify(catalog, null, "\t")}\n`,
	);
	dataLog.info(
		`Published ${models.length} Spine portraits for ${Object.keys(catalog).length} characters (${encoded} textures encoded, ${rendered} static frames rendered).`,
	);
}

if (import.meta.main) await publishSpine();
