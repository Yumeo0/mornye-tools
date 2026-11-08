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

test("pushes the GitHub branch and tag before starting the origin mirror", () => {
	const { root, repo } = createFixture();
	const origin = join(root, "origin.git");
	// The local path also exercises discovery of the GitHub remote by URL.
	const github = join(root, "github.com", "Yumeo0", "mornye-tools.git");
	git(root, "init", "--bare", origin);
	git(root, "init", "--bare", github);
	git(repo, "remote", "add", "origin", origin);
	git(repo, "remote", "add", "github", github.replaceAll("\\", "/"));
	git(origin, "config", "release.githubPath", github.replaceAll("\\", "/"));
	// Reject origin pushes unless both release refs have already reached GitHub.
	writeFileSync(
		join(origin, "hooks", "pre-receive"),
		'#!/bin/sh\ngithub=$(git config release.githubPath)\ngit --git-dir="$github" show-ref --verify --quiet refs/heads/main &&\ngit --git-dir="$github" show-ref --verify --quiet refs/tags/v0.2.0\n',
		{ mode: 0o755 },
	);
	const result = spawnSync(process.execPath, ["scripts/release.ts", "minor"], {
		cwd: repo,
		encoding: "utf8",
		timeout: 20_000,
	});
	expect(result.error).toBeUndefined();
	expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
	const head = git(repo, "rev-parse", "HEAD");
	for (const remote of [origin, github]) {
		expect(git(remote, "rev-parse", "refs/heads/main")).toBe(head);
		expect(git(remote, "rev-parse", "refs/tags/v0.2.0")).toBe(head);
	}
	expect(git(repo, "status", "--porcelain")).toBe("");
}, 30_000);

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
	expect(git(repo, "status", "--porcelain")).toBe("");
}, 30_000);
