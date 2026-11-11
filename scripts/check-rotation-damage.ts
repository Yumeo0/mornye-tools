import { join } from "node:path";
import { validateBundledRotationDamage } from "../src/lib/calc/bundledRotationDamage";
import { getCatalog } from "../src/lib/calc/riley/engine.generated.js";
import reference from "../src/lib/calc/riley/reference.generated.json";
import { bundledRotationDamageSchema } from "../src/lib/calc/rotationDamageSchema";

const data = bundledRotationDamageSchema.parse(
	await Bun.file(
		join(import.meta.dirname, "../src/configs/rotation_damage.json"),
	).json(),
);
const error = validateBundledRotationDamage(
	data,
	reference.revision,
	getCatalog().teams,
);
if (error) throw new Error(error);
console.log(
	`Verified ${Object.keys(data.scores).length} bundled rotation scores`,
);
