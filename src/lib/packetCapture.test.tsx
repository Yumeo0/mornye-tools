import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PacketCapturePanel } from "../components/settings/PacketCapturePanel";
import type { RecordingStatus } from "./sniffer";

const recorded: RecordingStatus = {
	revision: 1,
	recording: false,
	frames: 3,
	packets: 0,
	stored_bytes: 1024,
	max_bytes: 64 * 1024 * 1024,
	max_frames: 50_000,
	limit_reached: false,
	started_at_ms: 1000,
};

function buttons(status: RecordingStatus | undefined, available = true) {
	const markup = renderToStaticMarkup(
		<PacketCapturePanel status={status} available={available} />,
	);
	return new Map(
		[...markup.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].map(
			([, attributes, contents]) => [
				contents.replace(/<[^>]+>/g, "").trim(),
				/\bdisabled(?:=|\s|$)/.test(attributes),
			],
		),
	);
}

test("raw and parsed exports stay available when no game packets could be decoded", () => {
	const controls = buttons(recorded);
	expect(controls.get("Export raw (.pcap)")).toBe(false);
	expect(controls.get("Export parsed (.json)")).toBe(false);
});

test("recording can be stopped and exported while clearing requires a stopped recording", () => {
	const controls = buttons({ ...recorded, recording: true });
	expect(controls.get("Stop recording")).toBe(false);
	expect(controls.get("Clear recording")).toBe(true);
	expect(controls.get("Export raw (.pcap)")).toBe(false);
	const full = buttons({ ...recorded, limit_reached: true });
	expect(full.get("Start recording")).toBe(true);
	expect(full.get("Clear recording")).toBe(false);
});

test("browser and disconnected desktop views cannot invoke capture commands", () => {
	const controls = buttons(recorded, false);
	expect(controls.size).toBe(4);
	expect([...controls.values()].every(Boolean)).toBe(true);
	const empty = buttons(undefined);
	expect(empty.get("Export raw (.pcap)")).toBe(true);
});
