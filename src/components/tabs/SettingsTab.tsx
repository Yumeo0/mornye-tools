import { useState } from "react";
import { CaptureCard } from "@/components/settings/CaptureCard";
import { OcrDebugPanel } from "@/components/settings/OcrDebugPanel";
import { OcrResolutionCard } from "@/components/settings/OcrResolutionCard";
import { OverlayToggleCard } from "@/components/settings/OverlayToggleCard";
import { PcapImportPanel } from "@/components/settings/PcapImportPanel";
import { UpgradeAssistantCard } from "@/components/settings/UpgradeAssistantCard";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsTab() {
	const [section, setSection] = useState("overlay");

	return (
		<Tabs
			value={section}
			onValueChange={setSection}
			className="flex min-h-0 flex-1 flex-col gap-4"
		>
			<TabsList className="shrink-0">
				<TabsTrigger value="overlay">Overlay</TabsTrigger>
				<TabsTrigger value="assistant">Upgrade Assistant</TabsTrigger>
				<TabsTrigger value="advanced">Developer</TabsTrigger>
			</TabsList>

			<TabsContent
				value="overlay"
				className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4"
			>
				<OverlayToggleCard />
				<OcrResolutionCard />
			</TabsContent>

			<TabsContent
				value="assistant"
				className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4"
			>
				<UpgradeAssistantCard />
			</TabsContent>

			<TabsContent
				value="advanced"
				className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4"
			>
				<CaptureCard />

				<div className="space-y-4 rounded-lg bg-muted/50 p-4">
					<OcrDebugPanel />
					<Separator />
					<PcapImportPanel />
				</div>
			</TabsContent>
		</Tabs>
	);
}
