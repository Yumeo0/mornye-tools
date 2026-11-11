// `bun release patch|minor|major [--no-push]`
//
// Bumps the app version everywhere it lives (package.json, the Tauri config,
// Cargo.toml and Cargo.lock), commits it as "chore: release vX.Y.Z", tags the
// commit and pushes the branch and tag so the release workflow builds and
// publishes the signed bundles and updater manifest. Pass --no-push to keep
// the commit and tag local.
//
// The workflow runs on GitHub (github.com/Yumeo0/mornye-tools), so the tag has
// to reach that repository - directly, or through the push mirror that keeps it
// in sync with git.yumeo.dev.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prepareChangelogRelease } from "../src/lib/changelogFormat";

const ROOT = join(import.meta.dir, "..");
const BUMPS = ["patch", "minor", "major"] as const;
type Bump = (typeof BUMPS)[number];

function fail(message: string): never {
	console.error(`\n${message}\n`);
	process.exit(1);
}

/** Runs git and captures its output. */
function git(...args: string[]): string {
	return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

/** Runs git with its output going straight to the terminal. */
function gitInherit(...args: string[]) {
	execFileSync("git", args, {
		cwd: ROOT,
		stdio: ["ignore", "inherit", "inherit"],
	});
}

/** The remote that points at the GitHub repository the release workflow runs on. */
function githubRemote(): string | null {
	const remotes = git("remote")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	for (const remote of remotes) {
		if (
			/github\.com[:/]Yumeo0\/mornye-tools/i.test(
				git("remote", "get-url", remote),
			)
		) {
			return remote;
		}
	}
	return null;
}

function bumpVersion(version: string, bump: Bump): string {
	const match = /^(\d+)\.(\d+)\.(\d+)/.exec(version);
	if (!match) fail(`Cannot parse version "${version}" — expected X.Y.Z`);
	const [major, minor, patch] = match.slice(1).map(Number);
	if (bump === "major") return `${major + 1}.0.0`;
	if (bump === "minor") return `${major}.${minor + 1}.0`;
	return `${major}.${minor}.${patch + 1}`;
}

function updateJsonVersion(path: string, version: string) {
	const json = JSON.parse(readFileSync(path, "utf8")) as Record<
		string,
		unknown
	>;
	json.version = version;
	writeFileSync(path, `${JSON.stringify(json, null, "\t")}\n`);
}

const args = process.argv.slice(2);
const bump = args.find((arg): arg is Bump =>
	(BUMPS as readonly string[]).includes(arg),
);
const push = !args.includes("--no-push");

if (!bump) {
	console.log("Usage: bun release <patch|minor|major> [--no-push]");
	process.exit(1);
}
// Releases build the committed submodule revisions on GitHub. Local changes
// inside a submodule are not part of this release; a changed gitlink still is.
if (git("status", "--porcelain", "--ignore-submodules=dirty")) {
	fail("Working tree is not clean — commit or stash your changes first.");
}

const packagePath = join(ROOT, "package.json");
const current = (
	JSON.parse(readFileSync(packagePath, "utf8")) as { version: string }
).version;
const version = bumpVersion(current, bump);
const tag = `v${version}`;
if (git("tag", "-l", tag)) {
	fail(`Tag ${tag} already exists.`);
}

const changelogPath = join(ROOT, "CHANGELOG.md");
let changelog: string;
try {
	changelog = prepareChangelogRelease(
		readFileSync(changelogPath, "utf8"),
		version,
		new Date().toISOString().slice(0, 10),
	);
} catch (error) {
	fail(error instanceof Error ? error.message : String(error));
}

updateJsonVersion(packagePath, version);
updateJsonVersion(join(ROOT, "src-tauri", "tauri.conf.json"), version);

const cargoPath = join(ROOT, "src-tauri", "Cargo.toml");
const cargo = readFileSync(cargoPath, "utf8").replace(
	/^version = "[^"]*"/m,
	`version = "${version}"`,
);
writeFileSync(cargoPath, cargo);

const lockPath = join(ROOT, "src-tauri", "Cargo.lock");
const lock = readFileSync(lockPath, "utf8");
const updatedLock = lock.replace(
	/(\[\[package\]\]\r?\nname = "mornye-tools"\r?\nversion = ")[^"]+(?=")/,
	`$1${version}`,
);
if (updatedLock === lock) {
	fail("Could not find the app package in src-tauri/Cargo.lock.");
}
writeFileSync(lockPath, updatedLock);
writeFileSync(changelogPath, changelog);

gitInherit(
	"add",
	"package.json",
	"src-tauri/tauri.conf.json",
	"src-tauri/Cargo.toml",
	"src-tauri/Cargo.lock",
	"CHANGELOG.md",
);
gitInherit("commit", "-m", `chore: release ${tag}`);
gitInherit("tag", tag);

console.log(`\nReleased ${tag} (was ${current}).`);
if (push) {
	// Push GitHub first: pushing origin starts the Forgejo mirror, which can
	// race our direct push or copy the tag before it can trigger the workflow.
	const github = githubRemote();
	if (github) {
		gitInherit("push", github, "HEAD");
		gitInherit("push", github, tag);
	}

	gitInherit("push", "origin", "HEAD");
	gitInherit("push", "origin", tag);

	if (github) {
		console.log(
			`Pushed ${tag} to origin and ${github} — the release workflow is running.`,
		);
	} else {
		console.log(
			`Pushed ${tag} to origin.\n\nThe release workflow runs on GitHub, where a mirror push does not start it.\nEither add a remote and push, or start it by hand in Actions:\n\n  git remote add github https://github.com/Yumeo0/mornye-tools.git\n  git push github HEAD\n  git push github ${tag}\n`,
		);
	}
} else {
	console.log(
		`Push it to trigger the release workflow:\n\n  git push origin HEAD\n  git push origin ${tag}\n`,
	);
}
