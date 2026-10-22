import { useId } from "react";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";

import type { FilterOption } from "./types";

export function FilterSelect({
	label,
	value,
	options,
	onChange,
}: {
	label: string;
	value: string;
	options: FilterOption[];
	onChange: (value: string) => void;
}) {
	const labelId = useId();
	const selected = options.find((option) => option.value === value);
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<span id={labelId} className="text-[10px] text-muted-foreground">
				{label}
			</span>
			<Select value={value} onValueChange={(v) => onChange(v ?? "any")}>
				<SelectTrigger aria-labelledby={labelId} size="sm" className="w-full">
					{selected?.icon && (
						<img
							src={selected.icon}
							alt=""
							className="size-3.5 shrink-0 object-contain"
						/>
					)}
					<span className="min-w-0 flex-1 truncate text-left">
						{selected?.label ?? value}
					</span>
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.icon && (
									<img
										src={option.icon}
										alt=""
										className="size-3.5 shrink-0 object-contain"
									/>
								)}
								{option.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
