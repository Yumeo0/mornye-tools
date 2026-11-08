import { Toaster as Sonner } from "sonner";

export function Toaster() {
	return (
		<Sonner
			position="bottom-right"
			closeButton
			duration={8000}
			toastOptions={{
				style: {
					background: "var(--popover)",
					color: "var(--popover-foreground)",
					borderColor: "var(--border)",
					borderRadius: 0,
					fontFamily: "inherit",
				},
				classNames: { description: "!text-muted-foreground" },
			}}
		/>
	);
}
