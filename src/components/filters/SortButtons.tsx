import { ArrowDown, ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Sort-key buttons shared by the filter bars. `desc` is the current
 * direction; clicking the active key flips it, clicking another applies the
 * key's natural default.
 */
export function SortButtons<T extends string>({
	options,
	value,
	desc,
	onChange,
}: {
	options: readonly { value: T; label: string; desc: boolean }[];
	value: T;
	desc: boolean;
	onChange: (value: T, desc: boolean) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-1.5">
			<span className="text-[10px] text-muted-foreground">Sort</span>
			{options.map((option) => {
				const active = value === option.value;
				return (
					<Button
						key={option.value}
						type="button"
						variant={active ? "default" : "outline"}
						size="sm"
						title={
							active
								? `${option.label} (${desc ? "descending" : "ascending"})`
								: `Sort by ${option.label}`
						}
						onClick={() => onChange(option.value, active ? !desc : option.desc)}
					>
						{option.label}
						{active &&
							(desc ? (
								<ArrowDown className="size-3" />
							) : (
								<ArrowUp className="size-3" />
							))}
					</Button>
				);
			})}
		</div>
	);
}
