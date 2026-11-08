use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

/// Candidate locations for a bundled resource: the development source tree
/// first, then the packaged resource directory. Resources outside the Tauri
/// crate are bundled under `_up_/`; the relative paths are also probed inside
/// both resource roots so a flat layout keeps working.
pub fn resource_candidates(
    app_handle: &AppHandle,
    relative_paths: impl IntoIterator<Item = impl AsRef<Path>>,
) -> Vec<PathBuf> {
    resource_paths(
        relative_paths,
        app_handle.path().resource_dir().ok().as_deref(),
    )
}

fn resource_paths(
    relative_paths: impl IntoIterator<Item = impl AsRef<Path>>,
    resource_dir: Option<&Path>,
) -> Vec<PathBuf> {
    let mut dev_candidates: Vec<PathBuf> = Vec::new();
    let mut resource_candidates: Vec<PathBuf> = Vec::new();

    let relative_paths: Vec<PathBuf> = relative_paths
        .into_iter()
        .map(|path| path.as_ref().to_path_buf())
        .collect();

    let project_root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../..");
    dev_candidates.extend(relative_paths.iter().map(|path| project_root.join(path)));
    if let Some(resource_dir) = resource_dir {
        for relative_path in &relative_paths {
            resource_candidates.push(resource_dir.join(relative_path));
            // Resources outside the Tauri crate are bundled under `_up_/`.
            resource_candidates.push(resource_dir.join("_up_").join(relative_path));
        }
    }

    dev_candidates.extend(resource_candidates);
    dev_candidates
}

/// Load a JSON config from `src/configs`, trying the development path first
/// and then the bundled resource path (for production builds). Both layouts
/// are the same repository-relative one; see `tauri.conf.json`'s resources.
pub fn load_json_resource<T: serde::de::DeserializeOwned>(
    app_handle: &AppHandle,
    file_name: &str,
) -> Result<T, String> {
    let candidates = resource_candidates(app_handle, [format!("src/configs/{file_name}")]);
    for path in candidates {
        if let Ok(content) = fs::read_to_string(&path) {
            return serde_json::from_str(&content)
                .map_err(|e| format!("Failed to parse {}: {}", file_name, e));
        }
    }

    Err(format!("{} not found", file_name))
}

/// Load a binary resource (e.g. an icon template); `relative_path` is relative
/// to the repository root (e.g. `public/templates/echo-sort.png`).
pub fn load_binary_resource(
    app_handle: &AppHandle,
    relative_path: &str,
) -> Result<Vec<u8>, String> {
    for path in resource_candidates(app_handle, [relative_path]) {
        if let Ok(bytes) = fs::read(&path) {
            return Ok(bytes);
        }
    }

    Err(format!("{relative_path} not found"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn relocated_crate_resolves_development_resources() {
        for resource in [
            "src/configs/echo_data.json",
            "public/templates/echo-sort.png",
            "src-tauri/tessdata/eng.traineddata",
        ] {
            assert!(
                resource_paths([resource], None)[0].is_file(),
                "missing development resource: {resource}"
            );
        }
    }

    #[test]
    fn bundled_resources_keep_flat_and_parent_layout_fallbacks() {
        let bundle = Path::new("bundle");
        let paths = resource_paths(["src/configs/echo_data.json"], Some(bundle));
        assert_eq!(paths.len(), 3);
        assert_eq!(paths[1], bundle.join("src/configs/echo_data.json"));
        assert_eq!(paths[2], bundle.join("_up_/src/configs/echo_data.json"));
    }
}
