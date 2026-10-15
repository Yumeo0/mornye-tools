use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Load a JSON config from src/configs, trying the development path first and
/// then the bundled resource path (for production builds).
pub(crate) fn load_json_resource<T: serde::de::DeserializeOwned>(
    app_handle: &AppHandle,
    file_name: &str,
) -> Result<T, String> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        if let Some(project_root) = PathBuf::from(manifest_dir).parent() {
            candidates.push(project_root.join("src/configs").join(file_name));
        }
    }
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        candidates.push(resource_dir.join("src/configs").join(file_name));
        // Resources outside the Tauri crate are bundled under `_up_/`.
        candidates.push(resource_dir.join("_up_/src/configs").join(file_name));
        candidates.push(resource_dir.join("configs").join(file_name));
        candidates.push(resource_dir.join(file_name));
    }

    for path in candidates {
        if let Ok(content) = fs::read_to_string(&path) {
            return serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse {}: {}", file_name, e));
        }
    }

    Err(format!("{} not found", file_name))
}

/// Load a binary resource (e.g. an icon template), trying the development
/// project path first and then the bundled resource paths. Mirrors
/// [`load_json_resource`]; `relative_path` is relative to the repository root
/// (e.g. `public/sort_icon.png`).
pub(crate) fn load_binary_resource(
    app_handle: &AppHandle,
    relative_path: &str,
) -> Result<Vec<u8>, String> {
    let mut candidates: Vec<PathBuf> = Vec::new();
    if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
        if let Some(project_root) = PathBuf::from(manifest_dir).parent() {
            candidates.push(project_root.join(relative_path));
        }
    }
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        // Resources outside the Tauri crate are bundled under `_up_/`.
        candidates.push(resource_dir.join("_up_").join(relative_path));
        candidates.push(resource_dir.join(relative_path));
        if let Some(file_name) = relative_path.rsplit('/').next() {
            candidates.push(resource_dir.join(file_name));
        }
    }

    for path in candidates {
        if let Ok(bytes) = fs::read(&path) {
            return Ok(bytes);
        }
    }

    Err(format!("{relative_path} not found"))
}
