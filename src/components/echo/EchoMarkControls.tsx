import { Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { EchoMarkIcon } from "@/components/echo/EchoMarkStatus";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Echo } from "@/lib/account";
import { type EchoMark, echoMark } from "@/lib/echoMark";

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
			variant="ghost"
			aria-label="Echo marks"
			aria-busy={pending}
			multiple={false}
			value={mark === "none" ? [] : [mark]}
			disabled={disabled || pending}
			size="icon-sm"
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
				aria-label={locked ? "Unlock echo" : "Lock echo"}
				title={
					pending
						? "Saving mark…"
						: `${locked ? "Unlock echo" : "Lock echo"}${stack}`
				}
			>
				{pending ? (
					<HugeiconsIcon
						icon={Loading03Icon}
						className="motion-safe:animate-spin"
					/>
				) : (
					<EchoMarkIcon mark={locked ? "locked" : "none"} className="size-5" />
				)}
			</ToggleGroupItem>
			<ToggleGroupItem
				value="discarded"
				aria-label={discarded ? "Remove discard mark" : "Mark as discard"}
				title={
					pending
						? "Saving mark…"
						: `${discarded ? "Remove discard mark" : "Mark as discard"}${stack}`
				}
			>
				<EchoMarkIcon mark="discarded" dimmed={!discarded} className="size-5" />
			</ToggleGroupItem>
		</ToggleGroup>
	);
}
