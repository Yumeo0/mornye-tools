import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const toggleVariants = cva(
	"group/toggle inline-flex items-center justify-center gap-1 rounded-none text-sm font-medium whitespace-nowrap transition-all outline-none hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-pressed:bg-muted data-[state=on]:bg-muted dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				ghost:
					"bg-transparent aria-pressed:bg-transparent data-pressed:bg-transparent data-[state=on]:bg-transparent",
				outline: "border border-input bg-transparent hover:bg-muted",
				solid:
					"border border-input bg-transparent text-muted-foreground data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground data-pressed:hover:bg-primary/90 data-pressed:hover:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground",
				destructive:
					"border border-input bg-transparent text-muted-foreground data-pressed:border-destructive data-pressed:bg-destructive/15 data-pressed:text-foreground aria-pressed:border-destructive aria-pressed:bg-destructive/15 aria-pressed:text-foreground",
			},
			size: {
				"icon-sm": "size-7",
				xs: "h-7 min-w-7 gap-1.5 px-2 text-xs",
				default:
					"h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
				sm: "h-7 min-w-7 rounded-none px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5",
				lg: "h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Toggle({
	className,
	variant = "default",
	size = "default",
	...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
	return (
		<TogglePrimitive
			data-slot="toggle"
			className={cn(toggleVariants({ variant, size, className }))}
			{...props}
		/>
	);
}

export { Toggle, toggleVariants };
