import type { Window } from "@tauri-apps/api/window";

/** Show before enabling click-through: a hidden GTK window may be unrealized. */
export async function setOverlayVisible(
	win: Pick<Window, "show" | "hide" | "setIgnoreCursorEvents">,
	visible: boolean,
): Promise<void> {
	if (visible) {
		await win.show();
		await win.setIgnoreCursorEvents(true);
	} else {
		await win.hide();
	}
}
