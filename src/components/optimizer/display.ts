// Small display helpers shared by the optimizer views.

import type { TranslatedBuild } from "@/lib/calc/translate";
import { charactersById } from "@/lib/catalog";

export function roleLabel(build: TranslatedBuild): string {
	return (
		charactersById.get(Number(build.roleId))?.character_name ||
		build.resonator.name ||
		`Role ${build.roleId}`
	);
}

export function roleIcon(build: TranslatedBuild): string | undefined {
	return charactersById.get(Number(build.roleId))?.icon_head_256;
}

export function formatDamage(value: number): string {
	if (!Number.isFinite(value)) return "—";
	if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
	if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
	if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
	return value.toFixed(0);
}

export function formatMs(ms: number): string {
	if (!Number.isFinite(ms) || ms <= 0) return "—";
	const seconds = Math.round(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function statPercent(value: number): string {
	return `${value.toFixed(1)}%`;
}
