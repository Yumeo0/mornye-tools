import { getAllWindows } from "@tauri-apps/api/window";
import { Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { setOverlayVisible } from "@/lib/overlayWindow";
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
		await setOverlayVisible(overlayWindow, newState);
		setOverlayEnabled(newState);

		try {
			await writeSetting("overlayEnabled", newState);
		} catch (error) {
			console.error("[settings] Failed to save overlay state:", error);
		}
	};

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Monitor className="size-4" />
					Overlay
				</CardTitle>
				<CardDescription>Show over the game.</CardDescription>
				<CardAction>
					<Button
						variant={overlayEnabled ? "outline" : "default"}
						onClick={toggleOverlay}
					>
						{overlayEnabled ? "Disable" : "Enable"}
					</Button>
				</CardAction>
			</CardHeader>
		</Card>
	);
}
