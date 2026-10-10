use std::path::Path;

fn main() {
    let mut attributes = tauri_build::Attributes::new();

    // The Wuthering Waves client runs elevated, and Windows (UIPI) discards
    // synthetic mouse/keyboard input sent by non-elevated processes while an
    // elevated window is in the foreground. The packaged app therefore has to
    // run as administrator as well. Dev builds stay non-elevated so that
    // `tauri dev` keeps working from a normal shell.
    if std::env::var("PROFILE").as_deref() == Ok("release") {
        let manifest = r#"
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
</assembly>
"#;
        attributes = attributes
            .windows_attributes(tauri_build::WindowsAttributes::new().app_manifest(manifest));
    }

    verify_bundled_key();

    tauri_build::try_build(attributes).expect("failed to run tauri-build");
}

/// Verify the bundled RSA key is present and looks like a PKCS#1 PEM key.
///
/// The full RSA parse happens at runtime (`sniffer::keys::validate_pem`) so the
/// build stays free of the `rsa` dependency. A missing key is a warning, not a
/// hard build failure: the app still builds, and the runtime surfaces a
/// blocking, actionable error instead of silently not syncing.
fn verify_bundled_key() {
    let manifest_dir = std::env::var("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR");
    let key_path = Path::new(&manifest_dir)
        .join("keys")
        .join("client_private_key.pem");
    println!("cargo:rerun-if-changed=keys/client_private_key.pem");

    if !key_path.exists() {
        println!(
            "cargo:warning=bundled RSA key missing at {}; account sync will be disabled until it is provided",
            key_path.display()
        );
        return;
    }

    let text = std::fs::read_to_string(&key_path).unwrap_or_default();
    if !text.contains("-----BEGIN RSA PRIVATE KEY-----")
        || !text.contains("-----END RSA PRIVATE KEY-----")
    {
        panic!(
            "bundled RSA key at {} is not a PKCS#1 PEM private key",
            key_path.display()
        );
    }
}
