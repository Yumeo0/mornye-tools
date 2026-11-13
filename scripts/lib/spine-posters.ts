/** Bake the player's time-zero frame without a dev server or running app. */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, renameSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { TextureAtlas } from "@esotericsoftware/spine-webgl";
import { type Browser, chromium } from "playwright-core";
import type {
	SpinePortraitModel,
	SpinePortraitSource,
} from "../../src/lib/spine-types";
import { dataLog } from "./data-log";
import { publicRoot, root } from "./public-assets";

const imageSettings = { width: 640, height: 520, density: 2, quality: 95 };

async function launchRenderer(): Promise<Browser> {
	const options = {
		headless: true,
		args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
	};
	if (process.env.SPINE_BROWSER_PATH)
		return chromium.launch({
			...options,
			executablePath: process.env.SPINE_BROWSER_PATH,
		});
	for (const channel of ["chrome", "msedge"]) {
		try {
			return await chromium.launch({ ...options, channel });
		} catch {
			// Try the other installed browser before requiring explicit configuration.
		}
	}
	if (existsSync(chromium.executablePath())) return chromium.launch(options);
	throw new Error(
		"Rendering Spine static images requires Chrome or Edge. Set SPINE_BROWSER_PATH to a Chromium executable if it is installed elsewhere.",
	);
}

export async function publishSpinePosters(
	sources: Record<number, SpinePortraitSource>,
) {
	// Bundle the actual player so framing, initial pose, textures and blending
	// cannot drift between the baked image and the animated version.
	const build = await Bun.build({
		entrypoints: [join(root, "src/lib/spine-player.ts")],
		target: "browser",
		format: "esm",
		minify: true,
	});
	if (!build.success)
		throw new AggregateError(
			build.logs,
			"Unable to bundle the Spine poster renderer",
		);
	const bundle = await build.outputs[0].text();
	const assets = new Map<string, string>();
	const jobs = new Map<
		string,
		{ model: SpinePortraitSource; output: string }
	>();
	const catalog: Record<number, SpinePortraitModel> = {};
	for (const [id, model] of Object.entries(sources)) {
		let assetHash = assets.get(model.skeleton);
		if (!assetHash) {
			const atlasPath = join(publicRoot, model.atlas.slice(1));
			const atlasText = readFileSync(atlasPath, "utf8");
			const hash = createHash("sha256")
				.update(readFileSync(join(publicRoot, model.skeleton.slice(1))))
				.update(atlasText);
			for (const page of new TextureAtlas(atlasText).pages)
				hash.update(readFileSync(join(dirname(atlasPath), page.name)));
			assetHash = hash.digest("hex");
			assets.set(model.skeleton, assetHash);
		}
		const key = createHash("sha256")
			.update(bundle)
			.update(assetHash)
			.update(JSON.stringify(model))
			.update(JSON.stringify(imageSettings))
			.digest("hex")
			.slice(0, 16);
		const poster = `${model.skeleton.slice(0, model.skeleton.lastIndexOf("/"))}/first-frame-${key}.webp`;
		const output = join(publicRoot, poster.slice(1));
		catalog[Number(id)] = { ...model, poster };
		if (!existsSync(output)) jobs.set(output, { model, output });
	}
	// Unchanged assets and framing need neither a browser nor re-encoding.
	if (!jobs.size) return { catalog, rendered: 0 };
	const browser = await launchRenderer();
	try {
		const origin = "http://spine.invalid";
		const page = await browser.newPage({
			viewport: { width: imageSettings.width, height: imageSettings.height },
			deviceScaleFactor: imageSettings.density,
		});
		await page.route(`${origin}/**`, async (route) => {
			const pathname = decodeURIComponent(
				new URL(route.request().url()).pathname,
			);
			if (pathname === "/")
				return route.fulfill({
					contentType: "text/html",
					body: "<!doctype html><body style='margin:0'>",
				});
			if (pathname === "/renderer.js")
				return route.fulfill({ contentType: "text/javascript", body: bundle });
			const path = resolve(publicRoot, `.${pathname}`);
			if (!path.startsWith(resolve(publicRoot) + sep)) return route.abort();
			return route.fulfill({ path });
		});
		await page.goto(origin);
		for (const [index, { model, output }] of [...jobs.values()].entries()) {
			const dataUrl = await page.evaluate(
				async ({ model, width, height }) => {
					const rendererUrl = "/renderer.js";
					const {
						createSpinePlayer,
					}: typeof import("../../src/lib/spine-player") = await import(
						rendererUrl
					);
					const canvas = document.createElement("canvas");
					canvas.style.width = `${width}px`;
					canvas.style.height = `${height}px`;
					document.body.append(canvas);
					const player = await createSpinePlayer(
						canvas,
						model,
						new AbortController().signal,
						() => {},
					);
					try {
						// Players start paused after drawing idle at t=0. Capture within the
						// same browser task, before WebGL's drawing buffer can be discarded.
						return canvas.toDataURL("image/png");
					} finally {
						player.dispose();
						canvas.remove();
					}
				},
				{ model, ...imageSettings },
			);
			const png = Buffer.from(
				dataUrl.slice(dataUrl.indexOf(",") + 1),
				"base64",
			);
			const temporary = `${output}.tmp`;
			await new Bun.Image(png)
				.webp({ quality: imageSettings.quality })
				.write(temporary);
			renameSync(temporary, output);
			dataLog.detail(
				`Rendered Spine first frame ${index + 1}/${jobs.size}: ${model.skeleton}`,
			);
		}
	} finally {
		await browser.close();
	}
	return { catalog, rendered: jobs.size };
}
