import { ScanText } from "lucide-react";
import { useEffect, useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
} from "@/components/ui/select";
import OCR_CONFIG from "@/configs/ocr.json";
import { applyResolutionRegions, resolutionConfig } from "@/lib/scanRegions";
import { readSetting, writeSetting } from "@/lib/settings";

/**
 * OCR resolution picker: applies the resolution's scan regions to the backend
 * and persists the choice in `settings.json`.
 */
export function OcrResolutionCard() {
	const [selectedResolution, setSelectedResolution] = useState("");

	const applyResolutionConfig = async (resolution: string) => {
		if (!resolutionConfig(resolution)?.echoUpgrade) return;
		setSelectedResolution(resolution);
		try {
			await applyResolutionRegions(resolution);
			await writeSetting("resolution", resolution);
		} catch (error) {
			console.error("Failed to update scan regions:", error);
		}
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: applyResolutionConfig changes on every re-render and should not be used as a hook dependency
	useEffect(() => {
		void readSetting<string>("resolution").then((saved) => {
			if (saved) void applyResolutionConfig(saved);
		});
	}, []);

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<ScanText className="size-4" />
					Echo detection
				</CardTitle>
				<CardDescription>Screen resolution for reading echoes.</CardDescription>
			</CardHeader>
			<CardContent>
				<Field orientation="horizontal">
					<FieldLabel htmlFor="resolution-select">Resolution</FieldLabel>
					<Select
						value={selectedResolution}
						onValueChange={(value) => applyResolutionConfig(value ?? "")}
					>
						<SelectTrigger id="resolution-select" className="w-44">
							{selectedResolution || "Select resolution"}
						</SelectTrigger>
						<SelectContent>
							<SelectGroup>
								{Object.keys(OCR_CONFIG.resolutions).map((resolution) => (
									<SelectItem key={resolution} value={resolution}>
										{resolution}
									</SelectItem>
								))}
							</SelectGroup>
						</SelectContent>
					</Select>
				</Field>
			</CardContent>
		</Card>
	);
}
