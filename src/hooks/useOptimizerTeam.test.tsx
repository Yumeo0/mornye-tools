import { expect, test } from "bun:test";
import { useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { type AccountSnapshot, EMPTY_ACCOUNT } from "@/lib/account";
import { getCatalog } from "@/lib/calc/riley/engine.generated.js";
import { optimizerSetupKey } from "@/lib/optimizerSetup";
import { makeFixture } from "../../calculator/fixture";
import { useOptimizerTeam } from "./useOptimizerTeam";

function Harness() {
	const catalog = getCatalog();
	const { profile } = makeFixture(catalog);
	const snapshot = {
		...EMPTY_ACCOUNT,
		resonators: profile.members.map((m) => ({
			id: m.characterId,
			name: m.name,
			level: 90,
			chain: 0,
			breakthrough: 6,
			skills: [],
		})),
	};
	const support = profile.members.find((m) => !m.mainDps)!;
	const another = catalog.teams.find((p) => p.id !== profile.id)!;
	const team = useOptimizerTeam(snapshot, catalog);
	const [step, setStep] = useState(0);
	switch (step) {
		case 0:
			expect(team.targetId).toBe(0);
			expect(team.profile).toBeNull();
			expect(team.profiles).toHaveLength(catalog.teams.length);
			team.setProfileId(profile.id);
			break;
		case 1:
			expect(team.profile?.id).toBe(profile.id);
			expect(team.targetId).toBe(0);
			expect(team.members).toEqual([]);
			team.setTargetId(1404);
			break;
		case 2:
			expect(team.profile?.id).toBe(profile.id);
			expect(team.members).toHaveLength(3);
			team.patchRole(support.characterId, { echoSource: "rotation" });
			break;
		case 3:
			expect(
				team.members.find((m) => m.characterId === support.characterId)
					?.echoSource,
			).toBe("rotation");
			team.setTargetId(support.characterId);
			break;
		case 4:
			expect(team.profile?.id).toBe(profile.id);
			expect(team.targetId).toBe(support.characterId);
			expect(
				team.members.find((m) => m.characterId === support.characterId)
					?.echoSource,
			).toBe("equipped");
			team.setTargetId(-1);
			break;
		case 5:
			expect(team.targetId).toBe(support.characterId);
			team.setTargetId(0);
			break;
		case 6:
			expect(team.profile?.id).toBe(profile.id);
			expect(team.targetId).toBe(0);
			team.setProfileId(another.id);
			break;
		case 7:
			expect(team.profile?.id).toBe(another.id);
			expect(team.targetId).toBe(0);
			expect(team.members).toEqual([]);
			team.setMode("team");
			break;
		default:
			expect(team.mode).toBe("team");
			return <span>complete</span>;
	}
	// React's server renderer processes render-phase updates, so this drives
	// the real hook through user actions without mocking React or a DOM.
	setStep(step + 1);
	return null;
}

function Remount({ snapshot }: { snapshot: AccountSnapshot }) {
	const team = useOptimizerTeam(snapshot, getCatalog());
	return (
		<span>
			{team.profile?.id ?? "empty"}:{team.mode}
		</span>
	);
}

test("load rotation before choosing a target; retain setup across remounts and isolate accounts", async () => {
	const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
	const disk = new Map<string, string>();
	const written = Promise.withResolvers<void>();
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		value: {
			getItem: (key: string) => disk.get(key) ?? null,
			setItem: (key: string, value: string) => {
				disk.set(key, value);
				written.resolve();
			},
		},
	});
	try {
		expect(renderToStaticMarkup(<Harness />)).toContain("complete");
		await written.promise;
		const saved = JSON.parse(disk.get(`filters.${optimizerSetupKey(null)}`)!);
		const catalog = getCatalog();
		const { profile } = makeFixture(catalog);
		const another = catalog.teams.find((p) => p.id !== profile.id)!;
		const support = profile.members.find((m) => !m.mainDps)!;
		expect(saved.profileId).toBe(another.id);
		expect(saved.targetId).toBe(0);
		expect(saved.mode).toBe("team");
		expect(saved.overrides[support.characterId].echoSource).toBe("rotation");

		expect(
			renderToStaticMarkup(<Remount snapshot={EMPTY_ACCOUNT} />),
		).toContain(`${another.id}:team`);
		expect(
			renderToStaticMarkup(
				<Remount
					snapshot={{
						...EMPTY_ACCOUNT,
						profile: {
							id: "optimizer-hook-other-account",
							playerId: 2,
							serverId: "eu",
							region: "EU",
						},
					}}
				/>,
			),
		).toContain("empty:damage");
	} finally {
		if (original) Object.defineProperty(globalThis, "localStorage", original);
		else Reflect.deleteProperty(globalThis, "localStorage");
	}
});
