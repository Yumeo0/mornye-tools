import { invoke, isTauri } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";
import type { ProfileIdentity } from "./account";

export type DangerousPhase =
	| "signed_out"
	| "authenticating"
	| "discovering"
	| "ready"
	| "connecting"
	| "connected"
	| "disconnecting";
export interface DangerousStatus {
	asked: boolean;
	enabled: boolean;
	phase: DangerousPhase;
	email: string | null;
	/** Remembered email does not by itself mean there is a usable sign-in. */
	signed_in: boolean;
	server_id: string | null;
	player_id: number | null;
	error: string | null;
	account_id: string;
	accounts: { id: string; email: string; remembered: boolean }[];
	profile_accounts: Record<string, string>;
}
export interface GameServer {
	id: string;
	name: string;
	region: string;
}
export interface ServerPlayer {
	server: GameServer;
	player: { playerId: number; name: string; level: number } | null;
	error: string | null;
}
interface Snapshot {
	status: DangerousStatus | null;
	servers: GameServer[];
	error: string | null;
}
const EMPTY_STATUS: DangerousStatus = {
	asked: false,
	enabled: false,
	phase: "signed_out",
	email: null,
	signed_in: false,
	server_id: null,
	player_id: null,
	error: null,
	account_id: "",
	accounts: [],
	profile_accounts: {},
};
const BROWSER_KEY = "mornye-dangerous-features-decision";
let snapshot: Snapshot = { status: null, servers: [], error: null };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;
let epoch = 0;
let activeActions = 0;
function publish(next: Partial<Snapshot>) {
	snapshot = { ...snapshot, ...next };
	for (const listener of listeners) listener();
}

export function connectionAction(
	status: DangerousStatus,
	profile?: ProfileIdentity | null,
): "connect" | "disconnect" | "cancel" | "configure" | "wait" {
	if (status.phase === "connected") return "disconnect";
	if (status.phase === "connecting") return "cancel";
	if (
		status.phase === "authenticating" ||
		status.phase === "discovering" ||
		status.phase === "disconnecting"
	)
		return "wait";
	const linkedId = profile && status.profile_accounts[profile.id];
	if (linkedId) {
		const linked = status.accounts.find((account) => account.id === linkedId);
		return linked?.remembered && !profile.provisional && profile.playerId > 0
			? "connect"
			: "configure";
	}
	if (profile) return "configure";
	if (status.phase === "ready" && status.signed_in && status.server_id)
		return "connect";
	return "configure";
}

export async function refreshDangerousStatus() {
	// A poll must not replace a command's result with its earlier server state.
	if (activeActions) return;
	const current = epoch;
	try {
		let status: DangerousStatus;
		if (isTauri()) status = await invoke<DangerousStatus>("dangerous_status");
		else {
			let decision: string | null = null;
			try {
				decision = localStorage.getItem(BROWSER_KEY);
			} catch {
				/* Storage may be unavailable. */
			}
			status = {
				...EMPTY_STATUS,
				asked: decision === "true" || decision === "false",
				enabled: decision === "true",
			};
		}
		if (current === epoch) publish({ status });
		return status;
	} catch {
		if (current === epoch)
			publish({
				error:
					"Could not load Dangerous Features settings. Retry to load your saved choice.",
			});
	}
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	if (listeners.size === 1) {
		void refreshDangerousStatus();
		timer = setInterval(() => void refreshDangerousStatus(), 1000);
	}
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) clearInterval(timer);
	};
}
export function useDangerousFeatures() {
	return useSyncExternalStore(subscribe, () => snapshot);
}
export const readDangerousFeatures = () => snapshot;

async function action(command: string, args?: Record<string, unknown>) {
	const current = ++epoch;
	activeActions += 1;
	publish({ error: null });
	try {
		const status = await invoke<DangerousStatus>(command, args);
		if (current === epoch) publish({ status });
		return status;
	} catch (error) {
		if (current === epoch)
			publish({
				error:
					typeof error === "string"
						? error
						: "The account operation failed. Try again.",
			});
	} finally {
		activeActions -= 1;
	}
}

export async function setDangerousEnabled(enabled: boolean) {
	if (isTauri()) return action("dangerous_set_enabled", { enabled });
	try {
		localStorage.setItem(BROWSER_KEY, String(enabled));
		publish({ status: { ...EMPTY_STATUS, asked: true, enabled }, error: null });
	} catch {
		publish({ error: "Your choice could not be saved in this browser." });
	}
}

let serversRequest: Promise<void> | undefined;
export async function loadDangerousServers() {
	if (!isTauri() || !snapshot.status?.enabled || snapshot.servers.length)
		return;
	serversRequest ??= (async () => {
		try {
			const servers = await invoke<GameServer[]>("dangerous_servers");
			publish({ servers, error: null });
		} catch (error) {
			publish({
				error:
					typeof error === "string"
						? error
						: "Could not load the official server list.",
			});
		} finally {
			serversRequest = undefined;
		}
	})();
	return serversRequest;
}
export const selectDangerousServer = (serverId: string) =>
	action("dangerous_select_server", { serverId });
export const selectDangerousAccount = (accountId: string) =>
	action("dangerous_select_account", { accountId });
/** Follow profile changes without overriding an account being edited in Settings. */
export function selectLinkedDangerousAccount(profileId: string) {
	const status = snapshot.status;
	if (
		!status?.enabled ||
		(status.phase !== "ready" && status.phase !== "signed_out")
	)
		return;
	const id = status.profile_accounts[profileId];
	if (id && id !== status.account_id) return selectDangerousAccount(id);
}
export const linkDangerousProfile = (
	profileId: string,
	accountId: string | null,
) => action("dangerous_link_profile", { profileId, accountId });
export const loginDangerousAccount = (email: string, password: string) =>
	action("dangerous_login", { email, password });
export const addDangerousProfile = (accountId: string, serverId: string) =>
	action("dangerous_add_profile", { accountId, serverId });
export const removeDangerousProfile = (profileId: string) =>
	action("dangerous_remove_profile", { profileId });
export async function discoverDangerousProfiles(
	accountId: string,
): Promise<ServerPlayer[]> {
	const current = ++epoch;
	activeActions += 1;
	publish({
		error: null,
		status: snapshot.status
			? { ...snapshot.status, phase: "discovering" }
			: null,
	});
	try {
		return await invoke<ServerPlayer[]>("dangerous_discover_profiles", {
			accountId,
		});
	} catch (error) {
		const message =
			typeof error === "string"
				? error
				: "Could not find player profiles. Try again.";
		if (current === epoch) publish({ error: message });
		throw new Error(message);
	} finally {
		activeActions -= 1;
		if (current === epoch) await refreshDangerousStatus();
	}
}
export const connectDangerous = () => action("dangerous_connect");
export const disconnectDangerous = () => action("dangerous_disconnect");
export const signOutDangerous = () => action("dangerous_sign_out");
