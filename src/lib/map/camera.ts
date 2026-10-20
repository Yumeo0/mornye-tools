import {
	type SetStateAction,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

interface MapView {
	x: number;
	y: number;
	scale: number;
}

const INITIAL_VIEW: MapView = { x: 0, y: 0, scale: 0.001 };
const TRAVEL_MS = 850;

/** Region travel can be interrupted by any direct camera interaction or a new destination. */
export function useMapCamera() {
	const [view, setState] = useState(INITIAL_VIEW);
	const current = useRef(view);
	const frame = useRef<number | null>(null);
	const cancel = useCallback(() => {
		if (frame.current !== null) cancelAnimationFrame(frame.current);
		frame.current = null;
	}, []);
	useEffect(() => cancel, [cancel]);
	const commit = useCallback((next: MapView) => {
		current.current = next;
		setState(next);
	}, []);
	const setView = useCallback(
		(next: SetStateAction<MapView>) => {
			cancel();
			commit(typeof next === "function" ? next(current.current) : next);
		},
		[cancel, commit],
	);
	const animateTo = useCallback(
		(next: MapView) => {
			cancel();
			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
				commit(next);
				return;
			}
			const from = current.current;
			const started = performance.now();
			const tick = (now: number) => {
				const progress = Math.min(1, (now - started) / TRAVEL_MS);
				if (progress === 1) {
					frame.current = null;
					commit(next);
					return;
				}
				const eased = progress * progress * (3 - 2 * progress);
				commit({
					x: from.x + (next.x - from.x) * eased,
					y: from.y + (next.y - from.y) * eased,
					scale: from.scale * (next.scale / from.scale) ** eased,
				});
				frame.current = requestAnimationFrame(tick);
			};
			frame.current = requestAnimationFrame(tick);
		},
		[cancel, commit],
	);
	return { view, setView, animateTo };
}
