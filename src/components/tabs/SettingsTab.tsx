import { FileJson, Monitor, Sparkles, Wrench } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { CaptureCard } from "@/components/settings/CaptureCard";
import { ExportCard } from "@/components/settings/ExportCard";
import { OcrDebugPanel } from "@/components/settings/OcrDebugPanel";
import { OcrResolutionCard } from "@/components/settings/OcrResolutionCard";
import { OverlayToggleCard } from "@/components/settings/OverlayToggleCard";
import { PcapImportPanel } from "@/components/settings/PcapImportPanel";
import { UpgradeAssistantCard } from "@/components/settings/UpgradeAssistantCard";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** The settings sections, in selector order. */
const SECTIONS = [
	{ value: "overlay", label: "Overlay", icon: <Monitor /> },
	{ value: "assistant", label: "Upgrade Assistant", icon: <Sparkles /> },
	{ value: "export", label: "Export", icon: <FileJson /> },
	{ value: "advanced", label: "Developer", icon: <Wrench /> },
] as const;

/**
 * One section tab. The stock trigger only tints its label against the list
 * track, so the row reads as one continuous line; here every segment draws
 * its own box, icons break up the text, `-ml-px` collapses neighbouring
 * borders into single dividers and the active tab is filled like a pressed
 * filter chip, so both the boundaries and the selection are unmistakable.
 */
function SectionTab({
	value,
	label,
	icon,
}: {
	value: string;
	label: string;
	icon: ReactNode;
}) {
	return (
		<TabsTrigger
			value={value}
			className="-ml-px h-8 flex-none border-border bg-background px-3 first:ml-0 hover:bg-muted hover:text-foreground data-active:z-10 data-active:border-primary data-active:bg-primary data-active:text-primary-foreground data-active:hover:bg-primary data-active:hover:text-primary-foreground dark:data-active:border-primary dark:data-active:bg-primary dark:data-active:text-primary-foreground"
		>
			{icon}
			{label}
		</TabsTrigger>
	);
}

export function SettingsTab() {
	const [section, setSection] = useState("overlay");

	return (
		<Tabs
			value={section}
			onValueChange={setSection}
			className="flex min-h-0 flex-1 flex-col gap-4"
		>
			<TabsList className="h-auto shrink-0 gap-0 bg-transparent p-0">
				{SECTIONS.map((item) => (
					<SectionTab
						key={item.value}
						value={item.value}
						label={item.label}
						icon={item.icon}
					/>
				))}
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
				value="export"
				className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4"
			>
				<ExportCard />
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
