import { Slider } from "@/components/ui/slider";

import { FilterField } from "./FilterField";

/** Single-thumb minimum-level slider with its live caption. */
export function MinLevelSlider({
	value,
	min,
	max,
	plus,
	onChange,
}: {
	value: number;
	min: number;
	max: number;
	/** Show a "+" before the value (echo levels are written "+N"). */
	plus?: boolean;
	onChange: (value: number) => void;
}) {
	return (
		<FilterField
			label={`Min Lvl ${plus ? "+" : ""}${value}`}
			active={value > min}
		>
			<Slider
				min={min}
				max={max}
				value={[value]}
				onValueChange={(next) => onChange(next[0])}
				className="h-3.5"
			/>
		</FilterField>
	);
}
