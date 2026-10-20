import { Menu } from "@base-ui/react/menu";
import {
	ArrowDown01Icon,
	ArrowRight01Icon,
	Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState } from "react";
import { containsDestination } from "@/lib/map/regions";
import type { MapDestination, MapRegion } from "@/lib/map/types";
import { cn } from "@/lib/utils";

export function MapRegionNavigation({
	regions,
	destination,
	onNavigate,
}: {
	regions: MapRegion[];
	destination: MapDestination | null;
	onNavigate: (destination: MapDestination) => void;
}) {
	const [openRegion, setOpenRegion] = useState<number | null>(null);
	return (
		<nav
			aria-label="Map regions"
			className="flex shrink-0 gap-1 border-b bg-background/95 p-1.5"
		>
			{regions.map((region) => {
				const active = region.destinations.some((item) =>
					containsDestination(item, destination?.id),
				);
				return (
					<Menu.Root
						key={region.id}
						modal={false}
						open={openRegion === region.id}
						onOpenChange={(open) =>
							setOpenRegion((current) =>
								open ? region.id : current === region.id ? null : current,
							)
						}
					>
						<Menu.Trigger
							openOnHover
							delay={100}
							closeDelay={150}
							aria-label={region.name}
							aria-current={active ? "location" : undefined}
							className={cn(
								"group flex min-w-0 flex-1 items-center gap-2 border border-transparent px-2 py-1.5 text-left outline-none transition-colors hover:bg-accent data-popup-open:bg-accent focus-visible:ring-1 focus-visible:ring-ring",
								active && "border-border bg-secondary",
							)}
						>
							<img
								src={region.icon}
								alt=""
								className="size-8 shrink-0 object-contain"
							/>
							<span className="flex min-w-0 flex-1 flex-col gap-0.5 max-[1000px]:sr-only">
								<span className="truncate text-xs font-medium">
									{region.name}
								</span>
								<span className="truncate text-[9px] text-muted-foreground">
									{active
										? destination?.name
										: `${region.destinations.length} areas`}
								</span>
							</span>
							<HugeiconsIcon
								icon={ArrowDown01Icon}
								size={12}
								className="shrink-0 text-muted-foreground transition-transform group-data-popup-open:rotate-180"
							/>
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Positioner
								side="bottom"
								align="start"
								sideOffset={4}
								collisionPadding={8}
							>
								<Menu.Popup className={POPUP_CLASS}>
									<DestinationItems
										items={region.destinations}
										selectedId={destination?.id}
										label={`${region.name} areas`}
										onNavigate={onNavigate}
									/>
								</Menu.Popup>
							</Menu.Positioner>
						</Menu.Portal>
					</Menu.Root>
				);
			})}
		</nav>
	);
}

const POPUP_CLASS =
	"min-w-56 max-w-(--available-width) max-h-(--available-height) overflow-y-auto border bg-popover p-1 text-popover-foreground shadow-xl outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-1 duration-100";
const ITEM_CLASS =
	"flex cursor-pointer items-center gap-3 px-3 py-2.5 text-xs outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground";

type DestinationItemsProps = {
	items: MapDestination[];
	selectedId: string | undefined;
	label: string;
	overview?: MapDestination;
	onNavigate: (destination: MapDestination) => void;
};

function DestinationItems({
	items,
	selectedId,
	label,
	overview,
	onNavigate,
}: DestinationItemsProps) {
	return (
		<Menu.RadioGroup value={selectedId ?? ""} aria-label={label}>
			{overview && (
				<>
					<DestinationChoice
						item={overview}
						label={`All of ${overview.name}`}
						onNavigate={onNavigate}
					/>
					<Menu.Separator className="my-1 h-px bg-border" />
				</>
			)}
			{items.map((item) =>
				item.children.length ? (
					<Menu.SubmenuRoot key={item.id}>
						<Menu.SubmenuTrigger
							label={item.name}
							aria-label={item.name}
							closeDelay={150}
							className={ITEM_CLASS}
						>
							<span className="flex-1">{item.name}</span>
							{containsDestination(item, selectedId) && (
								<HugeiconsIcon icon={Tick02Icon} size={14} />
							)}
							<HugeiconsIcon icon={ArrowRight01Icon} size={14} />
						</Menu.SubmenuTrigger>
						<Menu.Portal>
							<Menu.Positioner
								side="right"
								align="start"
								sideOffset={4}
								collisionPadding={8}
							>
								<Menu.Popup className={POPUP_CLASS}>
									<DestinationItems
										items={item.children}
										selectedId={selectedId}
										label={`${item.name} areas`}
										overview={item}
										onNavigate={onNavigate}
									/>
								</Menu.Popup>
							</Menu.Positioner>
						</Menu.Portal>
					</Menu.SubmenuRoot>
				) : (
					<DestinationChoice
						key={item.id}
						item={item}
						onNavigate={onNavigate}
					/>
				),
			)}
		</Menu.RadioGroup>
	);
}

function DestinationChoice({
	item,
	label = item.name,
	onNavigate,
}: {
	item: MapDestination;
	label?: string;
	onNavigate: (destination: MapDestination) => void;
}) {
	return (
		<Menu.RadioItem
			value={item.id}
			closeOnClick
			onClick={() => onNavigate(item)}
			className={ITEM_CLASS}
		>
			<span className="flex-1">{label}</span>
			<span className="flex size-4 items-center justify-center">
				<Menu.RadioItemIndicator>
					<HugeiconsIcon icon={Tick02Icon} size={14} />
				</Menu.RadioItemIndicator>
			</span>
		</Menu.RadioItem>
	);
}
