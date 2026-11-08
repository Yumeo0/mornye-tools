import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { Echo } from "@/lib/account";
import { echoUpgradeRows } from "@/lib/echoUpgradeBatch";
import { EchoUpgradeQueueRow } from "./EchoUpgradeQueueRow";

test("consumed queue cards keep their echo details and render gray with a fodder status", () => {
	const echo: Echo = {
		incrId: 20,
		itemId: 60000015,
		monsterId: 390070051,
		setId: 1,
		level: 5,
		funcValue: 2,
		stackCount: 1,
		mainProps: [],
		subProps: [],
		source: "sniffer",
	};
	const [row] = echoUpgradeRows([echo]);
	const consumed = renderToStaticMarkup(
		<EchoUpgradeQueueRow
			row={{
				...row,
				outcome: "consumed",
				message: "Used as upgrade material.",
			}}
			index={0}
			running
		/>,
	);
	expect(consumed).toContain('data-echo-id="20"');
	expect(consumed).toContain('data-outcome="consumed"');
	expect(consumed).toContain("grayscale opacity-50");
	expect(consumed).toContain("Used as fodder");
	const discarded = renderToStaticMarkup(
		<EchoUpgradeQueueRow
			row={{ ...row, outcome: "discarded" }}
			index={0}
			running
		/>,
	);
	expect(discarded).not.toContain("grayscale");
});
