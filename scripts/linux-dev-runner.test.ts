import { afterEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const linuxTest = process.platform === "linux" ? test : test.skip;
const fixtures: string[] = [];

afterEach(() => {
	for (const root of fixtures.splice(0))
		rmSync(root, { recursive: true, force: true });
});

function run(
	options: {
		caps?: string;
		name?: string;
		sudoExit?: string;
		appExit?: string;
	} = {},
) {
	const root = mkdtempSync(join(tmpdir(), "mornye runner test "));
	fixtures.push(root);
	const bin = join(root, "bin");
	mkdirSync(bin);
	const log = join(root, "calls");
	writeFileSync(log, "");
	const executable = (path: string, source: string) => {
		writeFileSync(path, `#!/bin/sh\nset -eu\n${source}\n`);
		chmodSync(path, 0o755);
	};
	executable(join(bin, "id"), 'printf "1000\\n"');
	executable(
		join(bin, "getcap"),
		'echo getcap >> "$RUNNER_TEST_LOG"\nprintf "%s %s\\n" "$1" "$RUNNER_TEST_CAPS"',
	);
	executable(
		join(bin, "sudo"),
		'echo sudo >> "$RUNNER_TEST_LOG"\nif [ "$RUNNER_TEST_SUDO_EXIT" != 0 ]; then exit "$RUNNER_TEST_SUDO_EXIT"; fi\nexec "$@"',
	);
	executable(
		join(bin, "setcap"),
		'printf "setcap:%s\\ntarget:%s\\n" "$1" "$2" >> "$RUNNER_TEST_LOG"',
	);
	const app = join(root, options.name ?? "mornye-tools");
	executable(
		app,
		'echo app >> "$RUNNER_TEST_LOG"\nprintf "arg:%s\\n" "$@" >> "$RUNNER_TEST_LOG"\nexit "$RUNNER_TEST_APP_EXIT"',
	);
	const result = spawnSync(
		"/bin/sh",
		[
			join(import.meta.dir, "linux-dev-runner.sh"),
			app,
			"--example",
			"argument with spaces",
		],
		{
			env: {
				...process.env,
				PATH: `${bin}:${process.env.PATH}`,
				RUNNER_TEST_LOG: log,
				RUNNER_TEST_CAPS: options.caps ?? "",
				RUNNER_TEST_SUDO_EXIT: options.sudoExit ?? "0",
				RUNNER_TEST_APP_EXIT: options.appExit ?? "0",
			},
			encoding: "utf8",
		},
	);
	return { result, app, calls: readFileSync(log, "utf8").trim().split("\n") };
}

linuxTest(
	"grants CAP_NET_RAW before launch and preserves paths and arguments with spaces",
	() => {
		const { result, app, calls } = run();
		expect(result.status).toBe(0);
		expect(calls).toEqual([
			"getcap",
			"sudo",
			"setcap:cap_net_raw=ep",
			`target:${app}`,
			"app",
			"arg:--example",
			"arg:argument with spaces",
		]);
	},
);

linuxTest("reuses an effective capture grant without invoking sudo", () => {
	for (const caps of ["cap_net_raw=ep", "cap_net_admin,cap_net_raw=eip"]) {
		const { result, calls } = run({ caps });
		expect(result.status).toBe(0);
		expect(calls).toEqual([
			"getcap",
			"app",
			"arg:--example",
			"arg:argument with spaces",
		]);
	}
});

linuxTest("repairs a grant whose effective flag is missing", () => {
	const { result, calls } = run({ caps: "cap_net_raw=p" });
	expect(result.status).toBe(0);
	expect(calls).toContain("sudo");
});

linuxTest("does not launch when sudo rejects the capability grant", () => {
	const { result, calls } = run({ sudoExit: "1" });
	expect(result.status).toBe(1);
	expect(calls).toEqual(["getcap", "sudo"]);
});

linuxTest(
	"passes test and CLI binaries through without checking capabilities",
	() => {
		const { result, calls } = run({
			name: "mornye-game-client",
			appExit: "23",
		});
		expect(result.status).toBe(23);
		expect(calls).toEqual(["app", "arg:--example", "arg:argument with spaces"]);
	},
);
