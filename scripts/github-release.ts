// Publishes Tauri bundles to a GitHub release and maintains the updater's
// `latest.json` manifest. Driven by the release workflow:
//
//   bun scripts/github-release.ts publish   # once per platform build job
//   bun scripts/github-release.ts latest    # once after all platform jobs
//
// Required environment:
//   GITHUB_REPOSITORY   owner/repo (set by Actions; defaults to this project)
//   GITHUB_TOKEN        API token (the workflow's GITHUB_TOKEN; GH_TOKEN works
//                       too)
//   RELEASE_TAG         tag being released, e.g. v0.2.0
//   RELEASE_VERSION     tag without the leading "v"
//   BUNDLE_DIR          Tauri bundle output (publish only)
//   UPDATER_TARGET      override the updater platform key (defaults to the
//                       build machine's platform)
//   RELEASE_NOTES       optional override of the generated commit notes
//
// The app polls `<repo>/releases/latest/download/latest.json`, so the manifest
// is published to the tagged release itself: GitHub's `latest` alias then
// points at the newest release that carries it.
//
// Installers are published under version-less aliases (`mornye-tools-<target>
// -setup.exe` and friends, see INSTALLER_ALIASES) so the README's download
// buttons can link to `releases/latest/download/<alias>` and always land on the
// newest build. The updater archives keep their versioned names because
// `latest.json` points straight at them.

import { execFileSync } from "node:child_process";
import { basename, join } from "node:path";
import { file, Glob, write } from "bun";

interface GitHubAsset {
	id: number;
	name: string;
	browser_download_url: string;
}

interface GitHubRelease {
	id: number;
	tag_name: string;
	body?: string;
	assets?: GitHubAsset[];
}

interface UpdaterPlatform {
	signature: string;
	url: string;
}

const repository = process.env.GITHUB_REPOSITORY ?? "Yumeo0/mornye-tools";
const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
const tag = process.env.RELEASE_TAG ?? "";
const version = process.env.RELEASE_VERSION ?? "";

/** Fail fast when a release job is missing its inputs. */
function requireEnv(): void {
	if (!token || !tag || !version) {
		throw new Error(
			"GITHUB_TOKEN (or GH_TOKEN), RELEASE_TAG and RELEASE_VERSION are required",
		);
	}
}

const api = `https://api.github.com/repos/${repository}`;
const uploads = `https://uploads.github.com/repos/${repository}`;
const authHeaders = {
	Authorization: `Bearer ${token}`,
	Accept: "application/vnd.github+json",
	"X-GitHub-Api-Version": "2022-11-28",
	"User-Agent": "mornye-tools-release",
};

async function apiFetch(
	path: string,
	init: RequestInit = {},
): Promise<Response> {
	const response = await fetch(`${api}${path}`, {
		...init,
		headers: { ...authHeaders, ...init.headers },
	});
	if (!response.ok) {
		const body = await response.text().catch(() => "");
		throw new Error(
			`${init.method ?? "GET"} ${path} failed (${response.status}): ${body.slice(0, 300)}`,
		);
	}
	return response;
}

async function findRelease(name: string): Promise<GitHubRelease | null> {
	const response = await fetch(
		`${api}/releases/tags/${encodeURIComponent(name)}`,
		{ headers: authHeaders },
	);
	if (response.status === 404) return null;
	if (!response.ok) {
		throw new Error(
			`GET release ${name} failed (${response.status}): ${await response.text()}`,
		);
	}
	return (await response.json()) as GitHubRelease;
}

/** Release notes from the commits since the previous v* tag. */
function releaseNotes(): string {
	let previous = "";
	try {
		const tags = execFileSync("git", ["tag", "-l", "v*", "--sort=-v:refname"])
			.toString()
			.split("\n")
			.map((line) => line.trim())
			.filter(Boolean);
		previous = tags.find((name) => name !== tag) ?? "";
	} catch {
		// Best effort: fall back to the full history.
	}
	const range = previous ? `${previous}..${tag}` : tag;
	let log = "";
	try {
		log = execFileSync("git", ["log", range, "--pretty=format:- %s"])
			.toString()
			.trim();
	} catch {
		// ignore
	}
	return `Release ${tag}\n\n## Changes\n${log || "- No changes recorded."}`;
}

async function ensureRelease(
	name: string,
	body: string,
): Promise<GitHubRelease> {
	const existing = await findRelease(name);
	if (existing) return existing;
	const response = await apiFetch("/releases", {
		method: "POST",
		body: JSON.stringify({
			tag_name: name,
			name,
			body,
			draft: false,
			prerelease: false,
		}),
		headers: { "Content-Type": "application/json" },
	});
	return (await response.json()) as GitHubRelease;
}

/** Uploads a file, replacing any asset that already carries its name. */
async function upload(
	release: GitHubRelease,
	path: string,
	name = basename(path),
) {
	const existing = release.assets?.find((asset) => asset.name === name);
	if (existing) {
		await apiFetch(`/releases/assets/${existing.id}`, { method: "DELETE" });
		release.assets = release.assets?.filter(
			(asset) => asset.id !== existing.id,
		);
	}
	const response = await fetch(
		`${uploads}/releases/${release.id}/assets?name=${encodeURIComponent(name)}`,
		{
			method: "POST",
			// GitHub takes the raw bytes here, not a multipart form.
			body: await file(path).arrayBuffer(),
			headers: { ...authHeaders, "Content-Type": "application/octet-stream" },
		},
	);
	if (!response.ok) {
		throw new Error(
			`POST asset ${name} failed (${response.status}): ${(await response.text()).slice(0, 300)}`,
		);
	}
	const asset = (await response.json()) as GitHubAsset;
	release.assets = [...(release.assets ?? []), asset];
}

async function uploadJson(
	release: GitHubRelease,
	name: string,
	value: unknown,
) {
	const temporary = join(process.env.BUNDLE_DIR ?? ".", name);
	await write(temporary, `${JSON.stringify(value, null, 2)}\n`);
	await upload(release, temporary, name);
}

const ARCH: Record<string, string> = { x64: "x86_64", arm64: "aarch64" };

/** The Tauri updater target key of the running machine. */
function updaterTarget(): string {
	const arch = ARCH[process.arch] ?? process.arch;
	if (process.platform === "win32") return `windows-${arch}`;
	if (process.platform === "darwin") return `darwin-${arch}`;
	return `linux-${arch}`;
}

/**
 * Among the signed updater bundles prefer the installable archive Tauri
 * generates for each platform (the NSIS installer and the AppImage can also be
 * signed, but the updater consumes the compressed artifact).
 */
const ARTIFACT_PREFERENCE = [
	/\.AppImage\.tar\.gz$/,
	/\.app\.tar\.gz$/,
	/\.nsis\.zip$/,
	/-setup\.exe$/,
	/\.msi\.zip$/,
	/\.AppImage$/,
];

function pickArtifact(signatures: string[]): string {
	for (const pattern of ARTIFACT_PREFERENCE) {
		const match = signatures.find((file) => pattern.test(file));
		if (match) return match;
	}
	return signatures[0];
}

/**
 * The product name the alias filenames are built from. It has to match
 * `productName` in tauri.conf.json, and the README's download buttons link to
 * these aliases - keep all three in sync.
 */
const PRODUCT = "mornye-tools";

/**
 * Stable names for the artifacts a person downloads, keyed by their Tauri
 * filename suffix. Updater archives (`.nsis.zip`, `.msi.zip`,
 * `.AppImage.tar.gz`) match none of these and keep their versioned names.
 */
const INSTALLER_ALIASES: Array<{
	pattern: RegExp;
	alias: (target: string) => string;
}> = [
	{
		pattern: /-setup\.exe$/,
		alias: (target) => `${PRODUCT}-${target}-setup.exe`,
	},
	{ pattern: /\.msi$/, alias: (target) => `${PRODUCT}-${target}.msi` },
	{
		pattern: /\.AppImage$/,
		alias: (target) => `${PRODUCT}-${target}.AppImage`,
	},
	{ pattern: /\.deb$/, alias: (target) => `${PRODUCT}-${target}.deb` },
	{ pattern: /\.rpm$/, alias: (target) => `${PRODUCT}-${target}.rpm` },
];

/**
 * The asset name an artifact is published under. Installers drop the version so
 * `releases/latest/download/<name>` keeps pointing at the newest build; every
 * other artifact keeps its Tauri name.
 */
function publishedAssetName(artifact: string, target: string): string {
	const name = basename(artifact);
	for (const { pattern, alias } of INSTALLER_ALIASES) {
		if (pattern.test(name)) return alias(target);
	}
	return name;
}

/**
 * The signed artifacts of this release. A restored build cache can leave
 * earlier runs' bundle directories behind, so artifacts from previous versions
 * are filtered out by filename - otherwise an old installer could be picked for
 * the updater manifest (and re-published on every run).
 */
async function signedArtifacts(
	bundleDir: string,
	releaseVersion: string,
): Promise<string[]> {
	const glob = new Glob("**/*.sig");
	const signatures: string[] = [];
	for await (const file of glob.scan({ cwd: bundleDir, absolute: true })) {
		signatures.push(file);
	}
	const escaped = releaseVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const versioned = new RegExp(`[_-]${escaped}[_.-]`);
	return signatures
		.map((file) => file.slice(0, -4))
		.filter((file) => versioned.test(basename(file)))
		.sort((a, b) => a.localeCompare(b));
}

/** One platform's build: upload its bundles and record the updater entry. */
async function publish() {
	requireEnv();
	const bundleDir = process.env.BUNDLE_DIR ?? "src-tauri/target/release/bundle";
	const release = await ensureRelease(
		tag,
		process.env.RELEASE_NOTES ?? releaseNotes(),
	);
	const target = process.env.UPDATER_TARGET ?? updaterTarget();
	const artifacts = await signedArtifacts(bundleDir, version);
	if (artifacts.length === 0) {
		throw new Error(
			`No signed ${version} updater artifacts found in ${bundleDir}`,
		);
	}

	for (const artifact of artifacts) {
		const name = publishedAssetName(artifact, target);
		await upload(release, artifact, name);
		await upload(release, `${artifact}.sig`, `${name}.sig`);
		if (name !== basename(artifact)) {
			console.log(
				`  ${basename(artifact)} -> ${name} (releases/latest/download/${name})`,
			);
		}
	}

	const chosen = pickArtifact(artifacts);
	const signature = (await file(`${chosen}.sig`).text()).trim();
	console.log(`Updater artifact for ${target}: ${basename(chosen)}`);
	await uploadJson(release, `platform-${target}.json`, {
		version,
		notes: release.body ?? `Release ${tag}`,
		pub_date: new Date().toISOString(),
		platforms: {
			[target]: {
				signature,
				url: `https://github.com/${repository}/releases/download/${tag}/${encodeURIComponent(basename(chosen))}`,
			},
		},
	});
}

/** True when `candidate` is a strictly newer version than `current`. */
function isNewerVersion(candidate: string, current: string): boolean {
	const parse = (value: string) =>
		value
			.replace(/^v/, "")
			.split(/[.-]/)
			.map((part) => Number.parseInt(part, 10) || 0);
	const a = parse(candidate);
	const b = parse(current);
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0);
	}
	return false;
}

/** Merges every platform entry from the tagged release into latest.json. */
async function latest() {
	requireEnv();
	const release = await findRelease(tag);
	if (!release) throw new Error(`Release ${tag} not found`);
	const platforms: Record<string, UpdaterPlatform> = {};
	for (const asset of release.assets ?? []) {
		if (!/^platform-.+\.json$/.test(asset.name)) continue;
		const response = await fetch(asset.browser_download_url, {
			headers: authHeaders,
		});
		if (!response.ok) {
			throw new Error(`Could not download ${asset.name} (${response.status})`);
		}
		const manifest = (await response.json()) as {
			platforms?: Record<string, UpdaterPlatform>;
		};
		Object.assign(platforms, manifest.platforms ?? {});
	}
	if (Object.keys(platforms).length === 0) {
		throw new Error(`No platform manifests found on release ${tag}`);
	}

	// Never let an older tag's re-run downgrade the manifest the app polls.
	const published = await publishedVersion();
	if (published && isNewerVersion(published, version)) {
		console.log(
			`latest.json already serves ${published} - skipping ${version}`,
		);
		return;
	}

	await uploadJson(release, "latest.json", {
		version,
		notes: release.body ?? `Release ${tag}`,
		pub_date: new Date().toISOString(),
		platforms,
	});
	console.log(`latest.json updated to ${version} (${Object.keys(platforms)})`);
}

/** The version the newest release's latest.json currently serves. */
async function publishedVersion(): Promise<string | null> {
	try {
		const response = await fetch(`${api}/releases/latest`, {
			headers: authHeaders,
		});
		if (!response.ok) return null;
		const release = (await response.json()) as GitHubRelease;
		const asset = release.assets?.find((item) => item.name === "latest.json");
		if (!asset) return null;
		const manifest = await fetch(asset.browser_download_url, {
			headers: authHeaders,
		});
		if (!manifest.ok) return null;
		return ((await manifest.json()) as { version?: string }).version ?? null;
	} catch {
		return null;
	}
}

export { publishedAssetName };

if (import.meta.main) {
	const command = process.argv[2];
	if (command === "publish") {
		await publish();
	} else if (command === "latest") {
		await latest();
	} else {
		throw new Error("Usage: bun scripts/github-release.ts <publish|latest>");
	}
}
