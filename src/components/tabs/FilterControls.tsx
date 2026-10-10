import { Tick02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { charactersById } from "@/components/echo/EchoCard";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import type { Resonator } from "@/lib/account";
import { cn } from "@/lib/utils";

/** One selectable filter value, optionally with an icon. */
export interface FilterOption {
	value: string;
	label: string;
	icon?: string;
}

/** Small square icon toggle used for icon-based filters (element, weapon type). */
export function FilterIconButton({
	icon,
	title,
	pressed,
	colored,
	onClick,
}: {
	icon: string;
	title: string;
	pressed: boolean;
	/** Colored asset (element icons); false = white glyph, dark in light theme. */
	colored?: boolean;
	onClick: () => void;
}) {
	return (
		<Button
			type="button"
			variant={pressed ? "default" : "outline"}
			size="icon-sm"
			title={title}
			onClick={onClick}
		>
			<img
				src={icon}
				alt=""
				className={`size-5 object-contain ${pressed ? "" : colored ? "" : "brightness-0 dark:brightness-100"}`}
			/>
		</Button>
	);
}

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
	const selected = options.find((option) => option.value === value);
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<span className="text-[10px] text-muted-foreground">{label}</span>
			<Select value={value} onValueChange={(v) => onChange(v ?? "any")}>
				<SelectTrigger size="sm" className="w-full">
					{selected?.icon && (
						<img
							src={selected.icon}
							alt=""
							className="size-3.5 shrink-0 object-contain"
						/>
					)}
					{selected?.label ?? value}
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
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

export function MultiFilterSelect({
	label,
	values,
	options,
	onChange,
}: {
	label: string;
	values: string[];
	options: FilterOption[];
	onChange: (values: string[]) => void;
}) {
	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) return;
		const onClickOutside = (event: MouseEvent) => {
			if (!containerRef.current?.contains(event.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, [open]);

	const summary =
		values.length === 0
			? "Any"
			: values.length === 1
				? (options.find((option) => option.value === values[0])?.label ??
					values[0])
				: `${values.length} selected`;

	const toggle = (value: string) => {
		onChange(
			values.includes(value)
				? values.filter((v) => v !== value)
				: [...values, value],
		);
	};

	return (
		<div ref={containerRef} className="relative flex min-w-0 flex-col gap-0.5">
			<span className="text-[10px] text-muted-foreground">{label}</span>
			<Button
				type="button"
				variant={values.length > 0 ? "default" : "outline"}
				size="sm"
				title={summary}
				className="w-full justify-between font-normal"
				onClick={() => setOpen((o) => !o)}
			>
				<span className="truncate">{summary}</span>
				<ChevronDown className="size-3.5 shrink-0 opacity-60" />
			</Button>
			{open && (
				<div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto bg-popover p-1 shadow-md ring-1 ring-border">
					{options.map((option) => {
						const checked = values.includes(option.value);
						return (
							<button
								key={option.value}
								type="button"
								aria-pressed={checked}
								className="flex w-full cursor-pointer items-center gap-2 rounded-none px-2 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground"
								onClick={() => toggle(option.value)}
							>
								<span
									className={cn(
										"border-input dark:bg-input/30 dark:data-checked:bg-primary flex size-3.5 shrink-0 items-center justify-center rounded-none border transition-colors",
										checked
											? "border-primary bg-primary text-primary-foreground"
											: "bg-transparent",
									)}
								>
									{checked && (
										<HugeiconsIcon
											icon={Tick02Icon}
											strokeWidth={3}
											className="size-3"
										/>
									)}
								</span>
								{option.icon && (
									<img
										src={option.icon}
										alt=""
										className="size-3.5 shrink-0 object-contain"
									/>
								)}
								<span className="truncate">{option.label}</span>
							</button>
						);
					})}
				</div>
			)}
		</div>
	);
}

/** Character filter options shared by the echoes and weapons tabs. */
export function characterFilterOptions(
	resonators: Resonator[],
): FilterOption[] {
	return resonators
		.map((resonator) => ({
			value: String(resonator.id),
			label:
				charactersById.get(resonator.id)?.character_name ||
				resonator.name ||
				String(resonator.id),
			icon: charactersById.get(resonator.id)?.icon_head_256,
		}))
		.sort((a, b) => a.label.localeCompare(b.label));
}
