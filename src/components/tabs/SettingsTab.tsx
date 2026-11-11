import {
	Alert02Icon,
	ArrowDown01Icon,
	CodeIcon,
	Database01Icon,
	Settings01Icon,
	ToolsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { ReactNode } from "react";
import { CaptureCard } from "@/components/settings/CaptureCard";
import { DangerousFeaturesCard } from "@/components/settings/DangerousFeaturesCard";
import { ExportCard } from "@/components/settings/ExportCard";
import { ImportCard } from "@/components/settings/ImportCard";
import { MapImportCard } from "@/components/settings/MapImportCard";
import { OcrDebugPanel } from "@/components/settings/OcrDebugPanel";
import { OcrResolutionCard } from "@/components/settings/OcrResolutionCard";
import { OptimizerSettingsCard } from "@/components/settings/OptimizerSettingsCard";
import { OverlayToggleCard } from "@/components/settings/OverlayToggleCard";
import { PcapImportPanel } from "@/components/settings/PcapImportPanel";
import { ShortcutsCard } from "@/components/settings/ShortcutsCard";
import { UpdatesCard } from "@/components/settings/UpdatesCard";
import { UpgradeAssistantCard } from "@/components/settings/UpgradeAssistantCard";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const GROUPS = [
	{ value: "general", label: "General", icon: Settings01Icon },
	{ value: "tools", label: "Tools", icon: ToolsIcon },
	{ value: "data", label: "Data", icon: Database01Icon },
	{ value: "dangerous", label: "Dangerous Features", icon: Alert02Icon },
	{ value: "advanced", label: "Advanced", icon: CodeIcon },
];
function groupFor(section: string) {
	if (["assistant", "optimizer", "tools"].includes(section)) return "tools";
	if (["export", "import", "data"].includes(section)) return "data";
	if (section === "dangerous") return "dangerous";
	if (section === "advanced") return "advanced";
	return "general";
}
function AdvancedSection({
	title,
	children,
	defaultOpen = false,
}: {
	title: string;
	children: ReactNode;
	defaultOpen?: boolean;
}) {
	return (
		<Collapsible defaultOpen={defaultOpen} className="border bg-card">
			<CollapsibleTrigger
				render={<Button variant="ghost" />}
				className="h-auto w-full justify-between p-4"
			>
				{title}
				<HugeiconsIcon icon={ArrowDown01Icon} data-icon="inline-end" />
			</CollapsibleTrigger>
			<CollapsibleContent className="flex flex-col gap-4 border-t p-3">
				{children}
			</CollapsibleContent>
		</Collapsible>
	);
}
export function SettingsTab({
	onImport,
	section,
	onSectionChange,
}: {
	onImport: () => void;
	section: string;
	onSectionChange: (section: string) => void;
}) {
	return (
		<Tabs
			value={groupFor(section)}
			onValueChange={onSectionChange}
			className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4"
		>
			<TabsList
				variant="line"
				className="shrink-0"
				aria-label="Settings sections"
			>
				{GROUPS.map((group) => (
					<TabsTrigger key={group.value} value={group.value}>
						<HugeiconsIcon icon={group.icon} />
						{group.label}
					</TabsTrigger>
				))}
			</TabsList>
			<TabsContent
				value="general"
				className="min-h-0 flex-1 overflow-y-auto pb-4"
			>
				<div className="grid max-w-5xl items-start gap-4 lg:grid-cols-2">
					<div className="flex flex-col gap-4">
						<OverlayToggleCard />
						<OcrResolutionCard />
						<ShortcutsCard />
					</div>
					<UpdatesCard />
				</div>
			</TabsContent>
			<TabsContent
				value="tools"
				className="min-h-0 flex-1 overflow-y-auto pb-4"
			>
				<div className="grid max-w-5xl items-start gap-4 lg:grid-cols-2">
					<UpgradeAssistantCard />
					<OptimizerSettingsCard />
				</div>
			</TabsContent>
			<TabsContent value="data" className="min-h-0 flex-1 overflow-y-auto pb-4">
				<div className="grid max-w-5xl items-start gap-4 lg:grid-cols-2">
					<ExportCard />
					<div className="flex flex-col gap-4">
						<ImportCard />
						<MapImportCard onImport={onImport} />
					</div>
				</div>
			</TabsContent>
			<TabsContent
				value="advanced"
				className="min-h-0 flex-1 overflow-y-auto pb-4"
			>
				<div className="flex max-w-5xl flex-col gap-3">
					<AdvancedSection
						title="Capture diagnostics"
						defaultOpen={section === "advanced"}
					>
						<CaptureCard />
					</AdvancedSection>
					<AdvancedSection title="OCR diagnostics">
						<OcrDebugPanel />
					</AdvancedSection>
					<AdvancedSection title="Packet import">
						<PcapImportPanel />
					</AdvancedSection>
				</div>
			</TabsContent>
			<TabsContent
				value="dangerous"
				className="min-h-0 flex-1 overflow-y-auto pb-4"
			>
				<DangerousFeaturesCard />
			</TabsContent>
		</Tabs>
	);
}
