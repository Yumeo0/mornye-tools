import { useState } from "react";
import {
	MAX_RESULTS_LIMIT,
	MIN_RESULTS_LIMIT,
} from "@/components/optimizer/optimizerOptions";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	updateOptimizerPreferences,
	useOptimizerPreferences,
} from "@/lib/optimizerPreferences";

export function OptimizerSettingsCard() {
	const { preferences, loaded, error } = useOptimizerPreferences();
	const [resultsDraft, setResultsDraft] = useState<string | null>(null);
	return (
		<Card>
			<CardHeader>
				<CardTitle>Optimizer</CardTitle>
				<CardDescription>
					Search preferences are saved and apply to your next run.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<FieldGroup className="max-w-xl">
					<Field>
						<FieldLabel htmlFor="optimizer-results">Results kept</FieldLabel>
						<Input
							id="optimizer-results"
							type="number"
							min={MIN_RESULTS_LIMIT}
							max={MAX_RESULTS_LIMIT}
							step={1}
							disabled={!loaded}
							value={resultsDraft ?? String(preferences.resultsLimit)}
							onChange={(event) => setResultsDraft(event.target.value)}
							onBlur={() => {
								if (resultsDraft?.trim()) {
									const next = Number(resultsDraft);
									if (Number.isFinite(next))
										updateOptimizerPreferences({ resultsLimit: next });
								}
								setResultsDraft(null);
							}}
							className="w-full"
						/>
						<FieldDescription>
							Keep the best {MIN_RESULTS_LIMIT}–
							{MAX_RESULTS_LIMIT.toLocaleString()} builds. Larger lists use more
							memory.
						</FieldDescription>
					</Field>
					{error && (
						<p role="alert" className="text-xs text-destructive">
							{error}
						</p>
					)}
				</FieldGroup>
			</CardContent>
		</Card>
	);
}
