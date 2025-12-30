import { getAllWindows } from "@tauri-apps/api/window";
import { Store } from "@tauri-apps/plugin-store";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export function OverlayTab() {
	const [overlayEnabled, setOverlayEnabled] = useState(false);

	useEffect(() => {
		const initOverlayState = async () => {
			try {
				const store = await Store.load("settings.json");
				const savedOverlayEnabled = await store.get<boolean>("overlayEnabled");
				if (savedOverlayEnabled !== null && savedOverlayEnabled !== undefined) {
					setOverlayEnabled(savedOverlayEnabled);
					// Show or hide overlay based on saved state
					const windows = await getAllWindows();
					const overlayWindow = windows.find((w) => w.label === "overlay");
					if (overlayWindow) {
						if (savedOverlayEnabled) {
							await overlayWindow.show();
						} else {
							await overlayWindow.hide();
						}
					}
				}
			} catch (error) {
				console.error("[OverlayTab] Failed to load overlay state:", error);
			}
		};

		initOverlayState();
	}, []);

	const toggleOverlay = async () => {
		const windows = await getAllWindows();
		const overlayWindow = windows.find((w) => w.label === "overlay");

		if (overlayWindow) {
			const newState = !overlayEnabled;
			if (newState) {
				await overlayWindow.show();
			} else {
				await overlayWindow.hide();
			}
			setOverlayEnabled(newState);

			// Save overlay enabled state to store
			try {
				const store = await Store.load("settings.json");
				await store.set("overlayEnabled", newState);
				await store.save();
			} catch (error) {
				console.error("[OverlayTab] Failed to save overlay state:", error);
			}
		}
	};

	return (
		<Card>
			<CardContent className="space-y-4">
				<div className="flex items-center justify-between">
					<div className="space-y-0.5">
						<Label className="text-base font-medium">Enable Overlay</Label>
					</div>
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
