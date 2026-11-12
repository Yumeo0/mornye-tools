import { expect, test } from "bun:test";
import {
	captureHealth,
	gameVersionWarning,
	type SnifferStatus,
} from "./sniffer";
import { createSnifferMonitor } from "./snifferStatus";

const healthy: SnifferStatus = {
	game_version: { installed: "3.8.0", supported: "3.8.0", too_new: false },
	capturing: true,
	game_process_found: true,
	capture_available: true,
	is_elevated: true,
	session_key_cached: true,
	rsa_key_valid: true,
	rsa_key_path: null,
	rsa_key_fingerprint: "abc",
	rsa_key_error: null,
	tables_loaded: true,
	packets_seen: 10,
	frames_fed: 20,
	frame_errors: 0,
	conv_mismatches: 0,
	packet_errors: 0,
	decode_failures: 0,
	stream_stalled: false,
	waiting_for_login: false,
	game_pid: 42,
	game_ports: [50000],
	capture_started_at_ms: 1000,
	last_frame_at_ms: 2000,
	last_packet_at_ms: 2000,
	last_error: null,
	log: [],
	recording: {
		revision: 0,
		recording: false,
		frames: 0,
		packets: 0,
		stored_bytes: 0,
		max_bytes: 64 * 1024 * 1024,
		max_frames: 50_000,
		limit_reached: false,
		started_at_ms: null,
	},
};

test("a newer installed game warns even before capture or when packets still decode", () => {
	const game_version = {
		installed: "3.9.0",
		supported: "3.8.0",
		too_new: true,
	};
	for (const game_process_found of [true, false]) {
		const health = captureHealth(
			{ ...healthy, game_version, game_process_found },
			null,
			3000,
		);
		expect(health.tone).toBe("warning");
		expect(health.label).toBe("Game version unsupported");
		expect(health.detail).toContain("Wuthering Waves 3.9.0");
		expect(health.detail).toContain("3.8.0");
	}
	expect(gameVersionWarning(healthy.game_version)).toBeNull();
	expect(gameVersionWarning({ ...game_version, installed: null })).toBeNull();
	expect(gameVersionWarning(undefined)).toBeNull();
});

test("capture health distinguishes process, login, decoding and stalls", () => {
	expect(captureHealth(null).label).toBe("Checking listener");
	expect(captureHealth({ ...healthy, game_process_found: false }).label).toBe(
		"Waiting for game",
	);
	expect(captureHealth({ ...healthy, capturing: false }).label).toBe(
		"Starting capture",
	);
	expect(captureHealth({ ...healthy, session_key_cached: false }).label).toBe(
		"Waiting for login",
	);
	expect(captureHealth({ ...healthy, waiting_for_login: true }).label).toBe(
		"Reconnect game",
	);
	expect(captureHealth({ ...healthy, stream_stalled: true }).label).toBe(
		"Capture stalled",
	);
	expect(captureHealth(healthy, null, 3000).label).toBe("Receiving game data");
});

test("old packet counts and an open socket cannot claim healthy sync", () => {
	expect(captureHealth(healthy, null, 30000).label).toBe("Listening");
	expect(
		captureHealth({ ...healthy, capture_started_at_ms: 2500 }, null, 3000)
			.label,
	).toBe("Listening");
});

test("IPC and permission failures override stale healthy status", () => {
	expect(captureHealth(healthy, "IPC disconnected", 3000)).toEqual({
		label: "Status unavailable",
		detail: "IPC disconnected",
		tone: "error",
	});
	expect(
		captureHealth({ ...healthy, capture_available: false }, null, 3000).tone,
	).toBe("error");
});

test("sidebar and diagnostics share one request and unsubscribe safely", async () => {
	let calls = 0;
	let resolve!: (status: SnifferStatus) => void;
	const monitor = createSnifferMonitor(() => {
		calls++;
		return new Promise((done) => {
			resolve = done;
		});
	});
	let updates = 0;
	const stopA = monitor.subscribe(() => updates++);
	const stopB = monitor.subscribe(() => updates++);
	expect(calls).toBe(1);
	resolve(healthy);
	await Promise.resolve();
	expect(updates).toBe(2);
	expect(monitor.getSnapshot().status).toBe(healthy);
	stopA();
	stopB();
});

test("an old request cannot overwrite a remounted monitor", async () => {
	const pending: ((status: SnifferStatus) => void)[] = [];
	const monitor = createSnifferMonitor(
		() => new Promise((resolve) => pending.push(resolve)),
	);
	const stopA = monitor.subscribe(() => {});
	stopA();
	const stopB = monitor.subscribe(() => {});
	pending[1](healthy);
	await Promise.resolve();
	pending[0]({ ...healthy, packets_seen: 0 });
	await Promise.resolve();
	expect(monitor.getSnapshot().status?.packets_seen).toBe(10);
	stopB();
});

test("poll failures are visible instead of silently keeping a green indicator", async () => {
	const monitor = createSnifferMonitor(() =>
		Promise.reject("backend unavailable"),
	);
	const stop = monitor.subscribe(() => {});
	await Promise.resolve();
	expect(monitor.getSnapshot().error).toBe("backend unavailable");
	stop();
});
