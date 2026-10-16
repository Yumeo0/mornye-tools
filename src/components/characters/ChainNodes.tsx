/** Resonance chain progress: per-node in-game icons, lit up to the owned chain. */
export function ChainNodes({
	chain,
	icons,
	size = "size-4",
}: {
	chain: number;
	icons: string[];
	size?: string;
}) {
	if (icons.length === 0) {
		return (
			<span className="text-xs font-medium text-muted-foreground">
				Chain {chain}
			</span>
		);
	}
	return (
		<span
			className="flex items-center justify-center gap-1"
			title={`Resonance Chain ${chain}/6`}
		>
			{icons.slice(0, 6).map((icon, index) => {
				const active = index < chain;
				return (
					// Activated: plain white glyph with a tight yellow backglow
					<img
						key={icon}
						src={icon}
						alt=""
						className={`${size} object-contain`}
						style={{
							filter: active
								? "brightness(1.7) drop-shadow(0 0 1px rgba(254, 240, 138, 0.95)) drop-shadow(0 0 4px rgba(250, 204, 21, 0.55))"
								: undefined,
							opacity: active ? undefined : 0.25,
						}}
					/>
				);
			})}
		</span>
	);
}
