import type { CustomRotation } from "@/lib/calc/types";
import { rotationLibrarySchema } from "@/lib/customRotations";
import { useFilterState } from "@/lib/persistentState";

export function useCustomRotations() {
	return useFilterState<CustomRotation[]>(
		"rotations.library.v1",
		[],
		rotationLibrarySchema,
	);
}
