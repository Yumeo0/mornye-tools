import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import portraits from "@/configs/spine_portraits.json";
import type { SpinePlayer } from "@/lib/spine-player";
import type { SpinePortraitModel } from "@/lib/spine-types";
import { cn } from "@/lib/utils";

const models: Record<string, SpinePortraitModel> = portraits;
const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (callback: () => void) => {
	const media = window.matchMedia(motionQuery);
	media.addEventListener("change", callback);
	return () => media.removeEventListener("change", callback);
};
const reducedMotion = () => window.matchMedia(motionQuery).matches;

/** Character-ID lookup is shared by any future detail/showcase artwork slots. */
export function CharacterArtwork({
	characterId,
	image,
	name,
	className,
}: {
	characterId: number;
	image: string;
	name: string;
	className?: string;
}) {
	return (
		<Portrait
			key={characterId}
			model={models[characterId]}
			image={image}
			name={name}
			className={className}
		/>
	);
}

function Portrait({
	model,
	image,
	name,
	className,
}: {
	model?: SpinePortraitModel;
	image: string;
	name: string;
	className?: string;
}) {
	const host = useRef<HTMLDivElement>(null);
	const [ready, setReady] = useState(false);
	const [failed, setFailed] = useState(false);
	const [posterFailed, setPosterFailed] = useState(false);
	const reduceMotion = useSyncExternalStore(
		subscribeMotion,
		reducedMotion,
		() => true,
	);

	useEffect(() => {
		setReady(false);
		const element = host.current;
		if (!element || !model || reduceMotion || failed) return;
		const controller = new AbortController();
		const canvas = document.createElement("canvas");
		canvas.className = "size-full";
		element.append(canvas);
		let player: SpinePlayer | undefined;
		let loading = false;
		let visible = false;
		const fail = () => {
			if (!controller.signal.aborted) {
				setReady(false);
				setFailed(true);
			}
		};
		const syncPlayback = () => player?.setPlaying(visible && !document.hidden);
		const load = async () => {
			if (loading || controller.signal.aborted) return;
			loading = true;
			try {
				const { createSpinePlayer } = await import("@/lib/spine-player");
				controller.signal.throwIfAborted();
				const result = await createSpinePlayer(
					canvas,
					model,
					controller.signal,
					fail,
					() => {
						if (!controller.signal.aborted) setReady(true);
					},
				);
				if (controller.signal.aborted) {
					result.dispose();
					return;
				}
				player = result;
				syncPlayback();
			} catch {
				fail();
			}
		};
		const intersection = new IntersectionObserver(([entry]) => {
			visible = entry.isIntersecting;
			if (visible) void load();
			syncPlayback();
		});
		intersection.observe(element);
		const resize = new ResizeObserver(() => {
			try {
				player?.resize();
			} catch {
				fail();
			}
		});
		resize.observe(element);
		canvas.addEventListener("webglcontextlost", fail);
		document.addEventListener("visibilitychange", syncPlayback);
		return () => {
			controller.abort();
			intersection.disconnect();
			resize.disconnect();
			document.removeEventListener("visibilitychange", syncPlayback);
			canvas.removeEventListener("webglcontextlost", fail);
			player?.dispose();
			canvas.remove();
		};
	}, [model, reduceMotion, failed]);

	// Swap matching frames together. Crossfading two transparent layers briefly
	// reduces their combined coverage and makes the portrait flash darker.
	const animated = ready && !failed && !reduceMotion;
	const poster = posterFailed ? undefined : model?.poster;
	const staticImage = poster || image;
	return (
		<div
			role="img"
			aria-label={name}
			className={cn("relative overflow-hidden pointer-events-none", className)}
		>
			{staticImage && (
				<img
					src={staticImage}
					alt=""
					onError={poster ? () => setPosterFailed(true) : undefined}
					className={cn(
						poster
							? "absolute top-0 left-1/2 h-full w-auto max-w-none -translate-x-1/2"
							: "size-full object-contain",
						animated && "opacity-0",
					)}
				/>
			)}
			<div
				ref={host}
				aria-hidden="true"
				className={cn(
					"absolute inset-0",
					animated ? "opacity-100" : "opacity-0",
				)}
			/>
		</div>
	);
}
