import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ProfileOverview } from "@/components/tabs/OverviewTab";
import {
	type AccountProfile,
	type AccountSnapshot,
	EMPTY_ACCOUNT,
} from "@/lib/account";
import {
	overviewCounts,
	profileLabel,
	profilePortrait,
} from "@/lib/profileOverview";

const snapshot = {
	...EMPTY_ACCOUNT,
	profile: {
		id: "europe-123456789",
		playerId: 123456789,
		serverId: "europe",
		region: "Europe",
	},
	player: {
		playerId: 123456789,
		name: "Rover",
		level: 80,
		worldLevel: 7,
		signature: "Ready to explore.",
		headId: 82001402,
	},
	updatedAt: "2026-11-07T12:30:00Z",
} satisfies AccountSnapshot;

function render(
	account: AccountSnapshot = snapshot,
	error: string | null = null,
) {
	return renderToStaticMarkup(
		<ProfileOverview
			snapshot={account}
			error={error}
			active
			onNavigate={() => {}}
		/>,
	);
}

describe("profile overview", () => {
	test("shows the selected profile details but does not render its hidden UID anywhere", () => {
		const markup = render();
		for (const text of [
			"Rover",
			"Europe",
			"Union level",
			"World level",
			"Ready to explore.",
			"Last updated",
			"Show UID",
			"View characters",
		]) {
			expect(markup).toContain(text);
		}
		expect(markup).toContain('aria-pressed="false"');
		expect(markup).not.toContain("123456789");
		expect(markup).not.toContain("Hide UID");
	});

	test("empty profiles show onboarding, not invented player stats", () => {
		const markup = render(EMPTY_ACCOUNT);
		expect(markup).toContain("No profile data yet");
		expect(markup).toContain("Open settings");
		expect(markup).not.toContain("Union level");
	});

	test("old snapshots without portraits or dates have useful fallbacks", () => {
		const markup = render({
			...snapshot,
			player: { ...snapshot.player, headId: undefined },
			updatedAt: "invalid",
		});
		expect(markup).toContain("Your selected portrait will appear");
		expect(markup).toContain("Not yet captured");
		expect(markup).not.toContain("Invalid Date");
	});

	test("failed refreshes leave saved profile data visible", () => {
		const markup = render(snapshot, "Refresh failed");
		expect(markup).toContain("Refresh failed");
		expect(markup).toContain("Rover");
		expect(markup).not.toContain("123456789");
	});

	test("profile selector labels do not leak unnamed account UIDs", () => {
		const profile: AccountProfile = {
			...snapshot.profile,
			name: "",
			updatedAt: "",
		};
		expect(profileLabel(profile, 0)).toBe("Profile 1 · Europe");
		expect(profileLabel({ ...profile, name: "Rover" }, 0)).toBe(
			"Rover · Europe",
		);
		expect(profileLabel({ ...profile, serverId: "unknown" }, 1)).toBe(
			"Profile 2 · Region unknown",
		);
	});

	test("selected head item resolves actual character, skin and event artwork", () => {
		expect(profilePortrait(82001402)).toBe(
			"/images/resonators/portraits/1.webp",
		);
		expect(profilePortrait(82011304)).toBe("/images/profiles/1.webp");
		expect(profilePortrait(82000017)).toBe("/images/profiles/21.webp");
		for (const value of [undefined, null, 0, -1, 999999999])
			expect(profilePortrait(value)).toBeUndefined();
	});

	test("collection totals include stacked echoes and handle legacy snapshots", () => {
		expect(overviewCounts(EMPTY_ACCOUNT)).toEqual({
			characters: 0,
			weapons: 0,
			echoes: 0,
			inventory: 0,
			teams: 0,
		});
		const echo = {
			incrId: 1,
			itemId: 1,
			monsterId: 1,
			setId: 1,
			level: 0,
			funcValue: 0,
			stackCount: 13,
			mainProps: [],
			subProps: [],
			source: "sniffer" as const,
		};
		expect(
			overviewCounts({
				...EMPTY_ACCOUNT,
				echoes: [echo, { ...echo, incrId: 2, stackCount: 0 }],
			}).echoes,
		).toBe(14);
	});
});
