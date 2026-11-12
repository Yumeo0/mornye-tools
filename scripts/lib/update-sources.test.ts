import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { latestReleaseBranch, refreshGameTables } from "./update-sources";

const temporary: string[] = [];
afterEach(async () => {
	for (const path of temporary.splice(0))
		await rm(path, { recursive: true, force: true });
});

test("release selection sorts numbers and excludes preview/default branches", () => {
	const refs = [
		"3.8",
		"3.10",
		"3.9",
		"main",
		"9.0-beta",
		"10.0-preview",
		"2.99",
	]
		.map((branch) => `abc\trefs/heads/${branch}`)
		.join("\n");
	expect(latestReleaseBranch(refs)).toBe("3.10");
	expect(() => latestReleaseBranch("abc\trefs/heads/main")).toThrow(
		"no numbered release branches",
	);
});

async function git(root: string, args: string[], input?: string) {
	const child = Bun.spawn(["git", ...args], {
		cwd: root,
		stdin: input === undefined ? "ignore" : new TextEncoder().encode(input),
		stdout: "pipe",
		stderr: "pipe",
		env: {
			...process.env,
			GIT_AUTHOR_NAME: "Fixture",
			GIT_AUTHOR_EMAIL: "fixture@example.invalid",
			GIT_COMMITTER_NAME: "Fixture",
			GIT_COMMITTER_EMAIL: "fixture@example.invalid",
		},
	});
	const [stdout, stderr, code] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (code !== 0) throw new Error(stderr);
	return stdout.trim();
}

async function repository() {
	const root = await mkdtemp(join(tmpdir(), "mornye-source-update-"));
	temporary.push(root);
	const remote = join(root, "upstream.git");
	const checkout = join(root, "checkout");
	await git(root, ["init", "--bare", remote]);
	const oldBlob = await git(
		remote,
		["hash-object", "-w", "--stdin"],
		"old tables\n",
	);
	const oldTree = await git(
		remote,
		["mktree"],
		`100644 blob ${oldBlob}\ttables.txt\n`,
	);
	const oldCommit = await git(
		remote,
		["commit-tree", oldTree],
		"Old release\n",
	);
	await git(remote, ["update-ref", "refs/heads/3.9", oldCommit]);
	const newBlob = await git(
		remote,
		["hash-object", "-w", "--stdin"],
		"new tables\n",
	);
	const newTree = await git(
		remote,
		["mktree"],
		`100644 blob ${newBlob}\ttables.txt\n`,
	);
	const newCommit = await git(
		remote,
		["commit-tree", newTree, "-p", oldCommit],
		"New release\n",
	);
	await git(remote, ["update-ref", "refs/heads/3.10", newCommit]);
	await git(root, [
		"clone",
		"--config",
		"core.autocrlf=false",
		"--branch",
		"3.9",
		remote,
		checkout,
	]);
	return { checkout, oldCommit, newCommit };
}

test("table refresh switches to the latest upstream release and can be repeated", async () => {
	const { checkout, newCommit } = await repository();
	await Bun.write(join(checkout, "local-notes.txt"), "keep me");
	expect(await refreshGameTables(checkout)).toBe("3.10");
	expect(await git(checkout, ["rev-parse", "HEAD"])).toBe(newCommit);
	expect(await Bun.file(join(checkout, "tables.txt")).text()).toBe(
		"new tables\n",
	);
	expect(await Bun.file(join(checkout, "local-notes.txt")).text()).toBe(
		"keep me",
	);
	expect(await refreshGameTables(checkout)).toBe("3.10");
}, 15_000);

test("a conflicting local edit stops refresh without discarding the edit or moving HEAD", async () => {
	const { checkout, oldCommit } = await repository();
	await Bun.write(join(checkout, "tables.txt"), "my edits\n");
	await expect(refreshGameTables(checkout)).rejects.toThrow(
		"Local changes have not been discarded",
	);
	expect(await git(checkout, ["rev-parse", "HEAD"])).toBe(oldCommit);
	expect(await Bun.file(join(checkout, "tables.txt")).text()).toBe(
		"my edits\n",
	);
}, 15_000);
