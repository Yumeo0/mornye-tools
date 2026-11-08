import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Echo } from "@/lib/account";
import { ECHO_MARK_ICONS, type EchoMark, echoMark } from "@/lib/echoMark";
import { cn } from "@/lib/utils";

export function EchoMarkControls({
	echo,
	disabled,
	pending,
	onChange,
}: {
	echo: Echo;
	disabled: boolean;
	pending: boolean;
	onChange: (echo: Echo, mark: EchoMark) => void;
}) {
	const mark = echoMark(echo);
	const locked = mark === "locked";
	const discarded = mark === "discarded";
	const stack = echo.stackCount > 1 ? ` (all ${echo.stackCount} copies)` : "";
	return (
		<ToggleGroup
			className="shrink-0"
			aria-label="Echo marks"
			aria-busy={pending}
			multiple={false}
			value={mark === "none" ? [] : [mark]}
			disabled={disabled}
			spacing={1}
			onValueChange={(value) => {
				const next = value[0];
				onChange(
					echo,
					next === "locked" || next === "discarded" ? next : "none",
				);
			}}
		>
			<ToggleGroupItem
				value="locked"
				size="icon-sm"
				aria-label={locked ? "Unlock echo" : "Lock echo"}
				title={
					pending
						? "Saving mark…"
						: `${locked ? "Unlock echo" : "Lock echo"}${stack}`
				}
			>
				<img
					src={locked ? ECHO_MARK_ICONS.locked : ECHO_MARK_ICONS.unlocked}
					alt=""
					className="size-5 object-contain"
				/>
			</ToggleGroupItem>
			<ToggleGroupItem
				value="discarded"
				size="icon-sm"
				aria-label={discarded ? "Remove discard mark" : "Mark as discard"}
				title={
					pending
						? "Saving mark…"
						: `${discarded ? "Remove discard mark" : "Mark as discard"}${stack}`
				}
			>
				<img
					src={ECHO_MARK_ICONS.discarded}
					alt=""
					className={cn("size-5 object-contain", !discarded && "opacity-40")}
				/>
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
