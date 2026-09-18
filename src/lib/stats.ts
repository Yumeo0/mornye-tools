// Mapping of tethys.gg stat codes to the full stat names used by the OCR output
export const STAT_NAMES: Record<string, string> = {
	HP: "HP",
	"HP%": "HP%",
	ATK: "ATK",
	"ATK%": "ATK%",
	DEF: "DEF",
	"DEF%": "DEF%",
	CR: "Crit. Rate",
	CD: "Crit. DMG",
	ER: "Energy Regen",
	"BA%": "Basic Attack DMG Bonus",
	"HA%": "Heavy Attack DMG Bonus",
	"Skill%": "Resonance Skill DMG Bonus",
	"Lib%": "Resonance Liberation DMG Bonus",
	"Fusion%": "Fusion DMG Bonus",
	"Glacio%": "Glacio DMG Bonus",
	"Aero%": "Aero DMG Bonus",
	"Electro%": "Electro DMG Bonus",
	"Spectro%": "Spectro DMG Bonus",
	"Havoc%": "Havoc DMG Bonus",
	"Heal%": "Healing Bonus",
};

export function statFullName(code: string): string {
	const trimmed = code.trim();
	return STAT_NAMES[trimmed] ?? trimmed;
}

// "CR/CD" -> ["Crit. Rate", "Crit. DMG"]
export function splitStatCodes(raw: string | null | undefined): string[] {
	if (!raw) return [];
	return raw.split("/").map(statFullName).filter(Boolean);
}

// Stat icon shown on tethys.gg
export function statIconUrl(code: string): string {
	return `https://r2.tethys.gg/asset/stat-icon/${code.replace("%", " Percent")}.webp`;
}

// "Dream of the Lost\nHavoc Eclipse/Midnight Veil" -> ["Dream of the Lost", "Havoc Eclipse", "Midnight Veil"]
export function sonataNames(sonata: string | null | undefined): string[] {
	if (!sonata) return [];
	return sonata
		.split("\n")
		.flatMap((part) => part.split("/"))
		.map((name) => name.trim())
		.filter(Boolean);
}

export interface StatTier {
	code: string;
	name: string;
}

// "ER:120%>CR=CD>ATK%>Lib%>ATK" -> tiers of equal-priority stats;
// ">" separates tiers, "=" marks stats of equal priority within a tier
export function parseSubstatTiers(
	raw: string | null | undefined,
): StatTier[][] {
	if (!raw) return [];
	return raw
		.split(">")
		.map((tier) =>
			tier
				.split(":")[0]
				.split("=")
				.map((code) => code.trim())
				.filter(Boolean)
				.map((code) => ({ code, name: statFullName(code) })),
		)
		.filter((tier) => tier.length > 0);
}
