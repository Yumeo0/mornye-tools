import type { Echo } from "@/lib/account";
import { ECHO_MARK_ICONS, type EchoMark, echoMark } from "@/lib/echoMark";
import { cn } from "@/lib/utils";

export const ECHO_MARK_STATES = {
	none: {
		label: "Unlocked",
		icon: ECHO_MARK_ICONS.unlocked,
		description: "Unlocked · not protected by a lock",
	},
	locked: {
		label: "Locked",
		icon: ECHO_MARK_ICONS.locked,
		description: "Locked · protected from being consumed",
	},
	discarded: {
		label: "Discarded",
		icon: ECHO_MARK_ICONS.discarded,
		description: "Marked for discard",
	},
} as const;

export function EchoMarkIcon({
	mark,
	dimmed = false,
	className,
}: {
	mark: EchoMark;
	dimmed?: boolean;
	className?: string;
}) {
	return (
		<img
			src={ECHO_MARK_STATES[mark].icon}
			alt=""
			className={cn(
				"size-4 shrink-0 object-contain",
				(mark === "none" || dimmed) && "opacity-35",
				className,
			)}
		/>
	);
}

export function EchoMarkStatus({ echo }: { echo: Echo }) {
	const mark = echoMark(echo);
	const lockMark = mark === "locked" ? "locked" : "none";
	const lockState = ECHO_MARK_STATES[lockMark];
	const discarded = mark === "discarded";
	return (
		<div className="flex shrink-0 items-center gap-1">
			<span
				role="img"
				aria-label={lockState.label}
				title={lockState.description}
				className="grid size-7 place-items-center"
			>
				<EchoMarkIcon mark={lockMark} className="size-5" />
			</span>
			<span
				role="img"
				aria-label={discarded ? "Discarded" : "Not marked for discard"}
				title={
					discarded
						? ECHO_MARK_STATES.discarded.description
						: "Not marked for discard"
				}
				className="grid size-7 place-items-center"
			>
				<EchoMarkIcon mark="discarded" dimmed={!discarded} className="size-5" />
			</span>
		</div>
	);
}
