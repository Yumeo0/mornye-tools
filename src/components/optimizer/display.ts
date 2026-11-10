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
