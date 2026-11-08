import { itemLabel } from "@/lib/map/collection";
import { obtainedThrough, requirementLabel } from "@/lib/map/links";
import type { MapRequirement, MapReward } from "@/lib/map/types";
import { cn } from "@/lib/utils";

function RequirementDetails({ requirement }: { requirement: MapRequirement }) {
	if ("requirements" in requirement) {
		const label = {
			all: "All of:",
			any: "Either:",
			sequence: "In order:",
			atLeast: `Complete at least ${requirement.count} of:`,
			exactly: `Complete exactly ${requirement.count} of:`,
		}[requirement.action];
		const List = requirement.action === "sequence" ? "ol" : "ul";
		return (
			<div className="flex min-w-0 flex-col gap-1">
				<p>{label}</p>
				<List
					className={cn(
						"flex flex-col gap-1 pl-4",
						requirement.action === "sequence" ? "list-decimal" : "list-disc",
					)}
				>
					{requirement.requirements.map((child, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: Read-only steps can repeat identical requirements.
						<li key={index}>
							<RequirementDetails requirement={child} />
						</li>
					))}
				</List>
			</div>
		);
	}
	if (requirement.action === "objective" || requirement.targets.length <= 1)
		return <p>{requirementLabel(requirement)}</p>;
	return (
		<ul className="flex min-w-0 flex-col gap-1 list-disc pl-4">
			{requirement.targets.map((target, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: Read-only targets may have identical names and no entity key.
				<li key={index}>
					{requirementLabel({ ...requirement, targets: [target] })}
				</li>
			))}
		</ul>
	);
}

export function ObtainedThrough({
	reward,
	challenges,
	onSelect,
}: {
	reward: MapReward;
	challenges: MapReward[];
	onSelect: (reward: MapReward) => void;
}) {
	const sources = obtainedThrough(reward, challenges);
	if (!sources.length) return null;
	return (
		<section
			aria-label="Obtained through"
			className="flex flex-col gap-2 border-t pt-3"
		>
			<h3 className="text-[10px] tracking-[.15em] text-muted-foreground">
				OBTAINED THROUGH
			</h3>
			<div className="flex flex-col">
				{sources.map((source) => {
					if (source.kind === "requirement")
						return (
							<div
								key={`requirement:${source.step}`}
								className="flex items-start gap-2 p-2 text-xs leading-relaxed"
							>
								<span className="shrink-0 text-muted-foreground">
									{source.step + 1}.
								</span>
								<RequirementDetails requirement={source.requirement} />
							</div>
						);
					const quest = source.kind === "quest" ? source.quest : null;
					const challenge = source.kind === "challenge" ? source.reward : null;
					const contents = (
						<>
							<img
								src={
									quest?.icon ??
									challenge?.icon ??
									"/icons/map/task-01.webp"
								}
								alt=""
								className={cn(
									"shrink-0 object-contain",
									quest ? "size-10" : "size-8 bg-muted p-1",
								)}
							/>
							<span className="flex min-w-0 flex-1 flex-col gap-1">
								<span className="text-xs">
									{quest?.name ??
										(challenge ? challenge.title || itemLabel(challenge) : "")}
								</span>
								<span className="text-[10px] text-muted-foreground">
									{quest ? (quest.typeName ?? "Quest") : "Challenge"}
								</span>
							</span>
						</>
					);
					return challenge ? (
						<button
							key={challenge.key}
							type="button"
							title="View challenge on map"
							className="flex w-full items-center gap-2 p-2 text-left hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
							onClick={() => onSelect(challenge)}
						>
							{contents}
						</button>
					) : (
						<div
							key={`quest:${quest?.id}`}
							className="flex w-full items-center gap-2 p-2 text-left"
						>
							{contents}
						</div>
					);
				})}
			</div>
		</section>
	);
}
