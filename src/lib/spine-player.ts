/** Loaded only when a detail portrait is visible and motion is enabled. */
import {
	AnimationState,
	AnimationStateData,
	AtlasAttachmentLoader,
	GLTexture,
	SceneRenderer,
	Skeleton,
	SkeletonBinary,
	TextureAtlas,
} from "@esotericsoftware/spine-webgl";
import { portraitFrame } from "./spine-framing";
import type { SpinePortraitSource } from "./spine-types";

export interface SpinePlayer {
	setPlaying: (playing: boolean) => void;
	resize: () => void;
	dispose: () => void;
}

async function fetchAsset(url: string, signal: AbortSignal) {
	const response = await fetch(url, { signal });
	if (!response.ok) throw new Error(`Unable to load Spine asset: ${url}`);
	return response;
}

export async function createSpinePlayer(
	canvas: HTMLCanvasElement,
	model: SpinePortraitSource,
	signal: AbortSignal,
	onError: () => void,
	onFirstFrame?: () => void,
): Promise<SpinePlayer> {
	let renderer: SceneRenderer | undefined;
	let atlas: TextureAtlas | undefined;
	let gl: WebGLRenderingContext | null = null;
	const images: ImageBitmap[] = [];
	let disposed = false;
	let playing = false;
	let frameId = 0;
	let previousTime = 0;
	let firstFrameDrawn = false;
	const dispose = () => {
		if (disposed) return;
		disposed = true;
		cancelAnimationFrame(frameId);
		renderer?.dispose();
		atlas?.dispose();
		for (const image of images) image.close();
		gl?.getExtension("WEBGL_lose_context")?.loseContext();
	};
	try {
		gl = canvas.getContext("webgl", {
			alpha: true,
			antialias: true,
			premultipliedAlpha: true,
			powerPreference: "low-power",
		});
		if (!gl) throw new Error("WebGL is unavailable");
		const [binary, text] = await Promise.all([
			fetchAsset(model.skeleton, signal).then((response) =>
				response.arrayBuffer(),
			),
			fetchAsset(model.atlas, signal).then((response) => response.text()),
		]);
		signal.throwIfAborted();
		atlas = new TextureAtlas(text);
		for (const page of atlas.pages) {
			const url = new URL(
				page.name,
				new URL(model.atlas, window.location.href),
			);
			const blob = await fetchAsset(url.href, signal).then((response) =>
				response.blob(),
			);
			const image = await createImageBitmap(blob, { premultiplyAlpha: "none" });
			images.push(image);
			signal.throwIfAborted();
			if (
				image.width > gl.getParameter(gl.MAX_TEXTURE_SIZE) ||
				image.height > gl.getParameter(gl.MAX_TEXTURE_SIZE)
			)
				throw new Error("Portrait exceeds the GPU texture limit");
			page.setTexture(new GLTexture(gl, image));
		}
		const data = new SkeletonBinary(
			new AtlasAttachmentLoader(atlas),
		).readSkeletonData(new Uint8Array(binary));
		const skeleton = new Skeleton(data);
		const state = new AnimationState(new AnimationStateData(data));
		const animation =
			data.animations.find((entry) => entry.name === "idle") ??
			data.animations[0];
		if (animation) state.setAnimation(0, animation.name, true);
		state.apply(skeleton);
		skeleton.updateWorldTransform();
		renderer = new SceneRenderer(canvas, gl);
		const scene = renderer;
		const context = gl;
		const resize = () => {
			// Supersample at standard DPI to smooth fine hair and mesh edges, while
			// preserving native resolution on displays above 2x pixel density.
			const ratio = Math.max(window.devicePixelRatio || 1, 2);
			const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
			const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
			if (canvas.width !== width || canvas.height !== height) {
				canvas.width = width;
				canvas.height = height;
			}
			const frame = portraitFrame(model.placement, width, height);
			scene.camera.position.set(frame.x, frame.y, 0);
			scene.camera.setViewport(frame.width, frame.height);
			scene.camera.update();
			context.viewport(0, 0, width, height);
		};
		const draw = () => {
			resize();
			context.clearColor(0, 0, 0, 0);
			context.clear(context.COLOR_BUFFER_BIT);
			scene.begin();
			scene.drawSkeleton(skeleton, atlas?.pages[0]?.pma ?? false);
			scene.end();
		};
		const frame = (time: number) => {
			if (disposed || !playing) return;
			try {
				const delta = previousTime
					? Math.min((time - previousTime) / 1000, 0.064)
					: 0;
				previousTime = time;
				state.update(delta);
				state.apply(skeleton);
				skeleton.updateWorldTransform();
				draw();
				if (!firstFrameDrawn) {
					firstFrameDrawn = true;
					onFirstFrame?.();
				}
				frameId = requestAnimationFrame(frame);
			} catch {
				playing = false;
				onError();
			}
		};
		draw();
		return {
			setPlaying(value) {
				if (disposed || playing === value) return;
				playing = value;
				previousTime = 0;
				cancelAnimationFrame(frameId);
				if (playing) frameId = requestAnimationFrame(frame);
			},
			resize() {
				if (!disposed) draw();
			},
			dispose,
		};
	} catch (error) {
		dispose();
		throw error;
	}
}
