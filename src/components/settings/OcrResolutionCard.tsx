import { ScanText } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
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
		<Card>
			<CardContent className="space-y-4">
				<div className="space-y-0.5">
					<Label className="flex items-center gap-2 text-base font-medium">
						<ScanText className="size-4" /> OCR Text Detection
					</Label>
					<p className="text-xs text-muted-foreground">
						Reads the echo on screen so the overlay can show it automatically.
						Pick your game's screen resolution so it reads correctly.
					</p>
				</div>
				<div className="space-y-2">
					<Label htmlFor="resolution-select">Screen Resolution</Label>
					<Select
						value={selectedResolution}
						onValueChange={(value) => applyResolutionConfig(value ?? "")}
					>
						<SelectTrigger className="w-full">
							{selectedResolution === ""
								? "Select your screen resolution"
								: selectedResolution}
						</SelectTrigger>
						<SelectContent>
							{Object.keys(OCR_CONFIG.resolutions).map((resolution) => (
								<SelectItem key={resolution} value={resolution}>
									{resolution}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</CardContent>
		</Card>
	);
}
