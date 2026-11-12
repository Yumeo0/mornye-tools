use std::{collections::BTreeMap, collections::HashSet, env, fs, path::PathBuf, process::Command};

fn main() {
    let root = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let protos = root.join("../../protocol");
    let out_dir = PathBuf::from(env::var_os("OUT_DIR").unwrap());
    let output = out_dir.join("protocol.bin");
    // Every consumer uses names from the same pinned packet map. Numbers are
    // generated at build time, so a protocol refresh never needs ID edits.
    let ids: BTreeMap<String, String> = serde_json::from_str(
        &fs::read_to_string(protos.join("packetIds.json"))
            .expect("protocol build snapshot is missing"),
    )
    .expect("valid protocol packet map");
    assert!(!ids.is_empty(), "the protocol packet map is empty");
    let mut names = HashSet::new();
    let mut numbers = HashSet::new();
    let mut generated = String::new();
    let mut entries = String::from("pub const ALL: &[(&str, u16)] = &[\n");
    for (number, name) in ids {
        let number: u16 = number.parse().expect("packet ID must fit u16");
        assert!(
            number != 0 && numbers.insert(number),
            "invalid or duplicate packet ID"
        );
        assert!(
            name.starts_with(|ch: char| ch.is_ascii_alphabetic() || ch == '_')
                && name
                    .chars()
                    .all(|ch| ch.is_ascii_alphanumeric() || ch == '_')
                && names.insert(name.clone()),
            "invalid or duplicate protocol message name: {name}"
        );
        generated.push_str(&format!("pub const {name}: u16 = {number};\n"));
        entries.push_str(&format!("    (\"{name}\", {name}),\n"));
    }
    generated.push_str(&entries);
    generated.push_str("];\n");
    fs::write(out_dir.join("message_ids.rs"), generated).expect("write protocol ID constants");
    println!(
        "cargo:rerun-if-changed={}",
        protos.join("protos.proto").display()
    );
    println!(
        "cargo:rerun-if-changed={}",
        protos.join("packetIds.json").display()
    );
    println!("cargo:rerun-if-env-changed=PROTOC");
    let status = Command::new(env::var_os("PROTOC").unwrap_or_else(|| "protoc".into()))
        .arg(format!("--proto_path={}", protos.display()))
        .arg(format!("--descriptor_set_out={}", output.display()))
        .arg("--include_imports")
        .arg(protos.join("protos.proto"))
        .status()
        .expect("protoc is required; install it or set PROTOC to its executable");
    assert!(
        status.success(),
        "protoc failed to compile the pinned protocol"
    );
}
