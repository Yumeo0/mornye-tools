import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { bundledReleaseNotes } from "@/lib/changelog";
import { ChangelogContent } from "./ChangelogContent";

test("shows curated release notes with semantic headings, lists and emphasis", () => {
	const notes = bundledReleaseNotes("0.3.3");
	if (!notes) throw new Error("Missing shipped changelog");
	const html = renderToStaticMarkup(<ChangelogContent body={notes.body} />);
	for (const element of ["<article", "<h3", "<ul", "<li", "<strong"]) {
		expect(html).toContain(element);
	}
	for (const raw of ["### Added", "**Rotation Builder", "chore:", "feat:"]) {
		expect(html).not.toContain(raw);
	}
	expect(html).toContain("Rotation Builder.");
	expect(html).toContain("Good to know");
});

test("renders legacy Markdown headings and nested lists as formatted content", () => {
	const html = renderToStaticMarkup(
		<ChangelogContent
			body={
				"## Improvements\n\n- **Echoes**\n  - Fewer wasted materials.\n\n1. Open Settings.\n2. View notes."
			}
		/>,
	);
	expect(html).toContain("<h2");
	expect(html).toContain("<ol");
	expect(html.match(/<ul/g)).toHaveLength(2);
	expect(html).not.toContain("## Improvements");
});

test("release content cannot inject HTML or load remote images", () => {
	const html = renderToStaticMarkup(
		<ChangelogContent
			body={
				'### Safe notes\n\n<script>alert(1)</script>\n\n<img src="https://example.invalid/tracker" onerror="alert(1)">\n\n![tracker](https://example.invalid/tracker)\n\n[Read more](javascript:alert(1))'
			}
		/>,
	);
	expect(html).toContain("Safe notes");
	expect(html).toContain("Read more");
	expect(html).not.toMatch(/<script|<img|onerror=|href=|src=/);
});
