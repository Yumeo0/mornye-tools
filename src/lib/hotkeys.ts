export interface Hotkey {
	key: string;
	ctrl: boolean;
	alt: boolean;
	shift: boolean;
	meta: boolean;
}

type KeyEvent = Pick<
	KeyboardEvent,
	| "key"
	| "ctrlKey"
	| "altKey"
	| "shiftKey"
	| "metaKey"
	| "repeat"
	| "isComposing"
	| "defaultPrevented"
>;

const NAMED_KEYS = new Set([
	"Enter",
	" ",
	"Backspace",
	"Delete",
	"Insert",
	"Home",
	"End",
	"PageUp",
	"PageDown",
	"ArrowUp",
	"ArrowDown",
	"ArrowLeft",
	"ArrowRight",
]);

function normalizeKey(key: string): string | null {
	if (key.length === 1) return key.toLowerCase();
	return NAMED_KEYS.has(key) || /^F([1-9]|1\d|2[0-4])$/.test(key) ? key : null;
}

export function parseHotkey(value: unknown): Hotkey | null {
	if (!value || typeof value !== "object") return null;
	const saved = value as Partial<Hotkey>;
	const key = typeof saved.key === "string" ? normalizeKey(saved.key) : null;
	if (
		!key ||
		![saved.ctrl, saved.alt, saved.shift, saved.meta].every(
			(flag) => typeof flag === "boolean",
		)
	)
		return null;
	return {
		key,
		ctrl: saved.ctrl === true,
		alt: saved.alt === true,
		shift: saved.shift === true,
		meta: saved.meta === true,
	};
}

/** Ignore modifiers on their own, IME input, held keys and cancelled events. */
export function hotkeyFromEvent(event: KeyEvent): Hotkey | null {
	if (event.repeat || event.isComposing || event.defaultPrevented) return null;
	const key = normalizeKey(event.key);
	return key
		? {
				key,
				ctrl: event.ctrlKey,
				alt: event.altKey,
				shift: event.shiftKey,
				meta: event.metaKey,
			}
		: null;
}

export function matchesHotkey(event: KeyEvent, hotkey: Hotkey): boolean {
	const pressed = hotkeyFromEvent(event);
	return (
		pressed !== null &&
		pressed.key === hotkey.key &&
		pressed.ctrl === hotkey.ctrl &&
		pressed.alt === hotkey.alt &&
		pressed.shift === hotkey.shift &&
		pressed.meta === hotkey.meta
	);
}

export function formatHotkey(hotkey: Hotkey): string {
	const key =
		hotkey.key === " "
			? "Space"
			: hotkey.key.length === 1
				? hotkey.key.toUpperCase()
				: hotkey.key;
	return [
		hotkey.ctrl && "Ctrl",
		hotkey.alt && "Alt",
		hotkey.shift && "Shift",
		hotkey.meta && "Meta",
		key,
	]
		.filter(Boolean)
		.join("+");
}

/** Editing and open overlays keep their normal keyboard behavior. */
export function hotkeyTargetBlocked(event: KeyboardEvent): boolean {
	const target = event.target instanceof Element ? event.target : null;
	if (
		target?.closest(
			'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="combobox"], [role="listbox"]',
		)
	)
		return true;
	if (
		(event.key === "Enter" || event.key === " ") &&
		target?.closest(
			'button, a, [role="button"], [role="switch"], [role="checkbox"], [role="tab"]',
		)
	)
		return true;
	return (
		document.querySelector(
			'[data-slot="modal"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]',
		) !== null
	);
}
