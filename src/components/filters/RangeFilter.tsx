import { Slider } from "@/components/ui/slider";

/** Labeled dual-thumb range filter (level / chain). */
export function RangeFilter({
	label,
	min,
	max,
	value,
	onChange,
}: {
	label: string;
	min: number;
	max: number;
	value: [number, number];
	onChange: (value: [number, number]) => void;
}) {
	const active = value[0] > min || value[1] < max;
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<span
				className={`text-[10px] leading-none ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}
			>
				{label} {value[0]}–{value[1]}
			</span>
			<Slider
				min={min}
				max={max}
				value={value}
				onValueChange={(next) => onChange([next[0], next[1]])}
				className="h-3.5"
			/>
		</div>
	);
}
