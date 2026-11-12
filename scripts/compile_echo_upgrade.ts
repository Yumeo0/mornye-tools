import { join } from "node:path";
import { dataLog } from "./lib/data-log";

interface EchoItem {
	ItemId: number;
	LevelUpGroupId: number;
	QualityId: number;
}
interface EchoLevel {
	GroupId: number;
	Level: number;
	Exp: number;
}
interface ExpItem {
	ItemId: number;
	Exp: number;
}
interface Quality {
	Quality: number;
	LevelLimit: number;
	SlotUnlockLevel: number[];
	IdentifyCost: { Key: number; Value: number }[];
	IdentifyCoin: number;
}
interface Param {
	KeyName: string;
	BinData: string;
}

export async function compileEchoUpgrade() {
	const root = join(import.meta.dirname, "..");
	const read = <T>(name: string): Promise<T[]> =>
		Bun.file(
			join(root, "data/wuwa-data/BinData/phantom", `${name}.json`),
		).json();
	const [items, levels, materials, qualities] = await Promise.all([
		read<EchoItem>("phantomitem"),
		read<EchoLevel>("phantomlevel"),
		read<ExpItem>("phantomexpitem"),
		read<Quality>("phantomquality"),
	]);
	const params: Param[] = await Bun.file(
		join(root, "data/wuwa-data/BinData/common_param/commonparam.json"),
	).json();
	const coinCost = params.find(
		(p) => p.KeyName === "phantom_level_up_coin_cost",
	);
	if (!coinCost) throw new Error("Missing echo leveling coin cost");
	const expReturn = params.find(
		(p) => p.KeyName === "phantom_exp_return_ratio",
	);
	if (!expReturn) throw new Error("Missing echo EXP return ratio");
	await Bun.write(
		join(root, "src/configs/echo_upgrade.json"),
		`${JSON.stringify(
			{
				creditsPerExp:
					Buffer.from(coinCost.BinData, "base64").readInt32LE(0) / 10000,
				echoExpReturn:
					Buffer.from(expReturn.BinData, "base64").readInt32LE(0) / 10000,
				items: Object.fromEntries(
					items.map((i) => [i.ItemId, [i.LevelUpGroupId, i.QualityId]]),
				),
				levels: Object.fromEntries(
					[...new Set(levels.map((l) => l.GroupId))].map((group) => [
						group,
						levels
							.filter((l) => l.GroupId === group)
							.sort((a, b) => a.Level - b.Level)
							.map((l) => l.Exp),
					]),
				),
				materials: materials.map((m) => ({ id: m.ItemId, exp: m.Exp })),
				limits: Object.fromEntries(
					qualities.map((q) => [q.Quality, q.LevelLimit]),
				),
				tuning: Object.fromEntries(
					qualities.map((q) => [
						q.Quality,
						{
							slots: q.SlotUnlockLevel,
							materials: q.IdentifyCost.map((c) => ({
								id: c.Key,
								count: c.Value,
							})),
							credits: q.IdentifyCoin,
						},
					]),
				),
			},
			null,
			"\t",
		)}\n`,
	);
	dataLog.info(
		`${items.length} echo items · ${qualities.length} quality tiers`,
	);
}

if (import.meta.main) await compileEchoUpgrade();
