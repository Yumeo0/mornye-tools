import { afterEach, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixtures: string[] = [];

afterEach(() => {
	for (const fixture of fixtures.splice(0)) {
		rmSync(fixture, { recursive: true, force: true });
	}
});

function git(cwd: string, ...args: string[]) {
	return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function createFixture() {
	const root = mkdtempSync(join(tmpdir(), "mornye-release-test-"));
	fixtures.push(root);
	const repo = join(root, "app");
	mkdirSync(join(repo, "scripts"), { recursive: true });
	mkdirSync(join(repo, "src-tauri"));
	mkdirSync(join(repo, "src", "lib"), { recursive: true });
	copyFileSync(
		join(import.meta.dir, "..", "src", "lib", "changelogFormat.ts"),
		join(repo, "src", "lib", "changelogFormat.ts"),
	);
	writeFileSync(
		join(repo, "CHANGELOG.md"),
		"# Changelog\n\n## [Unreleased]\n\n### Improved\n\n- Find better Echo builds for your team.\n\n## [0.1.4] - 2026-11-01\n\n- Previous changes.\n",
	);
	copyFileSync(
		join(import.meta.dir, "release.ts"),
		join(repo, "scripts", "release.ts"),
	);
	writeFileSync(join(repo, "package.json"), '{"version":"0.1.4"}\n');
	writeFileSync(
		join(repo, "src-tauri", "tauri.conf.json"),
		'{"version":"0.1.4"}\n',
	);
	writeFileSync(
		join(repo, "src-tauri", "Cargo.toml"),
		'[package]\nname = "mornye-tools"\nversion = "0.1.4"\n',
	);
	writeFileSync(
		join(repo, "src-tauri", "Cargo.lock"),
		'[[package]]\nname = "mornye-tools"\nversion = "0.1.4"\n',
	);
	git(repo, "init", "-b", "main");
	git(repo, "config", "user.name", "Release Test");
	git(repo, "config", "user.email", "release@example.invalid");
	git(repo, "config", "commit.gpgsign", "false");
	git(repo, "config", "tag.gpgsign", "false");
	git(repo, "config", "core.autocrlf", "false");
	git(repo, "add", ".");
	git(repo, "commit", "-m", "Initial version");
	return { root, repo };
}

test.each([
	["mirrored", true],
	["independent", false],
] as const)(
	"publishes one release tag across %s remotes",
	(_name, mirrored) => {
		const { root, repo } = createFixture();
		const origin = join(root, "origin.git");
		// The local path also exercises discovery of the GitHub remote by URL.
		const github = join(root, "github.com", "Yumeo0", "mornye-tools.git");
		git(root, "init", "--bare", origin);
		git(root, "init", "--bare", github);
		git(repo, "remote", "add", "origin", origin);
		git(repo, "remote", "add", "github", github.replaceAll("\\", "/"));
		git(origin, "config", "release.githubPath", github.replaceAll("\\", "/"));
		const tagUpdates = join(root, "tag-updates.log");
		git(
			github,
			"config",
			"release.tagUpdates",
			tagUpdates.replaceAll("\\", "/"),
		);
		// Track tag creation/deletion as GitHub would when starting a tag workflow.
		writeFileSync(
			join(github, "hooks", "post-receive"),
			'#!/bin/sh\nupdates=$(git config release.tagUpdates)\nwhile read before after ref; do\n  if [ "$ref" = refs/tags/v0.2.0 ]; then\n    printf "%s %s\\n" "$before" "$after" >> "$updates"\n  fi\ndone\n',
			{ mode: 0o755 },
		);
		// Mirror every push, including pruning tags absent from origin. Pushing the
		// branch and tag separately used to delete and recreate the GitHub tag.
		if (mirrored)
			writeFileSync(
				join(origin, "hooks", "post-receive"),
				'#!/bin/sh\ngithub=$(git config release.githubPath)\ngit push --mirror "$github"\n',
				{ mode: 0o755 },
			);
		const result = spawnSync(
			process.execPath,
			["scripts/release.ts", "minor"],
			{
				cwd: repo,
				encoding: "utf8",
				timeout: 20_000,
			},
		);
		expect(result.error).toBeUndefined();
		expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
		const head = git(repo, "rev-parse", "HEAD");
		for (const remote of [origin, github]) {
			expect(git(remote, "rev-parse", "refs/heads/main")).toBe(head);
			expect(git(remote, "rev-parse", "refs/tags/v0.2.0")).toBe(head);
		}
		expect(readFileSync(tagUpdates, "utf8").trim().split(/\r?\n/)).toEqual([
			`${"0".repeat(40)} ${head}`,
		]);
		expect(git(repo, "status", "--porcelain")).toBe("");
	},
	30_000,
);

test("--no-push creates the version commit and tag without remotes", () => {
	const { repo } = createFixture();
	const result = spawnSync(
		process.execPath,
		["scripts/release.ts", "minor", "--no-push"],
		{ cwd: repo, encoding: "utf8", timeout: 20_000 },
	);
	expect(result.error).toBeUndefined();
	expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
	expect(
		JSON.parse(readFileSync(join(repo, "package.json"), "utf8")).version,
	).toBe("0.2.0");
	expect(git(repo, "log", "-1", "--format=%s")).toBe("chore: release v0.2.0");
	expect(git(repo, "rev-parse", "v0.2.0")).toBe(git(repo, "rev-parse", "HEAD"));
	const changelog = readFileSync(join(repo, "CHANGELOG.md"), "utf8");
	expect(changelog).toMatch(
		/## \[Unreleased\]\n\n## \[0\.2\.0\] - \d{4}-\d{2}-\d{2}/,
	);
	expect(changelog).toContain("Find better Echo builds for your team.");
	expect(git(repo, "show", "v0.2.0:CHANGELOG.md")).toContain("## [0.2.0]");
	expect(git(repo, "status", "--porcelain")).toBe("");
}, 30_000);

function addSubmodule(root: string, repo: string) {
	const source = join(root, "data-source");
	mkdirSync(source);
	git(source, "init", "-b", "main");
	git(source, "config", "user.name", "Release Test");
	git(source, "config", "user.email", "release@example.invalid");
	git(source, "config", "commit.gpgsign", "false");
	writeFileSync(join(source, "data.json"), "{}\n");
	git(source, "add", ".");
	git(source, "commit", "-m", "Initial data");
	git(
		repo,
		"-c",
		"protocol.file.allow=always",
		"submodule",
		"add",
		source,
		"data/game",
	);
	git(repo, "commit", "-am", "Pin game data");
	return join(repo, "data", "game");
}

function releaseLocally(repo: string) {
	return spawnSync(
		process.execPath,
		["scripts/release.ts", "minor", "--no-push"],
		{
			cwd: repo,
			encoding: "utf8",
			timeout: 20_000,
		},
	);
}

test("local submodule deletions do not block release or change its pinned revision", () => {
	const { root, repo } = createFixture();
	const submodule = addSubmodule(root, repo);
	const pinned = git(submodule, "rev-parse", "HEAD");
	rmSync(join(submodule, "data.json"));
	const result = releaseLocally(repo);
	expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
	expect(git(repo, "rev-parse", "HEAD:data/game")).toBe(pinned);
	expect(git(submodule, "status", "--porcelain")).toContain("D data.json");
}, 30_000);

test("uncommitted app changes still block release before versions change", () => {
	const { repo } = createFixture();
	writeFileSync(
		join(repo, "package.json"),
		'{"version":"0.1.4","private":true}\n',
	);
	const before = git(repo, "rev-parse", "HEAD");
	const result = releaseLocally(repo);
	expect(result.status).toBe(1);
	expect(result.stderr).toContain("Working tree is not clean");
	expect(git(repo, "rev-parse", "HEAD")).toBe(before);
	expect(git(repo, "tag", "-l")).toBe("");
});

test("missing release notes stop release before changing versions or creating a tag", () => {
	const { repo } = createFixture();
	writeFileSync(join(repo, "CHANGELOG.md"), "# Changelog\n\n## [Unreleased]\n");
	git(repo, "add", "CHANGELOG.md");
	git(repo, "commit", "-m", "Start a fresh changelog draft");
	const before = git(repo, "rev-parse", "HEAD");
	const result = releaseLocally(repo);
	expect(result.status).toBe(1);
	expect(result.stderr).toContain("Write user-facing release notes");
	expect(
		JSON.parse(readFileSync(join(repo, "package.json"), "utf8")).version,
	).toBe("0.1.4");
	expect(git(repo, "rev-parse", "HEAD")).toBe(before);
	expect(git(repo, "tag", "-l")).toBe("");
	expect(git(repo, "status", "--porcelain")).toBe("");
});

test("an uncommitted submodule revision still blocks release", () => {
	const { root, repo } = createFixture();
	const submodule = addSubmodule(root, repo);
	git(submodule, "config", "user.name", "Release Test");
	git(submodule, "config", "user.email", "release@example.invalid");
	git(submodule, "config", "commit.gpgsign", "false");
	writeFileSync(join(submodule, "data.json"), '{"changed":true}\n');
	git(submodule, "commit", "-am", "Update data");
	const result = releaseLocally(repo);
	expect(result.status).toBe(1);
	expect(result.stderr).toContain("Working tree is not clean");
	expect(
		JSON.parse(readFileSync(join(repo, "package.json"), "utf8")).version,
	).toBe("0.1.4");
	expect(git(repo, "tag", "-l")).toBe("");
}, 30_000);
