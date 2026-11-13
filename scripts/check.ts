import { resolve } from "node:path";

const [mode, ...paths] = Bun.argv.slice(2);
const commands: Record<string, string[]> = {
	check: ["check"],
	lint: ["lint"],
	format: ["format", "--write"],
	"format:check": ["format"],
};
const biomeArgs = mode && commands[mode];
if (!biomeArgs || paths.some((path) => path.startsWith("-"))) {
	console.error(
		"Usage: bun scripts/check.ts <check|lint|format|format:check> [paths...]",
	);
	process.exit(1);
}

async function run(tool: string, args: string[]) {
	console.log(`\n${tool} ${args.join(" ")}`);
	return Bun.spawn([process.execPath, "run", "--silent", tool, ...args], {
		cwd: resolve(import.meta.dirname, ".."),
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	}).exited;
}

const biomeExit = await run("biome", [
	...biomeArgs,
	...(paths.length ? paths : ["."]),
]);
// Keep Tailwind suggestions visible even when Biome reports errors.
const tailwindExit = await run("oxlint", [
	...(paths.length ? paths : ["src"]),
	"--format",
	"stylish",
]);
process.exitCode = biomeExit || tailwindExit;
