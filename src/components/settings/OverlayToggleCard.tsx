import { getAllWindows } from "@tauri-apps/api/window";
import { Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { readSetting, writeSetting } from "@/lib/settings";

/** Overlay window toggle; the choice is persisted in `settings.json`. */
export function OverlayToggleCard() {
	const [overlayEnabled, setOverlayEnabled] = useState(false);

	useEffect(() => {
		void readSetting<boolean>("overlayEnabled").then((saved) => {
			if (saved != null) setOverlayEnabled(saved);
		});
	}, []);

	const toggleOverlay = async () => {
		const windows = await getAllWindows();
		const overlayWindow = windows.find((w) => w.label === "overlay");
		if (!overlayWindow) return;

		const newState = !overlayEnabled;
		if (newState) {
			await overlayWindow.show();
		} else {
			await overlayWindow.hide();
		}
		setOverlayEnabled(newState);

		try {
			await writeSetting("overlayEnabled", newState);
		} catch (error) {
			console.error("[settings] Failed to save overlay state:", error);
		}
	};

	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="space-y-0.5">
					<Label className="flex items-center gap-2 text-base font-medium">
						<Monitor className="size-4" /> Overlay
					</Label>
					<p className="text-xs text-muted-foreground">
						Show the transparent overlay window on top of the game
					</p>
				</div>
				<div className="flex items-center justify-between">
					<Label>Enable Overlay</Label>
					<Button
						variant={overlayEnabled ? "destructive" : "default"}
						onClick={toggleOverlay}
					>
						{overlayEnabled ? "Disable" : "Enable"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
