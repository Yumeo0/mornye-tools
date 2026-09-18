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

    tauri_build::try_build(attributes).expect("failed to run tauri-build");
}
