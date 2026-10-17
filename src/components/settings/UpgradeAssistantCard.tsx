import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { readSetting, writeSetting } from "@/lib/settings";

/** Default rating threshold of the Echo Upgrade Assistant (percent). */
export const DEFAULT_ASSISTANT_THRESHOLD = 75;

/** Echo Upgrade Assistant settings; persisted in `settings.json`. */
export function UpgradeAssistantCard() {
	const [enabled, setEnabled] = useState(false);
	const [threshold, setThreshold] = useState(DEFAULT_ASSISTANT_THRESHOLD);
	const thresholdSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		void readSetting<boolean>("upgradeAssistantEnabled").then(
			(savedEnabled) => {
				if (savedEnabled != null) setEnabled(savedEnabled);
			},
		);
		void readSetting<number>("upgradeAssistantThreshold").then(
			(savedThreshold) => {
				if (typeof savedThreshold === "number") setThreshold(savedThreshold);
			},
		);
	}, []);

	useEffect(
		() => () => {
			if (thresholdSaveTimer.current) clearTimeout(thresholdSaveTimer.current);
		},
		[],
	);

	const toggle = async () => {
		const next = !enabled;
		setEnabled(next);
		try {
			await writeSetting("upgradeAssistantEnabled", next);
		} catch (error) {
			console.error("[settings] Failed to save assistant state:", error);
		}
	};

	const changeThreshold = (value: number) => {
		setThreshold(value);
		if (thresholdSaveTimer.current) clearTimeout(thresholdSaveTimer.current);
		// Debounced: the slider fires on every drag step.
		thresholdSaveTimer.current = setTimeout(() => {
			thresholdSaveTimer.current = null;
			void writeSetting("upgradeAssistantThreshold", value).catch((error) =>
				console.error("[settings] Failed to save assistant threshold:", error),
			);
		}, 400);
	};

	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="space-y-0.5">
					<Label className="flex items-center gap-2 text-base font-medium">
						<Sparkles className="size-4" /> Echo Upgrade Assistant
					</Label>
					<p className="text-xs text-muted-foreground">
						After each upgrade or tuning, checks whether the echo can still
						reach the rating threshold on any relevant character. If not, it is
						marked for discard automatically while the overlay is running.
					</p>
				</div>

				<div className="flex items-center justify-between">
					<Label htmlFor="assistant-enabled">Enable</Label>
					<Switch
						id="assistant-enabled"
						checked={enabled}
						onCheckedChange={toggle}
					/>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<Label htmlFor="assistant-threshold">Rating threshold</Label>
						<span className="text-sm font-medium tabular-nums">
							{threshold}%
						</span>
					</div>
					<Slider
						min={0}
						max={100}
						step={5}
						value={[threshold]}
						onValueChange={(values) =>
							changeThreshold(values[0] ?? DEFAULT_ASSISTANT_THRESHOLD)
						}
						disabled={!enabled}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
