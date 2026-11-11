import { useId } from "react";
import { PreviewBadge } from "@/components/PreviewBadge";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { FilterOption } from "./types";

export function FilterSelect({
	label,
	value,
	options,
	onChange,
	disabled = false,
	hideLabel = false,
	iconSize = "sm",
	fitContent = false,
}: {
	label: string;
	value: string;
	options: FilterOption[];
	onChange: (value: string) => void;
	disabled?: boolean;
	hideLabel?: boolean;
	iconSize?: "sm" | "lg";
	/** Grow the selector and menu to keep long labels on one line. */
	fitContent?: boolean;
}) {
	const labelId = useId();
	const selected = options.find((option) => option.value === value);
	return (
		<div
			className={cn(
				"flex min-w-0 flex-col",
				!hideLabel && "gap-0.5",
				fitContent && "w-max min-w-full",
			)}
		>
			<span
				id={labelId}
				data-slot="filter-label"
				className={cn(
					"text-[10px] text-muted-foreground",
					hideLabel && "sr-only",
				)}
			>
				{label}
			</span>
			<Select
				disabled={disabled}
				value={value}
				onValueChange={(v) => onChange(v ?? "any")}
			>
				<SelectTrigger
					aria-labelledby={labelId}
					title={
						hideLabel ? `${label}: ${selected?.label ?? value}` : undefined
					}
					size="sm"
					className="w-full"
				>
					{selected?.icon && (
						<img
							src={selected.icon}
							alt=""
							className={cn(
								"shrink-0 object-contain",
								iconSize === "lg" ? "size-6" : "size-3.5",
							)}
						/>
					)}
					<span
						className={cn(
							"min-w-0 flex-1 text-left",
							fitContent ? "whitespace-nowrap" : "truncate",
						)}
					>
						{selected?.label ?? value}
					</span>
					{selected?.preview && <PreviewBadge />}
				</SelectTrigger>
				<SelectContent
					width={fitContent ? "content" : "trigger"}
					alignItemWithTrigger={!fitContent}
					align={fitContent ? "start" : "center"}
				>
					<SelectGroup>
						{options.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.icon && (
									<img
										src={option.icon}
										alt=""
										className={cn(
											"shrink-0 object-contain",
											iconSize === "lg" ? "size-6" : "size-3.5",
										)}
									/>
								)}
								{option.label}
								{option.preview && <PreviewBadge />}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</div>
	);
}
