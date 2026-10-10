use std::{
    env, fs,
    io::ErrorKind,
    path::{Path, PathBuf},
};

use prost_build::Config;
use quote::format_ident;
use serde_json::Value;

type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

fn main() {
    if let Err(e) = try_main() {
        eprintln!("Build failed: {e}");
        std::process::exit(1);
    }
}

fn try_main() -> Result<()> {
    let manifest_dir = env::var("CARGO_MANIFEST_DIR")?;
    let manifest = PathBuf::from(manifest_dir);

    // Protos live in this crate's own `proto/` directory by default. A consumer
    // can point at another directory with `SPECTRUM_PROTO_DIR` (absolute, or
    // relative to this crate).
    let proto_dir = match env::var_os("SPECTRUM_PROTO_DIR") {
        Some(dir) => {
            let dir = PathBuf::from(dir);
            if dir.is_absolute() {
                dir
            } else {
                manifest.join(dir)
            }
        }
        None => manifest.join("proto"),
    };

    let out_dir = manifest.join("src/game/proto");
    let message_ids_path = manifest.join("src/game");

    fs::create_dir_all(&out_dir)?;
    fs::create_dir_all(&message_ids_path)?;

    let proto_files = find_proto_files(&proto_dir)?;
    generate_protos(&proto_files, &out_dir)?;

    let packet_ids = load_packet_ids(&proto_dir)?;
    generate_message_ids_enum(&packet_ids, &message_ids_path)?;

    println!(
        "cargo:rerun-if-changed={}",
        proto_dir.join("packetIds.json").display()
    );
    println!("cargo:rerun-if-changed={}", proto_dir.display());
    println!("cargo:rerun-if-env-changed=SPECTRUM_PROTO_DIR");
    Ok(())
}

fn find_proto_files(dir: &Path) -> Result<Vec<PathBuf>> {
    let entries = fs::read_dir(dir)?
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .filter(|path| path.extension().is_some_and(|ext| ext == "proto"))
        .collect::<Vec<_>>();

    if entries.is_empty() {
        return Err("No .proto files found in proto directory".into());
    }
    Ok(entries)
}

fn generate_protos(proto_files: &[PathBuf], out_dir: &Path) -> Result<()> {
    let mut config = Config::new();
    config.enable_type_names();
    config.out_dir(out_dir);
    config.default_package_filename("protos");

    if env::var("CARGO_FEATURE_SERDE").is_ok() {
        if env::var("CARGO_FEATURE_SERDE_SKIP_NONE").is_ok() {
            config.type_attribute(".", "#[serde_with::skip_serializing_none]");
        }
        config.type_attribute(".", "#[derive(serde::Serialize, serde::Deserialize)]");
    }

    config.compile_protos(
        proto_files,
        &[proto_files[0]
            .parent()
            .expect("Proto file has parent directory")],
    )?;

    Ok(())
}

fn load_packet_ids(proto_dir: &Path) -> Result<Vec<(u16, String)>> {
    let json_path = proto_dir.join("packetIds.json");
    let json_data = fs::read_to_string(&json_path)
        .map_err(|e| format!("Failed to read {}: {e}", json_path.display()))?;

    let json_value: Value = serde_json::from_str(&json_data)
        .map_err(|e| format!("Invalid JSON in {}: {e}", json_path.display()))?;

    let json_object = json_value
        .as_object()
        .ok_or_else(|| format!("Expected JSON object in {}", json_path.display()))?;

    let mut packet_ids = json_object
        .iter()
        .map(|(key, value)| {
            let id = key
                .parse::<u16>()
                .map_err(|e| format!("Invalid packet ID '{key}': {e}"))?;
            let name = value
                .as_str()
                .ok_or_else(|| format!("Expected string value for packet ID {id}"))?
                .to_string();
            Ok((id, name))
        })
        .collect::<Result<Vec<_>>>()?;

    if packet_ids.is_empty() {
        return Err("No packet IDs found in packetIds.json".into());
    }

    packet_ids.sort_by_key(|(id, _)| *id);
    Ok(packet_ids)
}

fn generate_message_ids_enum(packet_ids: &[(u16, String)], out_dir: &Path) -> Result<()> {
    let variants = packet_ids.iter().map(|(id, name)| {
        let ident = format_ident!("{}", name);
        quote::quote! {
            #[allow(non_camel_case_types, non_upper_case_globals)]
            #ident = #id,
        }
    });

    let tokens = quote::quote! {
        use num_enum::TryFromPrimitive;
        use strum_macros::{AsRefStr, IntoStaticStr};

        #[repr(u16)]
        #[derive(Debug, Copy, Clone, PartialEq, Eq, TryFromPrimitive, AsRefStr, IntoStaticStr)]
        pub enum MessageId {
            #(#variants)*
        }
    };

    let output_path = out_dir.join("message.rs");
    fs::write(&output_path, tokens.to_string())?;

    if let Err(e) = std::process::Command::new("rustfmt")
        .arg(&output_path)
        .status()
        && e.kind() != ErrorKind::NotFound
    {
        eprintln!("Failed to format generated file: {e}");
    }

    Ok(())
}
