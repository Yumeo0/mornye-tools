import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Centered modal: dimmed backdrop, Escape to close and the ringed panel shell
 * shared by the app's dialogs. Portaled so dialog content cannot pick up the
 * app shell's `group/tabs` context (its orientation variants are global).
 */
export function Modal({
	onClose,
	className,
	children,
}: {
	onClose: () => void;
	/** Panel classes: width, height and padding vary per dialog. */
	className?: string;
	children: ReactNode;
}) {
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	return createPortal(
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="Close"
				title="Close"
				className="absolute inset-0 cursor-default bg-black/60"
				onClick={onClose}
			/>
			<div
				className={cn(
					"bg-card text-card-foreground ring-foreground/20 relative flex w-full flex-col gap-3 p-4 shadow-2xl ring-1",
					className,
				)}
			>
				{children}
			</div>
		</div>,
		document.body,
	);
}

/** Modal title bar: optional icon, title/subtitle, extra actions and close. */
export function ModalHeader({
	icon,
	title,
	subtitle,
	actions,
	onClose,
}: {
	icon?: string | null;
	title: ReactNode;
	subtitle?: ReactNode;
	actions?: ReactNode;
	onClose: () => void;
}) {
	return (
		<header className="flex shrink-0 items-center gap-3">
			{icon && (
				<img src={icon} alt="" className="size-10 shrink-0 object-contain" />
			)}
			<div className="min-w-0 flex-1">
				<h3 className="truncate text-sm font-semibold">{title}</h3>
				{subtitle}
			</div>
			{actions}
			<Button variant="ghost" size="icon-sm" title="Close" onClick={onClose}>
				<X className="size-4" />
			</Button>
		</header>
	);
}
