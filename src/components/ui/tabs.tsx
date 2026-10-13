import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva, type VariantProps } from "class-variance-authority";
import { createContext, useContext } from "react";

import { cn } from "@/lib/utils";

type TabsOrientation = "horizontal" | "vertical";

/**
 * Orientation of the nearest `Tabs` root. It is passed through React context
 * instead of `group-data-[orientation=…]/tabs:` variants because those match
 * *any* ancestor group: a nested horizontal tab set inside the vertical app
 * shell would pick up the shell's vertical classes (column layout, full-width
 * triggers) and render as a sidebar.
 */
const TabsOrientationContext = createContext<TabsOrientation>("horizontal");

function Tabs({
	className,
	orientation = "horizontal",
	...props
}: TabsPrimitive.Root.Props) {
	return (
		<TabsOrientationContext.Provider value={orientation}>
			<TabsPrimitive.Root
				data-slot="tabs"
				data-orientation={orientation}
				className={cn(
					"gap-2 group/tabs flex",
					orientation === "horizontal" && "flex-col",
					className,
				)}
				{...props}
			/>
		</TabsOrientationContext.Provider>
	);
}

const tabsListVariants = cva(
	"rounded-none p-[3px] data-[variant=line]:rounded-none group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center",
	{
		variants: {
			variant: {
				default: "bg-muted",
				line: "gap-1 bg-transparent",
			},
			orientation: {
				horizontal: "h-8 flex-row",
				vertical: "h-fit flex-col",
			},
		},
		defaultVariants: {
			variant: "default",
			orientation: "horizontal",
		},
	},
);

function TabsList({
	className,
	variant = "default",
	...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
	const orientation = useContext(TabsOrientationContext);
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			data-variant={variant}
			className={cn(tabsListVariants({ variant, orientation }), className)}
			{...props}
		/>
	);
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
	const vertical = useContext(TabsOrientationContext) === "vertical";
	return (
		<TabsPrimitive.Tab
			data-slot="tabs-trigger"
			className={cn(
				"gap-1.5 rounded-none border border-transparent px-1.5 py-0.5 text-xs font-medium [&_svg:not([class*='size-'])]:size-4 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
				vertical ? "w-full justify-start" : "justify-center",
				"group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
				"data-active:bg-background dark:data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 data-active:text-foreground",
				"after:bg-foreground after:absolute after:opacity-0 after:transition-opacity group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
				vertical
					? "after:inset-y-0 after:-right-1 after:w-0.5"
					: "after:inset-x-0 after:-bottom-1.25 after:h-0.5",
				className,
			)}
			{...props}
		/>
	);
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
	return (
		<TabsPrimitive.Panel
			data-slot="tabs-content"
			className={cn("text-xs/relaxed flex-1 outline-none", className)}
			{...props}
		/>
	);
}

export { Tabs, TabsContent, TabsList, TabsTrigger, tabsListVariants };
