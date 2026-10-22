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
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import {
	hasWebGpu,
	updateOptimizerPreferences,
	useOptimizerPreferences,
} from "@/lib/optimizerPreferences";

export function OptimizerSettingsCard() {
	const { preferences, loaded, error } = useOptimizerPreferences();
	const [resultsDraft, setResultsDraft] = useState<string | null>(null);
	const gpuAvailable = hasWebGpu();
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
						<FieldLabel htmlFor="optimizer-engine">Search engine</FieldLabel>
						<Select
							value={preferences.engine}
							disabled={!loaded}
							onValueChange={(engine) => {
								if (engine === "cpu" || engine === "gpu")
									updateOptimizerPreferences({ engine });
							}}
						>
							<SelectTrigger id="optimizer-engine" className="w-full">
								{preferences.engine === "gpu"
									? "GPU (WebGPU)"
									: "CPU (workers)"}
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									<SelectItem value="gpu" disabled={!gpuAvailable}>
										GPU (WebGPU)
									</SelectItem>
									<SelectItem value="cpu">CPU (workers)</SelectItem>
								</SelectGroup>
							</SelectContent>
						</Select>
						<FieldDescription>
							Used for own-damage searches. Team damage always uses exact
							simulation.
							{!gpuAvailable &&
								" WebGPU is unavailable; searches use CPU workers."}
						</FieldDescription>
					</Field>
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
