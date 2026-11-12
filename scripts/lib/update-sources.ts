import { existsSync } from "node:fs";
import { join } from "node:path";
import { dataLog } from "./data-log";

async function git(root: string, args: string[]): Promise<string> {
	const child = Bun.spawn(["git", ...args], {
		cwd: root,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (code !== 0)
		throw new Error(
			`git ${args.join(" ")} failed (${code}). Local changes have not been discarded.\n${stderr.trim()}`,
		);
	if (stderr.trim()) dataLog.detail(stderr.trim());
	return stdout.trim();
}

/** Only numbered release branches qualify; numeric ordering handles 3.10 > 3.9. */
export function latestReleaseBranch(refs: string): string {
	const branches = Array.from(
		refs.matchAll(/refs\/heads\/(\d+\.\d+(?:\.\d+)?)$/gm),
		(m) => m[1],
	);
	branches.sort((a, b) => {
		const left = a.split(".").map(Number);
		const right = b.split(".").map(Number);
		for (let i = 0; i < Math.max(left.length, right.length); i++) {
			const difference = (right[i] ?? 0) - (left[i] ?? 0);
			if (difference) return difference;
		}
		return 0;
	});
	if (!branches.length)
		throw new Error("wuwa-data has no numbered release branches.");
	return branches[0];
}

export async function refreshGameTables(root: string): Promise<string> {
	const branch = latestReleaseBranch(
		await git(root, ["ls-remote", "--heads", "origin"]),
	);
	await git(root, ["fetch", "origin", `refs/heads/${branch}`]);
	// Ordinary checkout refuses to overwrite conflicting edits. Never reset/force.
	await git(root, ["checkout", "--detach", "FETCH_HEAD"]);
	dataLog.info(`Game tables: latest release branch ${branch}`);
	return branch;
}

export async function refreshDataSources(root: string): Promise<void> {
	await git(root, [
		"submodule",
		"update",
		"--init",
		"--remote",
		"--checkout",
		"--",
		"data/wuwa-assets",
		"data/wuwa-protos",
	]);
	const tables = "data/wuwa-data";
	if (!existsSync(join(root, tables, ".git")))
		await git(root, ["submodule", "update", "--init", "--", tables]);
	await refreshGameTables(join(root, tables));
	dataLog.info("Updated assets and protocol extractor; preserved local edits.");
}
