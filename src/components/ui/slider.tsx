import { Slider as SliderPrimitive } from "@base-ui/react/slider";
import { cn } from "@/lib/utils";

/** Range slider (dual thumb when `value` is a two-element array). */
function Slider({
	className,
	thumbClassName,
	min = 0,
	max = 100,
	step = 1,
	value,
	onValueChange,
}: {
	className?: string;
	thumbClassName?: string;
	min?: number;
	max?: number;
	step?: number;
	value: number[];
	onValueChange: (value: number[]) => void;
}) {
	return (
		<SliderPrimitive.Root
			value={value}
			onValueChange={(next) => onValueChange([...next])}
			min={min}
			max={max}
			step={step}
			className={cn(
				"flex w-full touch-none items-center select-none",
				className,
			)}
		>
			<SliderPrimitive.Control className="flex w-full items-center">
				<SliderPrimitive.Track className="bg-muted relative h-1 w-full select-none">
					<SliderPrimitive.Indicator className="bg-primary absolute h-full" />
					{value.map((_thumbValue, index) => (
						<SliderPrimitive.Thumb
							// biome-ignore lint/suspicious/noArrayIndexKey: thumbs map 1:1 to positional values
							key={index}
							className={cn(
								"bg-background ring-foreground/30 size-3.5 shrink-0 rounded-full ring-1 select-none focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
								thumbClassName,
							)}
						/>
					))}
				</SliderPrimitive.Track>
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

export { Slider };
