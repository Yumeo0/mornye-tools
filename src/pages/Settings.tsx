import { getCurrentWindow } from "@tauri-apps/api/window";
import { exit } from "@tauri-apps/plugin-process";
import { useEffect } from "react";
import { OcrTab } from "@/components/tabs/OcrTab";
import { OverlayTab } from "@/components/tabs/OverlayTab";
import { RulesTab } from "@/components/tabs/RulesTab";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Settings() {
	// Close overlay when settings window closes
	useEffect(() => {
		const setupCloseHandler = async () => {
			const currentWin = getCurrentWindow();
			const unlisten = await currentWin.onCloseRequested(async () => {
				// Exit the entire application
				await exit(0);
			});
			return unlisten;
		};

		const unlistenPromise = setupCloseHandler();

		return () => {
			unlistenPromise.then((unlisten) => unlisten());
		};
	}, []);

	return (
		<div className="min-h-screen bg-background p-8">
			<div className="max-w-4xl mx-auto space-y-6">
				<div className="space-y-2">
					<h1 className="text-4xl font-bold tracking-tight">Mornye Tools</h1>
				</div>

				<Separator />

				<Tabs defaultValue="rules" className="w-full">
					<TabsList className="grid w-full grid-cols-3">
						<TabsTrigger value="rules">Rules</TabsTrigger>
						<TabsTrigger value="overlay">Overlay</TabsTrigger>
						<TabsTrigger value="ocr">OCR</TabsTrigger>
					</TabsList>

					<TabsContent value="rules" className="space-y-6">
						<RulesTab />
					</TabsContent>

					<TabsContent value="overlay" className="space-y-6">
						<OverlayTab />
					</TabsContent>

					<TabsContent value="ocr" className="space-y-6">
						<OcrTab />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}

export default Settings;
