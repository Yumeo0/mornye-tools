"use client";

import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

/** One selectable value of a [`MultiSelect`], optionally with an icon. */
export interface MultiSelectOption {
	value: string;
	label: string;
	icon?: string;
}

/**
 * Multi-value select built on the Base UI Select primitive: keyboard
 * navigation, typeahead, Escape/outside-click dismissal and the listbox ARIA
 * roles all come from the primitive. The trigger summarizes the selection
 * instead of showing a single value.
 */
export function MultiSelect({
	label,
	values,
	options,
	onChange,
	className,
}: {
	/** Caption above the trigger; omitted when the caller labels the field. */
	label?: string;
	values: readonly string[];
	options: readonly MultiSelectOption[];
	onChange: (values: string[]) => void;
	className?: string;
}) {
	const summary =
		values.length === 0
			? "Any"
			: values.length === 1
				? (options.find((option) => option.value === values[0])?.label ??
					values[0])
				: `${values.length} selected`;

	return (
		<div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
			{label !== undefined && (
				<span className="text-[10px] text-muted-foreground">{label}</span>
			)}
			<Select multiple value={[...values]} onValueChange={onChange}>
				<SelectTrigger
					size="sm"
					title={summary}
					className="w-full justify-between font-normal"
				>
					<span className="min-w-0 flex-1 truncate text-left">{summary}</span>
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.icon && (
								<img
									src={option.icon}
									alt=""
									className="size-3.5 shrink-0 object-contain"
								/>
							)}
							<span className="truncate">{option.label}</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
