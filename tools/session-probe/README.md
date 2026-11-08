# Session probe

This package also exposes the shared authentication, discovery and persistent
session library used by the desktop app's optional
[Dangerous Features](../../docs/DANGEROUS_FEATURES.md). The CLI below remains a
separate inventory probe. Desktop Connect keeps the session alive without
requesting inventory or writing the passive account store.

Experimental, standalone Rust CLI for opening a **new** game connection with
email/password credentials or an existing player's game login token and
retrieving inventory. It does not
link Tauri or Spectrum, inject into the running game, or write the companion's
`account.json`. No upgrades, tuning, purchases, equipment edits, or resource
consumption requests are implemented.

**The complete email/password → session → inventory flow passed live verification**
against the global Europe server and installed Steam game on 2026-11-07
(app `3.7.0`, launcher/resource `3.7.18`). The exported inventory contained
materials, echoes, weapons and characters. Local tests also cover the complete
email/password → account OAuth token → HTTP game login → UDP/KCP → key exchange
→ login → enter-game → inventory flow against mock HTTP and game servers.
The pinned protobuf schema and passive capture parser establish the
message formats, encryption and CRC layout. Future client/server updates may
require further changes to this experimental tool.

## Email/password login

Copy `email-login.example.json` to `login.local.json` and fill it in locally.
It supports Kuro's **global email/password account flow**; mainland-China,
Google, Steam and other third-party login flows are not implemented.

```powershell
Copy-Item tools/session-probe/email-login.example.json tools/session-probe/login.local.json
# Fill in login.local.json locally; it contains your password.
cargo run --manifest-path tools/session-probe/Cargo.toml -- --config tools/session-probe/login.local.json --check
cargo run --manifest-path tools/session-probe/Cargo.toml -- --config tools/session-probe/login.local.json
```

The example needs only a region in `installation.server` plus these local fields
in `email_login`:

- `email` and `password`: your Kuro account credentials. The public H5 password
  transform uses ASCII input, base64 and two character shuffles; it is protocol
  encoding, not password encryption. Requests use HTTPS.
- `device_num`: a consistent device identifier for this test client.

Choose your region explicitly; the example uses Europe. Use `--server Asia`
(or another region/name/ID from the catalogue) to override it for a run. The CLI
never infers a server from your location or an account previously used on the PC.

## Installed versions, SDK and server discovery

These commands require no credentials:

```powershell
cargo run --manifest-path tools/session-probe/Cargo.toml -- --discover
cargo run --manifest-path tools/session-probe/Cargo.toml -- --list-servers
# For a portable/custom install or multiple installed copies:
cargo run --manifest-path tools/session-probe/Cargo.toml -- --discover --game-dir "D:\Games\Wuthering Waves"
```

`--discover` is offline. `--list-servers` downloads only the official public
bootstrap, decodes its base64/AES-256-CBC JSON, and lists region IDs, names and
all login mirrors. It never logs into an account. Both flags can be combined.
The verified catalogue contains America, Asia, Europe, HMT and SEA.

When `installation` is present (or `--game-dir` / `--server` is supplied):

- Locate the global PC installation through Windows uninstall entries and Steam
  library paths, or use `installation.game_dir` / `--game-dir`. The game root,
  launcher root containing `Wuthering Waves Game`, or `Client` directory works.
  Relative config paths resolve beside the config; command-line paths resolve
  from the working directory. Multiple detected installations require a choice.
- Read app version from the active `Client/Saved/Resources/<app>/Mount` directory
  and launcher/resource versions from its `MountLauncher.txt` / `MountResource.txt`.
  When older app directories remain, use the most recently updated mount pair.
  Only `::Mount::` entries count; deleted entries and historical manifests do not.
- Read public SDK client ID, client secret, project, product and channel from
  `Client/Binaries/Win64/ThirdParty/KrPcSdk_Global/KRSDKRes/KRSDK.bin`.
  `KR_GameVersion` is not the session's app version. H5 `sdk.version` remains the
  separately pinned H5 protocol version `2.3.0`; it is not a native DLL version.
- Read the current branch name and public protocol/config version checks from
  installed startup/login logs into `login.DevLoginCheckData`. Branches from a
  different app release are ignored. Only these public checks are retained;
  credentials, account IDs and session tokens in logs are never reused or shown.
  If logs are missing or stale, run the updated game once or supply explicit
  `DevLoginCheckData` fields. Explicit fields override discovered values.
- Locate the bootstrap using an unpacked `Config/Kuro/KuroPublicConfig.ini`
  when available, otherwise startup URLs in the installed `Client*.log` files.
  Logs are decoded in memory; account/session data is never printed or reused.
  If neither source is available, use the built-in global entry. Override it
  using `installation.bootstrap_url` / `--bootstrap-url` after game updates.
- Fetch `LoginServers` from the bootstrap's `p1` override or `default`, match the
  selected region/name/ID, and use the first advertised login mirror with
  `/api/login`. Discovered URLs must use official game HTTPS domains.

Verified locally: app `3.7.0`, launcher/resource `3.7.18`, SDK project `G153`,
product `A1834`, channel `205`. These are discovered at runtime, not version
defaults. Installation and server discovery never modify installed game files.

Explicit `login.AppVersion`, `LauncherVersion`, `ResourceVersion`, and nonempty
`email_login.sdk` identifiers override discovered values. Optional SDK overrides
also include `version` and `user_id_field` (default `cuid`; alternatives
`sdkuserid` or `id`). The global PC SDK supplies `cuid` as its game-login UID.
These account IDs are not interchangeable: using `sdkuserid` caused game-login
error `43` (`TokenNotAuthrized`) during live verification.
You can set `email_login.game_login.url` explicitly; when a region is also
selected, the URL must belong to that region's published login mirrors.
Without installation discovery, provide all version/SDK values and the URL.

`game_login.login_type` defaults to `1` and optional `extra_query` supplies other
protocol parameters. The default HTTP flow passed live verification. URLs
cannot contain embedded credentials, queries or fragments; `extra_query` cannot
replace generated authentication parameters. Handshake command bytes default to
`ed`/`ee`, now verified against the live gateway, and can be overridden.

## Authentication flow

The program performs these exchanges:

1. `POST https://sdkapi.kurogame-service.com/sdkcom/v2/login/emailPwd.lg`
   with the encoded password, email and SDK context.
2. `POST .../auth/getToken.lg` with the returned authorization code.
3. `GET game_login.url` with the **account access token**, selected SDK user ID,
   username, device ID, login type and fresh login trace ID. The response must
   contain `code: 0`, `token` and a nonempty `udpHosts` array of `{host, port}`
   objects. Legacy top-level `host`/`port` is supported when `udpHosts` is absent.
   The probe selects the first usable UDP gateway; TCP gateways are excluded.
4. Use that **game token** and discovered gateway for the existing game session
   flow. The same login trace is included in `LoginRequest`.

The SDK user ID is selected using `sdk.user_id_field`. Passwords
are sent only to the fixed official account endpoint. Redirects are disabled,
and authentication error bodies are not printed. Interactive CAPTCHA, email
verification and identity verification stop the attempt with an error; there
is no challenge solver, retry loop or account registration.

Versions, SDK identifiers and server URLs are discovered automatically. The
HTTP account/game login and the UDP session/inventory stages have passed live
verification. Account tokens are never used directly as UDP game-login tokens.

The default `handshake_format` is `trace_crc`: a 39-byte datagram containing the
SYN command, CRC-disable flag (`0`), trace length (`32`), fresh ASCII hex trace,
and a little-endian CRC32 over the preceding 35 bytes. The ACK must have the
configured command and 13-byte length; its conversation ID starts at byte 1.
Use `"handshake_format": "legacy"` only for an older server expecting a
one-byte SYN. No automatic fallback or protocol guessing occurs.

## Existing-token login

Alternatively, copy `login.example.json` to `login.local.json` and supply your
own account's current values. Omit `email_login` in this mode:

- Actual gateway host/IP and UDP port for the selected server.
- The one-byte connection request and the first byte of the 13-byte connection
  reply, written as two hex digits each. The defaults `ed`/`ee` were accepted by
  the current global gateway with `trace_crc` framing.
- The exact `LoginRequest` fields, including player `Id`, `Account`, fresh
  `Token`, current version strings, and any required device/resource metadata.
  Copy the fields and types from your own decoded login data. `Account` must
  match the game message; it is not necessarily your email address.
- Any nondefault `EnterGameRequest` fields your connection requires. The default
  uses `SingleInstanceId: 8`, the global client's `default_single_map_id`.

`login` and `enter_game` accept fields from
[`data/wuwa-protos/protos.proto`](../../data/wuwa-protos/protos.proto), preserving
their original names (`Id`, `Token`, `ClientBasicInfo`, etc.). Unknown fields
and wrong types are rejected. The template contains intentional placeholders
and will fail validation until filled in. Optional fields can be removed.

The key exchange creates a new random trace ID and reads the server's key. The
observed format uses 32 ASCII hex characters **as the 32 AES key bytes**. For a
server returning an RSA-encrypted key, the CLI automatically uses the companion's
existing `data/client_private_key.pem` protocol resource when available. Set
`private_key_file` to override it with a PKCS#1 PEM file; relative key paths resolve
beside the config. No key material is copied into the probe or printed.
Unsupported formats fail explicitly.

In email mode, omit `gateway`, `login.Account`, `login.Token` and
`login.LoginTraceId`; the HTTP exchanges supply them. With discovery enabled,
`login` can be omitted entirely. `login.Id` may be zero;
the player's actual positive UID is learned from `BasicInfoNotify` or the older
`LoginNotify`. Set the optional
top-level `expected_player_id` to a known UID to reject any mismatch. A player's
UID is not assumed to equal the account-service ID or `login.Id`.

## Run

Requires Rust and `protoc` on PATH (or `PROTOC` pointing at its executable).
The pinned `data/wuwa-protos/protos.proto` and `packetIds.json` must be present.
Build descriptors go only into this program's `target/`; vendored/generated
source files are never rebuilt or edited.

For existing-token mode, from the repository root in PowerShell:

```powershell
Copy-Item tools/session-probe/login.example.json tools/session-probe/login.local.json
# Fill in login.local.json locally. Do not put tokens in command arguments.
cargo run --manifest-path tools/session-probe/Cargo.toml -- --config tools/session-probe/login.local.json --check
cargo run --manifest-path tools/session-probe/Cargo.toml -- --config tools/session-probe/login.local.json
```

`--check` validates the configuration and protobuf fields **without networking**.
It does not validate credentials, resolve the gateway, or establish compatibility.
With discovery enabled it reads the installed metadata. It defers checking the
selected region and URL against the live catalogue until a real run, and never
calls either authentication service.

Without `--check`, the CLI makes one connection attempt, exchanges keys, logs in,
enters the game, and requires a valid player identity notification (matching `expected_player_id`
when supplied). It then requests:

| Request | Export field |
| --- | --- |
| `NormalItemRequest` | `normal_items` (materials and other normal items) |
| `PhantomItemRequest` | `echoes` |
| `WeaponItemRequest` | `weapons` |
| `PbGetRoleListRequest` | `characters` |

Inventory is saved as protocol-shaped JSON to `inventory.local.json` beside the
config. Use `--out <new-path>` to choose another file. Existing files are never
overwritten. A failed stage returns a nonzero exit status and does not export
partial inventory. Receiving an empty inventory list is valid. The snapshots are
fetched sequentially and are not an atomic snapshot across categories.

Only stage messages and numeric server error codes are printed. Passwords,
authorization codes, account/game tokens, session keys, login responses and
reconnect tokens are not logged or exported. The
program's `*.local.json`, `*.key`, and `*.pem` files are gitignored within this
directory; paths elsewhere need their own ignore rules.

The desktop app reuses this client's account authorization and remembers it in
the OS credential store, never in account snapshots or exported inventory. The
standalone CLI does not save or export that authorization. See
[Dangerous Features](../../docs/DANGEROUS_FEATURES.md) for desktop sign-in,
restoration and sign-out behavior.

This opens a genuine additional login session, which may displace an existing
game login. Use it with the official game disconnected. Heartbeats are sent
while requests are pending; per-stage deadlines prevent indefinite waits. The
socket closes on completion or failure. Login queues, token refresh, reconnects,
scene-loading acknowledgments and subsequent server-initiated rekeying are not
implemented. A server requiring those steps will need further protocol work.

## Verify

```powershell
cargo test --manifest-path tools/session-probe/Cargo.toml --locked
cargo clippy --manifest-path tools/session-probe/Cargo.toml --locked --all-targets -- -D warnings
cargo fmt --manifest-path tools/session-probe/Cargo.toml -- --check
```

Tests use loopback sockets and dummy credentials. They cover the three HTTP
authentication exchanges feeding the game session, password encoding against
official JavaScript vectors, account/game token separation, verification errors,
offline validation, existing output preservation, packet framing,
CRC rejection, AES against a known NIST vector, compressed responses and RPC
exceptions (frame types 3/19), three-byte frame lengths above 64 KiB, split and
coalesced frames, the full mocked session with heartbeats, rejected login,
unexpected player/RPC IDs, inventory timeouts, and secret-free diagnostics.
Discovery tests cover installed SDK/mount fixtures, metadata overrides, encoded
startup logs, an independent encrypted catalogue vector, region selection and
endpoint validation. Tests do not depend on a real game installation or internet.
Passing them does not establish official-server acceptance.

RPC exceptions stop the pending operation and report its request name, frame
type and length. Their body stays opaque: a live 14-byte type-3 envelope does not
have the normal response header, so message/RPC IDs must not be inferred from it.
Exception text is never stored or shown. Mutations are never retried when an
exception leaves their outcome unconfirmed.

The desktop upgrader retains this connection's initial echo/material inventory
and follows notifications and confirmed responses. It uses heartbeat barriers
for revalidation instead of repeating inventory initialization RPCs. Loopback
tests reject repeated snapshot requests, verify planning the next stage from
live updates, and stop when material consumption or a discard mark is unconfirmed.
Every spent material requires a fresh authoritative update; final counts include
refunds from tuned echo fodder rather than assuming an exact net deduction.

## Protocol references

- [Official global H5 login page](https://sdk-prod-cdn-aws.kurogame-service.com/pro/h5sdk/login/):
  its public bundle defines the email/password and OAuth endpoints, form fields,
  password transform and verification responses (inspected 2026-11-07).
- [Official account-center page](https://sdk-prod-cdn-aws.kurogame-service.com/pro/account-center/mc/login):
  public SDK product/channel/client configurations. These vary by product.
- [Shorekeeper login schema](https://github.com/thexeondev/Shorekeeper/blob/master/login-server/src/schema.rs)
  and [route](https://github.com/thexeondev/Shorekeeper/blob/master/login-server/src/main.rs):
  community reference for the HTTP game-login query and response, not evidence
  of current official-server acceptance.
- [Official global bootstrap](https://aki-config-aws.aki-game.net/TkSftmDssRx6BIKZBudzeoOHTnxjoL43/index.json):
  `LoginServers` verified live on 2026-11-07.
- [Shorekeeper configuration encryption settings](https://github.com/thexeondev/Shorekeeper/blob/master/config-server/configserver.default.toml)
  and [encoder](https://github.com/thexeondev/Shorekeeper/blob/master/shorekeeper-http/src/util.rs):
  public AES-CBC configuration format, verified against the official bootstrap.
