import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dark chip for stats shown on top of card imagery (level, echoes, rank). */
function CardBadge({
	title,
	children,
	className,
}: {
	title: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<span
			title={title}
			className={cn(
				"flex items-center gap-1 bg-black/50 px-1.5 py-0.5 text-[10px] leading-none font-medium text-white/90",
				className,
			)}
		>
			{children}
		</span>
	);
}

export { CardBadge };

function Badge({
	className,
	variant = "secondary",
	...props
}: ComponentProps<"span"> & { variant?: "secondary" | "outline" }) {
	return (
		<span
			data-slot="badge"
			className={cn(
				"inline-flex w-fit shrink-0 items-center gap-1 border px-1.5 py-0.5 text-[10px] font-medium",
				variant === "outline"
					? "border-border text-foreground"
					: "border-transparent bg-secondary text-secondary-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export { Badge };
