import { expect, test } from "bun:test";
import { setOverlayVisible } from "./overlayWindow";

test("waits for the overlay to be shown before enabling click-through", async () => {
	const shown = Promise.withResolvers<void>();
	const calls: string[] = [];
	const win = {
		show: () => shown.promise,
		hide: async () => {},
		setIgnoreCursorEvents: async (ignore: boolean) => {
			calls.push(`ignore:${ignore}`);
		},
	};

	const pending = setOverlayVisible(win, true);
	await Promise.resolve();
	expect(calls).toEqual([]);
	shown.resolve();
	await pending;
	expect(calls).toEqual(["ignore:true"]);
});

test("hides an unrealized overlay without changing its input region", async () => {
	const calls: string[] = [];
	await setOverlayVisible(
		{
			show: async () => {
				calls.push("show");
			},
			hide: async () => {
				calls.push("hide");
			},
			setIgnoreCursorEvents: async () => {
				calls.push("ignore");
			},
		},
		false,
	);
	expect(calls).toEqual(["hide"]);
});

test("does not change the input region when showing the overlay fails", async () => {
	let ignored = false;
	const pending = setOverlayVisible(
		{
			show: async () => {
				throw new Error("show failed");
			},
			hide: async () => {},
			setIgnoreCursorEvents: async () => {
				ignored = true;
			},
		},
		true,
	);
	await expect(pending).rejects.toThrow("show failed");
	expect(ignored).toBe(false);
});
