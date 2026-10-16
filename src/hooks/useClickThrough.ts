// The overlay window is click-through so the game stays playable. To allow
// clicking the stats card we poll the global cursor position and disable
// click-through only while the cursor hovers `ref`'s element.

import { cursorPosition, getCurrentWindow } from "@tauri-apps/api/window";
import { type RefObject, useEffect } from "react";

export function useClickThrough(
	ref: RefObject<HTMLElement | null>,
	active: boolean,
): void {
	useEffect(() => {
		if (!active) return;

		const win = getCurrentWindow();
		let disposed = false;
		let timer: number | undefined;
		let ignoring = true;

		const setIgnoring = (value: boolean) => {
			if (ignoring === value) return;
			ignoring = value;
			win.setIgnoreCursorEvents(value).catch(() => {});
		};

		const isOverCard = (cssX: number, cssY: number) => {
			const node = ref.current;
			if (!node) return false;
			const rect = node.getBoundingClientRect();
			return (
				cssX >= rect.left &&
				cssX <= rect.right &&
				cssY >= rect.top &&
				cssY <= rect.bottom
			);
		};

		const pollCursor = async () => {
			if (disposed) return;
			try {
				const [cursor, origin, scale] = await Promise.all([
					cursorPosition(),
					win.outerPosition(),
					win.scaleFactor(),
				]);
				// Cursor and window origin are physical pixels, the card rect
				// is CSS pixels.
				setIgnoring(
					!isOverCard(
						(cursor.x - origin.x) / scale,
						(cursor.y - origin.y) / scale,
					),
				);
			} catch {
				// Not running inside Tauri
			}
			timer = window.setTimeout(pollCursor, 100);
		};

		// Re-enable click-through instantly once the cursor leaves the card.
		const onMouseMove = (event: MouseEvent) => {
			setIgnoring(!isOverCard(event.clientX, event.clientY));
		};
		window.addEventListener("mousemove", onMouseMove);
		pollCursor();

		return () => {
			disposed = true;
			if (timer !== undefined) clearTimeout(timer);
			window.removeEventListener("mousemove", onMouseMove);
			setIgnoring(true);
		};
	}, [active, ref]);
}
