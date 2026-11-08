use serde_json::json;
use std::{
    fs,
    net::UdpSocket,
    path::PathBuf,
    process::{Command, Output},
    time::Duration,
};

struct LocalConfig {
    directory: PathBuf,
    path: PathBuf,
}

impl LocalConfig {
    fn new(value: &serde_json::Value) -> Self {
        let directory = std::env::temp_dir().join(format!(
            "mornye-game-client-test-{}-{}",
            std::process::id(),
            rand::random::<u64>()
        ));
        fs::create_dir(&directory).unwrap();
        let path = directory.join("login.local.json");
        fs::write(&path, serde_json::to_vec(value).unwrap()).unwrap();
        Self { directory, path }
    }

    fn check(&self) -> Output {
        Command::new(env!("CARGO_BIN_EXE_mornye-game-client"))
            .arg("--config")
            .arg(&self.path)
            .arg("--check")
            .output()
            .unwrap()
    }
}

impl Drop for LocalConfig {
    fn drop(&mut self) {
        // This directory is created exclusively for this fixture, directly under temp_dir.
        assert_eq!(
            self.directory.parent(),
            Some(std::env::temp_dir().as_path())
        );
        let _ = fs::remove_dir_all(&self.directory);
    }
}

fn install_fixture(config: &LocalConfig) -> PathBuf {
    let root = config.directory.join("game");
    let client = root.join("Client");
    let sdk = client.join("Binaries/Win64/ThirdParty/KrPcSdk_Global/KRSDKRes/KRSDK.bin");
    fs::create_dir_all(sdk.parent().unwrap()).unwrap();
    fs::write(sdk, "KR_GameVersion=3.7.1\nKR_ProjectId=G153\nKR_ProductId=A1834\nKR_ChannelID=205\nKR_AppKey=test-client\nKR_SecretKey=never-print-sdk-secret\n").unwrap();
    let mounts = client.join("Saved/Resources/3.7.0/Mount");
    fs::create_dir_all(&mounts).unwrap();
    for kind in ["Launcher", "Resource"] {
        fs::write(
            mounts.join(format!("Mount{kind}.txt")),
            format!(
                "::Mount::\n{kind}/3.7.18/active.pak,22,hash\n::Del::\n{kind}/3.7.99/deleted.pak\n"
            ),
        )
        .unwrap();
    }
    // A historical manifest must not override active mounts.
    fs::create_dir_all(client.join("Saved/Resources/3.7.0/ResManifest")).unwrap();
    fs::write(
        client.join("Saved/Resources/3.7.0/ResManifest/ManifestLauncher_3.7.99.txt"),
        "old",
    )
    .unwrap();
    let logs = client.join("Saved/Logs");
    fs::create_dir_all(&logs).unwrap();
    let log = b"Token=never-print-log-token https://aki-config-aws.aki-game.net/test-entry/index.json\n[branch: branch_3.7_final][platform: Windows]\n[ConfigMd5: d41d8cd98f00b204e9800998ecf8427e][ConfigVersion: 8958936][ProtoMd5: 09e2687d71211d9ddaf9be8343586ba9][ProtoSeedMd5: 66998bb533bca97154a7baff3da5e37d][ProtoVersion: 8889113][LoginTraceId: never-print-log-trace]";
    let encoded: Vec<_> = log
        .iter()
        .map(|b| b ^ if b & 1 != 0 { 0xef } else { 0xa5 })
        .collect();
    fs::write(logs.join("Client.log"), encoded).unwrap();
    root
}

#[test]
fn minimal_email_config_discovers_metadata_and_checks_offline() {
    let config = LocalConfig::new(&json!({
        "installation": {"game_dir": "game", "server": "Europe"},
        "email_login": {"email":"test@example.invalid", "password":"never-print-password", "device_num":"test-device"}
    }));
    let root = install_fixture(&config);
    let output = config.check();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(String::from_utf8_lossy(&output.stdout).contains("No network connection"));
    assert!(String::from_utf8_lossy(&output.stdout).contains("Selected server will be resolved"));
    assert!(!config.directory.join("inventory.local.json").exists());
    let discover = Command::new(env!("CARGO_BIN_EXE_mornye-game-client"))
        .args(["--discover", "--game-dir"])
        .arg(root.join("Client"))
        .output()
        .unwrap();
    assert!(
        discover.status.success(),
        "{}",
        String::from_utf8_lossy(&discover.stderr)
    );
    let report: serde_json::Value = serde_json::from_slice(&discover.stdout).unwrap();
    assert_eq!(report["app_version"], "3.7.0");
    assert_eq!(report["launcher_version"], "3.7.18");
    assert_eq!(report["resource_version"], "3.7.18");
    assert_eq!(report["branch"], "branch_3.7_final");
    assert_eq!(report["login_check"]["ProtoVersion"], 8889113);
    assert_eq!(
        report["login_check"]["ConfigMD5"],
        "d41d8cd98f00b204e9800998ecf8427e"
    );
    assert_eq!(report["sdk"]["product_id"], "A1834");
    assert_eq!(
        report["bootstrap_url"],
        "https://aki-config-aws.aki-game.net/test-entry/index.json"
    );
    for result in [output, discover] {
        assert!(!String::from_utf8_lossy(&result.stdout).contains("never-print"));
        assert!(!String::from_utf8_lossy(&result.stderr).contains("never-print"));
    }
}

fn fixture(gateway: &str) -> serde_json::Value {
    json!({
        "gateway": gateway,
        "handshake_request_hex": "41",
        "handshake_response_hex": "42",
        "login": { "Id": 123, "Account": "test-account", "Token": "secret-test-token", "AppVersion": "test", "LauncherVersion": "test", "ResourceVersion": "test" }
    })
}

#[test]
fn check_validates_without_sending_any_datagram_or_creating_inventory() {
    let listener = UdpSocket::bind("127.0.0.1:0").unwrap();
    listener
        .set_read_timeout(Some(Duration::from_millis(100)))
        .unwrap();
    let config = LocalConfig::new(&fixture(&listener.local_addr().unwrap().to_string()));
    let output = config.check();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(String::from_utf8_lossy(&output.stdout).contains("No network connection"));
    assert!(!config.directory.join("inventory.local.json").exists());
    assert!(listener.recv_from(&mut [0u8; 64]).is_err());
}

#[test]
fn email_password_check_needs_no_game_token_and_makes_no_http_connection() {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    listener.set_nonblocking(true).unwrap();
    let mut value: serde_json::Value =
        serde_json::from_str(include_str!("../email-login.example.json")).unwrap();
    value.as_object_mut().unwrap().remove("installation");
    value["email_login"]["email"] = json!("test@example.invalid");
    value["email_login"]["password"] = json!("secret-test-password");
    value["email_login"]["device_num"] = json!("test-device");
    for key in [
        "client_id",
        "client_secret",
        "project_id",
        "product_id",
        "channel_id",
    ] {
        value["email_login"]["sdk"][key] = json!("test-public-client-value");
    }
    value["email_login"]["game_login"]["url"] = json!(format!(
        "https://{}/api/login",
        listener.local_addr().unwrap()
    ));
    for key in ["AppVersion", "LauncherVersion", "ResourceVersion"] {
        value["login"][key] = json!("test");
    }
    let config = LocalConfig::new(&value);
    let output = config.check();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(!String::from_utf8_lossy(&output.stdout).contains("secret-test-password"));
    assert!(!String::from_utf8_lossy(&output.stderr).contains("secret-test-password"));
    assert!(listener.accept().is_err());
    assert!(!config.directory.join("inventory.local.json").exists());
}

#[test]
fn invalid_inputs_fail_without_echoing_credentials() {
    for mutate in 0..3 {
        let mut value = fixture("127.0.0.1:9");
        match mutate {
            0 => value["login"]["Id"] = json!("secret-test-token"),
            1 => value["secret-test-token"] = json!("unexpected top-level option"),
            _ => value["handshake_request_hex"] = json!("secret-test-token"),
        }
        let config = LocalConfig::new(&value);
        let output = config.check();
        assert!(!output.status.success());
        assert!(!String::from_utf8_lossy(&output.stderr).contains("secret-test-token"));
        assert!(!String::from_utf8_lossy(&output.stdout).contains("secret-test-token"));
        assert!(!config.directory.join("inventory.local.json").exists());
    }
}

#[test]
fn existing_output_is_preserved_before_attempting_connection() {
    let config = LocalConfig::new(&fixture("127.0.0.1:9"));
    let inventory = config.directory.join("inventory.local.json");
    fs::write(&inventory, "existing snapshot").unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_mornye-game-client"))
        .arg("--config")
        .arg(&config.path)
        .output()
        .unwrap();
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stderr).contains("output already exists"));
    assert_eq!(fs::read_to_string(&inventory).unwrap(), "existing snapshot");
    fs::remove_file(inventory).unwrap();
}
