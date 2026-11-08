import { expect, test } from "bun:test";
import { buildProfilePortraits } from "./compile_profile_data";

test("profile-head IDs resolve default, skin and event portraits without guessing role IDs", () => {
	const portraits = buildProfilePortraits(
		[
			{ Id: 82001402, RoleSkinId: 81001402, Icon: "" },
			{ Id: 82011304, RoleSkinId: 81011304, Icon: "skin-portrait" },
			{ Id: 82000017, RoleSkinId: 0, Icon: "event-portrait" },
			{ Id: 1, RoleSkinId: 0, Icon: "missing" },
			{ Id: 2, RoleSkinId: 0, Icon: "" },
		],
		[
			{ Id: 81001402, RoleHeadIconLarge: "character-head" },
			{ Id: 81011304, RoleHeadIconLarge: "not-the-selected-skin-head" },
		],
		(path) => (path === "missing" ? null : `/local/${path}.webp`),
	);
	expect(portraits).toEqual([
		{ id: 82000017, icon_head_256: "/local/event-portrait.webp" },
		{ id: 82001402, icon_head_256: "/local/character-head.webp" },
		{ id: 82011304, icon_head_256: "/local/skin-portrait.webp" },
	]);
});
