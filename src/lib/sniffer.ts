// Frontend bridge for the always-on sniffer (`src-tauri/src/sniffer`).

import { invoke } from "@tauri-apps/api/core";

export interface SnifferStatus {
	paused: boolean;
	capturing: boolean;
	game_process_found: boolean;
	npcap_available: boolean;
	is_elevated: boolean;
	session_key_cached: boolean;
	rsa_key_path: string | null;
	rsa_key_fingerprint: string | null;
	rsa_key_valid: boolean;
	rsa_key_error: string | null;
	tables_loaded: boolean;
	packets_seen: number;
	last_error: string | null;
	log: string[];
}

export async function getStatus(): Promise<SnifferStatus> {
	return invoke<SnifferStatus>("sniffer_get_status");
}

export async function pauseSniffer(): Promise<void> {
	await invoke("sniffer_pause");
}

export async function resumeSniffer(): Promise<void> {
	await invoke("sniffer_resume");
}

export async function setSessionKey(key: string): Promise<void> {
	await invoke("sniffer_set_session_key", { key });
}

export async function clearSessionKey(): Promise<void> {
	await invoke("sniffer_clear_session_key");
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
				: "Bundled RSA key is missing. Account sync is disabled until keys/client_private_key.pem is provided.",
		);
	}
	if (!status.npcap_available) {
		errors.push(
			"Packet capture is unavailable. Install Npcap (with WinPcap API-compatible mode) and run as Administrator.",
		);
	}
	return errors;
}
