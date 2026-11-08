import { describe, expect, test } from "bun:test";
import { connectionAction, type DangerousStatus } from "./dangerous";

const signedOut: DangerousStatus = {
	asked: true,
	enabled: true,
	phase: "signed_out",
	email: null,
	signed_in: false,
	server_id: null,
	player_id: null,
	error: null,
	account_id: "first",
	accounts: [],
	profile_accounts: {},
};
describe("active account connection controls", () => {
	test("connects with the selected profile's linked account even if another account is signed out", () => {
		const profile = {
			id: "eu-123",
			playerId: 123,
			serverId: "eu",
			region: "Europe",
		};
		const status: DangerousStatus = {
			...signedOut,
			accounts: [
				{ id: "other", email: "other@example.invalid", remembered: true },
			],
			profile_accounts: { "eu-123": "other" },
		};
		expect(connectionAction(status, profile)).toBe("connect");
		expect(
			connectionAction(
				{ ...status, accounts: [{ ...status.accounts[0], remembered: false }] },
				profile,
			),
		).toBe("configure");
		expect(connectionAction({ ...status, accounts: [] }, profile)).toBe(
			"configure",
		);
		expect(connectionAction({ ...status, phase: "connected" }, profile)).toBe(
			"disconnect",
		);
	});
	test("a signed-out linked account cannot fall back to another signed-in account", () => {
		const status: DangerousStatus = {
			...signedOut,
			signed_in: true,
			phase: "ready",
			server_id: "eu",
			accounts: [
				{ id: "other", email: "other@example.invalid", remembered: false },
			],
			profile_accounts: { "eu-123": "other" },
		};
		expect(
			connectionAction(status, {
				id: "eu-123",
				playerId: 123,
				serverId: "eu",
				region: "Europe",
			}),
		).toBe("configure");
	});
	test("requires login and server selection before connecting", () => {
		expect(connectionAction(signedOut)).toBe("configure");
		expect(connectionAction({ ...signedOut, server_id: "Europe" })).toBe(
			"configure",
		);
		expect(connectionAction({ ...signedOut, phase: "ready" })).toBe(
			"configure",
		);
		expect(
			connectionAction({
				...signedOut,
				signed_in: true,
				phase: "ready",
				server_id: "Europe",
			}),
		).toBe("connect");
	});
	test("remembering an email is not the same as restoring a session", () => {
		expect(
			connectionAction({
				...signedOut,
				email: "rover@example.invalid",
				server_id: "Europe",
			}),
		).toBe("configure");
		expect(
			connectionAction({
				...signedOut,
				phase: "ready",
				email: "rover@example.invalid",
				server_id: "Europe",
			}),
		).toBe("configure");
	});
	test("offers cancellation or disconnect instead of duplicate connections", () => {
		expect(connectionAction({ ...signedOut, phase: "discovering" })).toBe(
			"wait",
		);
		expect(connectionAction({ ...signedOut, phase: "authenticating" })).toBe(
			"wait",
		);
		expect(connectionAction({ ...signedOut, phase: "connecting" })).toBe(
			"cancel",
		);
		expect(connectionAction({ ...signedOut, phase: "connected" })).toBe(
			"disconnect",
		);
		expect(connectionAction({ ...signedOut, phase: "disconnecting" })).toBe(
			"wait",
		);
	});
	test("requires adding an unlinked profile even when another login is ready", () => {
		expect(
			connectionAction(
				{ ...signedOut, phase: "ready", signed_in: true, server_id: "eu" },
				{ id: "eu-123", playerId: 123, serverId: "eu", region: "Europe" },
			),
		).toBe("configure");
	});
});
