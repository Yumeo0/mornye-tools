import { normalizeStatName } from "./stats";

// Kuro's Korean probability disclosure, section 2 (retrieved 2026-11-11):
// https://sdk-prod-cdn-aws.kurogame-service.com/pro/agreement/common/language_ko/product_info.pdf
// Values are percentages rounded to four decimals. Normalize each row so that
// its probabilities sum to one rather than accumulating the disclosure's rounding.
const regular = [
	6.7961, 7.767, 20.3883, 24.2718, 17.4757, 14.5631, 5.8252, 2.9126,
];
const crit = [23.3333, 23.3333, 23.3333, 8, 8, 8, 3, 3];
const weights: Record<string, number[]> = {
	HP: regular,
	ATK: [6.7961, 52.4272, 37.8641, 2.9126],
	DEF: [14.5631, 44.6602, 32.0388, 8.7379],
	"HP%": regular,
	"ATK%": regular,
	"DEF%": regular,
	"Crit. Rate": crit,
	"Crit. DMG": crit,
	"Energy Regen": regular,
	"Basic Attack DMG Bonus": regular,
	"Heavy Attack DMG Bonus": regular,
	"Resonance Skill DMG Bonus": regular,
	"Resonance Liberation DMG Bonus": regular,
};

/** All thirteen types are equally likely; already revealed types leave the pool. */
export const echoRollProbabilities = Object.entries(weights).map(
	([name, values]) => {
		const total = values.reduce((sum, value) => sum + value, 0);
		return {
			name: normalizeStatName(name),
			probabilities: values.map((value) => value / total),
		};
	},
);
