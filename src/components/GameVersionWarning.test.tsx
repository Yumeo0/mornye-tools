import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GameVersionWarning } from "./GameVersionWarning";

test("unsupported release notice shows both versions and access to update settings", () => {
	const html = renderToStaticMarkup(
		<GameVersionWarning
			version={{ installed: "3.9.0", supported: "3.8.0", too_new: true }}
			onOpenUpdates={() => {}}
		/>,
	);
	for (const text of [
		'role="alert"',
		"Game update not yet supported",
		"Wuthering Waves 3.9.0",
		"3.8.0",
		"Account sync",
		"Open update settings",
	])
		expect(html).toContain(text);
});

test("supported and unknown installations do not display a compatibility warning", () => {
	for (const version of [
		undefined,
		{ installed: null, supported: "3.8.0", too_new: false },
		{ installed: "3.8.0", supported: "3.8.0", too_new: false },
	])
		expect(
			renderToStaticMarkup(
				<GameVersionWarning version={version} onOpenUpdates={() => {}} />,
			),
		).toBe("");
});
