import type { Echo, Resonator, StatKey, Weapon } from "./account";
import type { OptResultStats } from "./calc/types";

export type PanelProp = [StatKey, number];
export interface CharacterPanelData {
	roles: Record<
		string,
		{
			base: number[];
			element: number;
			weapon: number;
			nodes: Record<string, PanelProp[]>;
		}
	>;
	roleGrowth: Record<string, number[]>;
	weapons: Record<
		string,
		{ first: PanelProp; second: PanelProp; curves: number[] }
	>;
	weaponGrowth: Record<string, number>;
	sets: Record<string, { count: number; props: PanelProp[] }[]>;
}
export interface CharacterPanelRequest {
	resonator: Resonator;
	weapon?: Weapon;
	echoes: Echo[];
}
export interface CharacterPanelResult {
	stats: OptResultStats;
	notes: string[];
}
