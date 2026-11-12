// Frontend bridge for the always-on sniffer (`src-tauri/crates/sync/src/sniffer`).

import { invoke } from "@tauri-apps/api/core";

export interface SnifferStatus {
	game_version: GameVersionStatus;
	capturing: boolean;
	game_process_found: boolean;
	waiting_for_login: boolean;
	game_pid: number | null;
	game_ports: number[];
	capture_started_at_ms: number;
	last_frame_at_ms: number;
	last_packet_at_ms: number;
	capture_available: boolean;
	is_elevated: boolean;
	session_key_cached: boolean;
	rsa_key_path: string | null;
	rsa_key_fingerprint: string | null;
	rsa_key_valid: boolean;
	rsa_key_error: string | null;
	tables_loaded: boolean;
	packets_seen: number;
	/** Frames handed to the sniffer after the port pre-filter. */
	frames_fed: number;
	/** Frames rejected before decoding (CRC, size, KCP errors). */
	frame_errors: number;
	/** Frame errors from a stale KCP conversation (missed handshake). */
	conv_mismatches: number;
	/** Game packets that failed CRC/decryption/decompression. */
	packet_errors: number;
	/** Handled messages whose proto payload failed to decode. */
	decode_failures: number;
	/** Frames arrive without decoded packets; inspect login and error state. */
	stream_stalled: boolean;
	last_error: string | null;
	log: string[];
	recording: RecordingStatus;
}

export interface GameVersionStatus {
	installed: string | null;
	supported: string;
	too_new: boolean;
}

export interface RecordingStatus {
	revision: number;
	recording: boolean;
	frames: number;
	packets: number;
	stored_bytes: number;
	max_bytes: number;
	max_frames: number;
	limit_reached: boolean;
	started_at_ms: number | null;
}

export interface CaptureExport {
	path: string;
	frames: number;
	packets: number;
}

export function setPacketRecording(enabled: boolean): Promise<RecordingStatus> {
	return invoke("sniffer_set_recording", { enabled });
}

export function clearPacketRecording(): Promise<RecordingStatus> {
	return invoke("sniffer_clear_recording");
}

export function exportPacketCapture(
	format: "raw" | "parsed",
): Promise<CaptureExport> {
	return invoke("sniffer_export_capture", { format });
}

export interface CaptureHealth {
	label: string;
	detail: string;
	tone: "muted" | "ok" | "warning" | "error";
}

export function gameVersionWarning(
	version: GameVersionStatus | undefined,
): string | null {
	if (!version?.too_new || !version.installed) return null;
	return `Wuthering Waves ${version.installed} is newer than the ${version.supported} game version supported by this build. Account sync and game-data features may be incomplete. Update Mornye Tools when a compatible release is available.`;
}

/** Report progress in this capture, never a green light from old packet counts. */
export function captureHealth(
	status: SnifferStatus | null,
	error: string | null = null,
	now = Date.now(),
): CaptureHealth {
	if (error)
		return { label: "Status unavailable", detail: error, tone: "error" };
	if (!status)
		return {
			label: "Checking listener",
			detail: "Reading capture status…",
			tone: "muted",
		};
	const problem = blockingErrors(status)[0] ?? status.last_error;
	if (problem)
		return { label: "Listener error", detail: problem, tone: "error" };
	const compatibilityWarning = gameVersionWarning(status.game_version);
	if (compatibilityWarning)
		return {
			label: "Game version unsupported",
			detail: compatibilityWarning,
			tone: "warning",
		};
	if (!status.game_process_found)
		return {
			label: "Waiting for game",
			detail: "Passive sync starts automatically when Wuthering Waves opens.",
			tone: "muted",
		};
	if (!status.capturing)
		return {
			label: "Starting capture",
			detail: "Game found; opening packet capture.",
			tone: "muted",
		};
	if (status.waiting_for_login)
		return {
			label: "Reconnect game",
			detail:
				"The listener missed the start of this connection. Reconnect or relaunch the game with Mornye Tools running to capture login and the session key.",
			tone: "warning",
		};
	if (!status.session_key_cached)
		return {
			label: "Waiting for login",
			detail:
				"Listening for the session-key exchange. If you are already in-game, reconnect or relaunch the game with Mornye Tools running.",
			tone: "warning",
		};
	if (status.stream_stalled)
		return {
			label: "Capture stalled",
			detail:
				"Game frames are arriving without decoded packets. Check the errors below; reconnect the game if the passive stream lost a segment.",
			tone: "error",
		};
	if (
		status.last_packet_at_ms >= status.capture_started_at_ms &&
		status.last_packet_at_ms > 0 &&
		now - status.last_packet_at_ms < 15000
	)
		return {
			label: "Receiving game data",
			detail:
				"Game packets are decoding. Login and inventory messages update your account automatically.",
			tone: "ok",
		};
	return {
		label: "Listening",
		detail:
			"Capture is open. Waiting for game traffic; open an inventory menu to request fresh data.",
		tone: "muted",
	};
}

export async function getStatus(): Promise<SnifferStatus> {
	return invoke<SnifferStatus>("sniffer_get_status");
}

export async function importPcap(path: string): Promise<number> {
	return invoke<number>("sniffer_import_pcap", { path });
}

/** Blocking, actionable errors to surface in the UI (never a silent degrade). */
export function blockingErrors(status: SnifferStatus | null): string[] {
	if (!status) return [];
	const errors: string[] = [];
	if (!status.rsa_key_valid) {
		errors.push(
			status.rsa_key_error
				? `Bundled RSA key invalid: ${status.rsa_key_error}`
				: "Bundled RSA key is missing. Account sync is disabled until data/client_private_key.pem is provided.",
		);
	}
	if (!status.capture_available) {
		errors.push(
			"Packet capture is unavailable. On Linux, grant CAP_NET_RAW or use bun run tauri dev. On Windows, start the app as administrator.",
		);
	}
	return errors;
}
