/** Check an invariant at runtime instead of hiding nullability from TypeScript. */
export function required<T>(value: T | null | undefined): T {
	if (value == null) throw new Error("Expected a required value to be present");
	return value;
}
