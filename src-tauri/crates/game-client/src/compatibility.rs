//! Installed release compatibility with the data and protocol bundled in this build.
use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct GameVersionStatus {
    pub installed: Option<String>,
    pub supported: String,
    pub too_new: bool,
}

fn version(text: &str) -> Option<[u32; 3]> {
    text.split('.')
        .map(str::parse)
        .collect::<Result<Vec<_>, _>>()
        .ok()?
        .try_into()
        .ok()
}

fn supported_version(data: &str, protocol: &str) -> String {
    #[derive(Deserialize)]
    struct Data {
        game: String,
    }
    #[derive(Deserialize)]
    struct Protocol {
        game_version: String,
    }
    let data: Data = serde_json::from_str(data).expect("valid bundled data manifest");
    let protocol: Protocol =
        serde_json::from_str(protocol).expect("valid bundled protocol manifest");
    // Both inputs must support the release. Updating just one must not remove the warning.
    let data_version = version(&data.game).expect("valid bundled data version");
    let protocol_version = version(&protocol.game_version).expect("valid bundled protocol version");
    if data_version <= protocol_version {
        data.game
    } else {
        protocol.game_version
    }
}

impl Default for GameVersionStatus {
    fn default() -> Self {
        Self::from_versions(
            None,
            supported_version(
                include_str!("../../../../data/VERSION.json"),
                include_str!("../../../protocol/manifest.json"),
            ),
        )
    }
}

impl GameVersionStatus {
    fn from_versions(installed: Option<String>, supported: String) -> Self {
        let too_new = installed
            .as_deref()
            .and_then(version)
            .zip(version(&supported))
            .is_some_and(|(installed, supported)| installed > supported);
        Self {
            installed,
            supported,
            too_new,
        }
    }

    pub fn detect(game_dir: Option<&Path>) -> Self {
        let installed = crate::discovery::installed_game_version(game_dir).ok();
        Self::from_versions(installed, Self::default().supported)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn newer_releases_are_compared_numerically() {
        for (installed, supported, too_new) in [
            ("3.9.0", "3.8.0", true),
            ("3.10.0", "3.9.0", true),
            ("4.0.0", "3.10.0", true),
            ("3.8.1", "3.8.0", true),
            ("3.8.0", "3.8.0", false),
            ("3.7.0", "3.8.0", false),
            ("3.9.0", "3.10.0", false),
        ] {
            assert_eq!(
                GameVersionStatus::from_versions(Some(installed.into()), supported.into()).too_new,
                too_new,
                "{installed} vs {supported}"
            );
        }
    }

    #[test]
    fn unknown_or_invalid_versions_do_not_claim_an_unsupported_release() {
        for installed in [
            None,
            Some(""),
            Some("unknown"),
            Some("3.8"),
            Some("3.8.0-preview"),
        ] {
            assert!(
                !GameVersionStatus::from_versions(installed.map(String::from), "3.8.0".into())
                    .too_new
            );
        }
    }

    #[test]
    fn bundled_support_is_limited_by_both_data_and_protocol() {
        for (data, protocol, supported) in
            [("3.10.0", "3.9.0", "3.9.0"), ("3.8.0", "3.9.0", "3.8.0")]
        {
            assert_eq!(
                supported_version(
                    &format!(r#"{{"game":"{data}"}}"#),
                    &format!(r#"{{"game_version":"{protocol}"}}"#)
                ),
                supported
            );
        }
        assert!(version(&GameVersionStatus::default().supported).is_some());
    }
}
