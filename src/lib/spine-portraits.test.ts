import { expect, test } from "bun:test";
import { dirname, join } from "node:path";
import {
	AnimationState,
	AnimationStateData,
	AtlasAttachmentLoader,
	MeshAttachment,
	RegionAttachment,
	Skeleton,
	SkeletonBinary,
	Texture,
	TextureAtlas,
	Vector2,
} from "@esotericsoftware/spine-webgl";
import catalog from "@/configs/spine_portraits.json";
import { allCharacters } from "@/lib/characters";
import { portraitFrame } from "@/lib/spine-framing";

class HeadlessTexture extends Texture {
	setFilters() {}
	setWraps() {}
	dispose() {}
}

test("every regular catalogue character has a published base portrait", () => {
	const models: Record<number, unknown> = catalog;
	for (const character of allCharacters.filter((entry) => !entry.preview)) {
		expect(models[character.id], character.name).toBeDefined();
	}
	for (const model of Object.values(catalog)) {
		expect(Object.values(model.placement).every(Number.isFinite)).toBe(true);
		expect(model.placement.scale).toBeGreaterThan(0);
	}
});

test("widening or supersampling exposes more room without changing the portrait zoom", () => {
	const placement = catalog[1410].placement;
	const narrow = portraitFrame(placement, 377, 520);
	const wide = portraitFrame(placement, 640, 520);
	const dense = portraitFrame(placement, 1280, 1040);
	expect(wide.height).toBe(narrow.height);
	expect(wide.x).toBe(narrow.x);
	expect(wide.y).toBe(narrow.y);
	expect(wide.width / narrow.width).toBeCloseTo(640 / 377);
	expect(dense).toEqual(wide);
});

test("every static frame is published at 2x resolution and shared only for identical placement", async () => {
	const publicRoot = join(import.meta.dirname, "../../public");
	for (const poster of new Set(
		Object.values(catalog).map((model) => model.poster),
	)) {
		expect(poster).toMatch(
			/^\/spine\/portraits\/[\w-]+\/first-frame-[a-f0-9]+\.webp$/,
		);
		const dimensions = await new Bun.Image(join(publicRoot, poster)).metadata();
		expect(dimensions.width).toBe(1280);
		expect(dimensions.height).toBe(1040);
	}
	// The male Rover uses the same skeleton but a different X offset for Spectro.
	expect(catalog[1406].skeleton).toBe(catalog[1501].skeleton);
	expect(catalog[1406].poster).not.toBe(catalog[1501].poster);
	expect(catalog[1406].poster).toBe(catalog[1605].poster);
});

test("the camera applies native offsets and scale, with negative Y moving the portrait down", () => {
	const base = portraitFrame({ x: 0, y: 0, scale: 1 }, 640, 520);
	const placement = { x: 30, y: -190, scale: 0.28 };
	const frame = portraitFrame(placement, 640, 520);
	const project = (x: number, y: number, f: typeof frame) => ({
		x: ((x - f.x) / f.width + 0.5) * 640,
		y: (0.5 - (y - f.y) / f.height) * 520,
	});
	const actual = project(400, 1200, frame);
	const expected = project(
		400 * placement.scale + placement.x,
		1200 * placement.scale + placement.y,
		base,
	);
	expect(actual.x).toBeCloseTo(expected.x);
	expect(actual.y).toBeCloseTo(expected.y);
	expect(project(0, 0, frame).y).toBeGreaterThan(project(0, 0, base).y);
	for (const value of [0, -1, NaN, Infinity])
		expect(() =>
			portraitFrame({ ...placement, scale: value }, 640, 520),
		).toThrow("invalid");
});

test("published WebP atlases load and their idle animations have finite bounds", async () => {
	const publicRoot = join(import.meta.dirname, "../../public");
	const models = new Map(
		Object.values(catalog).map((model) => [model.skeleton, model]),
	);
	for (const model of models.values()) {
		const atlasPath = join(publicRoot, model.atlas);
		const atlas = new TextureAtlas(await Bun.file(atlasPath).text());
		for (const page of atlas.pages) {
			expect(page.name.endsWith(".webp")).toBe(true);
			const dimensions = await new Bun.Image(
				join(dirname(atlasPath), page.name),
			).metadata();
			expect(dimensions.width).toBe(page.width);
			expect(dimensions.height).toBe(page.height);
			page.setTexture(
				new HeadlessTexture({
					width: page.width,
					height: page.height,
				} as HTMLImageElement),
			);
		}
		const data = new SkeletonBinary(
			new AtlasAttachmentLoader(atlas),
		).readSkeletonData(
			new Uint8Array(
				await Bun.file(join(publicRoot, model.skeleton)).arrayBuffer(),
			),
		);
		expect(data.version?.startsWith("4.1.")).toBe(true);
		const idle = data.animations.find((animation) => animation.name === "idle");
		expect(idle, model.skeleton).toBeDefined();
		const skeleton = new Skeleton(data);
		const state = new AnimationState(new AnimationStateData(data));
		state.setAnimation(0, "idle", true);
		for (const delta of [0, (idle?.duration ?? 0) / 2]) {
			state.update(delta);
			state.apply(skeleton);
			skeleton.updateWorldTransform();
			const offset = new Vector2();
			const size = new Vector2();
			skeleton.getBounds(offset, size, []);
			expect(
				[offset.x, offset.y, size.x, size.y].every(Number.isFinite),
				model.skeleton,
			).toBe(true);
			expect(size.x).toBeGreaterThan(0);
			expect(size.y).toBeGreaterThan(0);
		}
		atlas.dispose();
	}
}, 15000);

test("Calcharo's distant idle mesh does not shrink his face", async () => {
	const model = catalog[1301];
	const publicRoot = join(import.meta.dirname, "../../public");
	const atlas = new TextureAtlas(
		await Bun.file(join(publicRoot, model.atlas)).text(),
	);
	for (const page of atlas.pages) {
		page.setTexture(
			new HeadlessTexture({
				width: page.width,
				height: page.height,
			} as HTMLImageElement),
		);
	}
	const data = new SkeletonBinary(
		new AtlasAttachmentLoader(atlas),
	).readSkeletonData(
		new Uint8Array(
			await Bun.file(join(publicRoot, model.skeleton)).arrayBuffer(),
		),
	);
	const skeleton = new Skeleton(data);
	const state = new AnimationState(new AnimationStateData(data));
	state.setAnimation(0, "idle", true);
	const frame = portraitFrame(model.placement, 640, 520);
	for (const delta of [0, 2, 2, 2]) {
		state.update(delta);
		state.apply(skeleton);
		skeleton.updateWorldTransform();
		expect(skeleton.getBoundsRect().width).toBeGreaterThan(data.width * 1.8);
		const head = skeleton.findSlot("head");
		if (!head) throw new Error("Calcharo has no head slot");
		const attachment = head.getAttachment();
		const vertices: number[] = [];
		if (attachment instanceof RegionAttachment)
			attachment.computeWorldVertices(head, vertices, 0, 2);
		else if (attachment instanceof MeshAttachment)
			attachment.computeWorldVertices(
				head,
				0,
				attachment.worldVerticesLength,
				vertices,
				0,
				2,
			);
		const ys = vertices.filter((_, i) => i % 2 === 1);
		const faceHeight =
			((Math.max(...ys) - Math.min(...ys)) / frame.height) * 520;
		expect(faceHeight).toBeGreaterThan(50);
		expect(faceHeight).toBeLessThan(85);
	}
	atlas.dispose();
});
