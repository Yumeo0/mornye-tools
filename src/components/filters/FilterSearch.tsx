import type { ComponentProps } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { FilterField } from "./FilterField";

/** Search box of a filter bar; `inputProps` passes through focus/keys/styling. */
export function FilterSearch({
	value,
	onChange,
	placeholder,
	inputProps,
	className,
}: {
	value: string;
	onChange: (value: string) => void;
	placeholder: string;
	inputProps?: ComponentProps<"input">;
	className?: string;
}) {
	return (
		<FilterField label="Search" className={cn("min-w-44 flex-1", className)}>
			<Input
				type="text"
				{...inputProps}
				placeholder={placeholder}
				value={value}
				onChange={(event) => onChange(event.target.value)}
			/>
		</FilterField>
	);
}
