# Game client

The app's authentication, server discovery, transport and echo upgrade library.
Desktop connection controls use it through `mornye-connection`.
See [active connection usage](../../../docs/DANGEROUS_FEATURES.md).

The included CLI opens a session, exports materials, echoes, weapons and
characters, then disconnects.

A new session can disconnect your running game. Use the CLI with the game
disconnected. It exports inventory without changing equipment or spending items.

## Run

Requires Rust, `protoc`, the pinned `data/wuwa-protos/` files, and an installed
global PC client. From the repository root:

```powershell
Set-Location src-tauri
Copy-Item crates/game-client/email-login.example.json crates/game-client/login.local.json
# Fill in email_login.email, password and a consistent device_num.
# Set installation.server to your region; the example uses Europe.
cargo run -p mornye-game-client -- --config crates/game-client/login.local.json --check
cargo run -p mornye-game-client -- --config crates/game-client/login.local.json
```

Supports global Kuro email/password login. Third-party and mainland-China login
flows are unsupported. CAPTCHA or verification challenges stop the attempt.

`--check` validates local config and protobuf fields without networking; it does
not verify credentials or contact the selected server.
A real run writes `inventory.local.json` beside the config. Existing output files
are never overwritten; use `--out <new-path>` for another destination.
Failed fetches do not export partial inventory.

## Discovery and options

Run these commands from `src-tauri/` too.

```powershell
# Offline installation/version discovery:
cargo run -p mornye-game-client -- --discover
# Fetch the official public server list without signing in:
cargo run -p mornye-game-client -- --list-servers
```

| Option | Use |
| --- | --- |
| `--game-dir <path>` | Choose a custom or ambiguous installation |
| `--server <region-or-id>` | Override the config's region for a real run |
| `--bootstrap-url <https-url>` | Override the public server catalogue after a game update |
| `--out <path>` | Choose a new inventory export path |

App/resource versions and SDK settings come from the installation. If discovery
fails after an update, run the updated game once to refresh its logs.
Config-relative paths resolve beside the config; CLI paths resolve from the
working directory.

## Credentials and protocol maintenance

Keep credentials in the local config, never command arguments.
`*.local.json`, `*.key` and `*.pem` are ignored in this directory.
The CLI does not save reusable account authorization; its config still contains
the password you entered. Logs and inventory exports exclude tokens and keys.

The flow is account login → OAuth authorization → HTTP game token →
UDP/KCP session → inventory. Account tokens and game tokens are distinct;
`sdk.user_id_field` defaults to `uid` (using `sdkuserid` caused login error 43).

For existing-token mode, omit `email_login` and supply `gateway`, `login` and
optional `enter_game` fields as defined in `src/config.rs` and the pinned protobuf
schema. Field names and types are validated. Optional `expected_player_id`
rejects a different authenticated UID. The default handshake is `trace_crc`
with command bytes `ed`/`ee`; there is no automatic protocol fallback.

Frames use three-byte little-endian lengths. RPC exception bodies stay opaque.
The desktop upgrade worker waits for authoritative inventory updates and never
retries uncertain mutations. Login queues, automatic reconnects and subsequent
server rekeying are unsupported.

## Checks

```powershell
cargo test -p mornye-game-client --locked
cargo clippy -p mornye-game-client --locked --all-targets -- -D warnings
cargo fmt -p mornye-game-client -- --check
```

Tests use local mocks and dummy credentials, covering authentication, framing,
inventory updates and mutation confirmation without a game installation or live
account.
