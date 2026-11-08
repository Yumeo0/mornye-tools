use std::{env, path::PathBuf, process::Command};

fn main() {
    let root = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let protos = root.join("../../../data/wuwa-protos");
    let output = PathBuf::from(env::var_os("OUT_DIR").unwrap()).join("protocol.bin");
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
