import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

/** Result-count line with the optional reset action (and extra buttons). */
export function FilterSummary({
	label,
	onReset,
	children,
}: {
	label: string;
	onReset?: () => void;
	children?: ReactNode;
}) {
	return (
		<div className="ml-auto flex items-center gap-2">
			<span className="text-xs text-muted-foreground">{label}</span>
			{children}
			{onReset && (
				<Button variant="ghost" size="sm" onClick={onReset}>
					Reset
				</Button>
			)}
		</div>
	);
}
