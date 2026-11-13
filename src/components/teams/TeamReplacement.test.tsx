import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
	type AccountSnapshot,
	EMPTY_ACCOUNT,
	type SavedTeam,
} from "@/lib/account";
import { getCatalog } from "@/lib/calc/riley/engine.generated.js";
import type { SuggestedTeam } from "@/lib/teamSuggestions";
import { SuggestedTeamCard } from "./SuggestedTeamCard";
import { TeamShowcase } from "./TeamShowcase";

const profile = getCatalog().teams.find(
	(team) => !team.errors.length && team.members.length === 3,
);
if (!profile)
	throw new Error("The catalog needs a complete team for replacement tests.");
const recommendation: SuggestedTeam = { id: profile.id, profile, damage: 1000 };
const saved: SavedTeam = {
	id: 2,
	name: "Tower",
	roleIds: profile.members.map((member) => member.characterId),
	isCurrent: false,
};
const snapshot: AccountSnapshot = { ...EMPTY_ACCOUNT, teams: [saved] };

function card({
	connected = true,
	busy = false,
	selected = false,
	replaceHint,
}: {
	connected?: boolean;
	busy?: boolean;
	selected?: boolean;
	replaceHint?: string;
} = {}) {
	return renderToStaticMarkup(
		<SuggestedTeamCard
			team={recommendation}
			chains={{}}
			connected={connected}
			busy={busy}
			selected={selected}
			replaceHint={replaceHint}
			onReplace={() => {}}
		/>,
	);
}

test("disconnected recommendations retain a focusable disabled replacement action with a connection hint", () => {
	const html = card({ connected: false });
	expect(html).toContain("Replace team");
	expect(html).toContain('aria-disabled="true"');
	expect(html).toContain('tabindex="0"');
	expect(html).toContain(
		'aria-description="Connect to this profile&#x27;s game account to replace teams."',
	);
});

test("connected recommendations allow selection and indicate the selected replacement", () => {
	const html = card({ selected: true });
	expect(html).toContain("Replace team");
	expect(html).toContain('aria-pressed="true"');
	expect(html).not.toContain('aria-disabled="true"');
	expect(html).not.toContain('disabled=""');
	expect(html).not.toContain("aria-description=");
});

test("replacement is disabled while saving or when saved teams are unavailable", () => {
	const busy = card({ busy: true });
	expect(busy).toContain('disabled=""');
	const unsynced = card({ replaceHint: "Sync your saved teams first." });
	expect(unsynced).toContain('aria-disabled="true"');
	expect(unsynced).toContain('aria-description="Sync your saved teams first."');
});

function showcase({ connected = true, choosing = true, busy = false } = {}) {
	return renderToStaticMarkup(
		<TeamShowcase
			team={saved}
			snapshot={snapshot}
			connected={connected}
			busy={busy}
			switching={false}
			replacing={busy && choosing}
			onReplace={choosing ? () => {} : undefined}
			onEdit={() => {}}
			onUse={() => {}}
		/>,
	);
}

test("saved teams become a single accessible replacement target while choosing", () => {
	const html = showcase();
	expect(html).toContain(
		'aria-label="Replace Tower with the recommended team"',
	);
	expect(html).toContain("Click to replace");
	expect(html.match(/<button\b/g)).toHaveLength(1);
	expect(html).not.toContain("Edit team");
	expect(html).not.toContain("Use team");
	const busy = showcase({ busy: true });
	expect(busy).toContain('aria-busy="true"');
	expect(busy).toContain('disabled=""');
	expect(busy).toContain("Replacing…");
});

test("saved teams keep normal actions outside selection or after disconnection", () => {
	for (const html of [
		showcase({ choosing: false }),
		showcase({ connected: false }),
	]) {
		expect(html).not.toContain('aria-label="Replace Tower');
		expect(html).toContain("Edit team");
		expect(html).toContain("Use team");
	}
});
