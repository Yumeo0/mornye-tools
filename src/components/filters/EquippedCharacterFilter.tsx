import { MultiSelect } from "@/components/ui/multi-select";

import type { FilterOption } from "./types";

/** Character filter used by the echo and weapon lists ("Equipped"). */
export function EquippedCharacterFilter({
	values,
	onChange,
	characterOptions,
}: {
	values: string[];
	onChange: (values: string[]) => void;
	characterOptions: FilterOption[];
}) {
	return (
		<div className="w-48">
			<MultiSelect
				label="Equipped"
				values={values}
				options={[
					{ value: "none", label: "Not equipped" },
					...characterOptions,
				]}
				onChange={onChange}
			/>
		</div>
	);
}
