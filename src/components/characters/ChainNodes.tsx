import { cn } from "@/lib/utils";

const ARC_POSITIONS = [
	{ x: 22, y: 10 },
	{ x: 53, y: 47 },
	{ x: 68, y: 95 },
	{ x: 68, y: 145 },
	{ x: 53, y: 193 },
	{ x: 22, y: 230 },
];

/** Resonance chain progress: per-node in-game icons, lit up to the owned chain. */
export function ChainNodes({
	chain,
	icons,
	size = "size-4",
	layout = "row",
	className,
}: {
	chain: number;
	icons: string[];
	size?: string;
	layout?: "row" | "arc";
	className?: string;
}) {
	if (icons.length === 0 && layout === "row") {
		return (
			<span className="text-xs font-medium text-muted-foreground">
				Chain {chain}
			</span>
		);
	}
	return (
		<span
			role="img"
			aria-label={`Resonance Chain ${chain}/6`}
			className={cn(
				layout === "arc"
					? "relative block"
					: "grid w-full max-w-41 grid-cols-6 gap-1",
				className,
			)}
			title={`Resonance Chain ${chain}/6`}
		>
			{layout === "arc" && (
				<svg
					aria-hidden="true"
					viewBox="0 0 96 240"
					preserveAspectRatio="none"
					className="pointer-events-none absolute inset-0 size-full text-muted-foreground/30"
				>
					<path
						d="M22 10 C86 60 86 180 22 230"
						fill="none"
						stroke="currentColor"
						strokeWidth="1"
						vectorEffect="non-scaling-stroke"
					/>
				</svg>
			)}
			{(layout === "arc"
				? Array.from({ length: 6 }, (_, i) => icons[i])
				: icons.slice(0, 6)
			).map((icon, index) => {
				const active = index < chain;
				const position = layout === "arc" ? ARC_POSITIONS[index] : undefined;
				const iconStyle = {
					filter: active
						? "brightness(1.7) drop-shadow(0 0 1px rgba(254, 240, 138, 0.95)) drop-shadow(0 0 4px rgba(250, 204, 21, 0.55))"
						: undefined,
					opacity: active ? undefined : 0.45,
				};
				return (
					<span
						key={position ? `node-${position.y}` : icon}
						title={`Resonance Chain ${index + 1} · ${active ? "Unlocked" : "Locked"}`}
						className={cn(
							"inline-flex shrink-0 items-center justify-center rounded-full bg-card ring-1 ring-border",
							!position && "aspect-square w-full",
							position &&
								"absolute size-9 shrink-0 -translate-1/2  rounded-full bg-card ring-1 ring-border",
						)}
						style={{
							left: position ? `${(position.x / 96) * 100}%` : undefined,
							top: position ? `${(position.y / 240) * 100}%` : undefined,
						}}
					>
						{icon ? (
							<img
								src={icon}
								alt=""
								className={cn(
									position ? "size-6" : size,
									"shrink-0 object-contain",
								)}
								style={iconStyle}
							/>
						) : (
							<span
								className={cn(
									position ? "size-4" : size,
									"shrink-0 rotate-45 border border-current bg-card",
								)}
								style={iconStyle}
							/>
						)}
					</span>
				);
			})}
		</span>
	);
}
