import { Button } from "@/components/ui/button";

/** Small square icon toggle used for icon-based filters (element, weapon type). */
export function FilterIconButton({
	icon,
	title,
	pressed,
	colored,
	onClick,
}: {
	icon: string;
	title: string;
	pressed: boolean;
	/** Colored asset (element icons); false = white glyph, dark in light theme. */
	colored?: boolean;
	onClick: () => void;
}) {
	return (
		<Button
			type="button"
			variant={pressed ? "default" : "outline"}
			size="icon-sm"
			title={title}
			onClick={onClick}
		>
			<img
				src={icon}
				alt=""
				className={`size-5 object-contain ${pressed ? "" : colored ? "" : "brightness-0 dark:brightness-100"}`}
			/>
		</Button>
	);
}
