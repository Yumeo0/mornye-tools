//! Bounded, read-only searches for Steam/Proton, Lutris, Wine and mounted games.
use std::{
    fs,
    path::{Path, PathBuf},
};

use regex::Regex;

pub(super) fn system_candidates() -> Vec<PathBuf> {
    let mut paths = Vec::new();
    let mut common_mounts = vec![PathBuf::from("/mnt"), PathBuf::from("/media")];
    if let Some(home) = std::env::var_os("HOME").filter(|home| !home.is_empty()) {
        home_candidates(Path::new(&home), &mut paths);
    }
    if let Some(user) = std::env::var_os("USER").filter(|user| !user.is_empty()) {
        common_mounts.push(Path::new("/run/media").join(user));
    }
    steam_candidates(Path::new("/usr/local/games/steam"), &mut paths);

    let mounts = fs::read_to_string("/proc/self/mounts").unwrap_or_default();
    let mut drives = mounted_drives(&mounts);
    for base in common_mounts {
        drives.extend(directories(&base, 2));
    }
    drives.sort();
    drives.dedup();
    for drive in drives {
        mounted_candidates(&drive, &mut paths);
    }
    paths.sort();
    paths.dedup();
    paths
}

fn home_candidates(home: &Path, paths: &mut Vec<PathBuf>) {
    for root in [
        ".steam/steam",
        ".local/share/Steam",
        ".var/app/com.valvesoftware.Steam/.local/share/Steam",
        ".var/app/com.valvesoftware.Steam/.steam/steam",
        ".var/app/com.valvesoftware.Steam/data/Steam",
    ] {
        steam_candidates(&home.join(root), paths);
    }

    for game in directories(&home.join("Games"), 2) {
        if game
            .file_name()
            .is_some_and(|name| name.to_string_lossy().to_lowercase().contains("wuthering"))
        {
            paths.push(game.clone());
            // Lutris may put the game directly here or inside a Wine prefix.
            wine_candidates(&game, paths);
        }
    }
    wine_candidates(&home.join(".wine"), paths);
    for prefix in directories(&home.join(".local/share/wineprefixes"), 1) {
        wine_candidates(&prefix, paths);
    }
}

fn steam_candidates(steam: &Path, paths: &mut Vec<PathBuf>) {
    const GAME: &str = "steamapps/common/Wuthering Waves";
    paths.push(steam.join(GAME));
    let library_path = Regex::new(r#""path"\s+"((?:\\.|[^"\\])*)""#).unwrap();
    for file in ["steamapps/libraryfolders.vdf", "config/libraryfolders.vdf"] {
        if let Ok(text) = fs::read_to_string(steam.join(file)) {
            for capture in library_path.captures_iter(&text) {
                let path = capture[1].replace(r#"\""#, "\"").replace(r"\\", r"\");
                paths.push(Path::new(&path).join(GAME));
            }
        }
    }
}

fn wine_candidates(prefix: &Path, paths: &mut Vec<PathBuf>) {
    for game in [
        "Program Files/Wuthering Waves",
        "Program Files (x86)/Wuthering Waves",
        "Program Files/Epic Games/WutheringWavesj3oFh",
        "Program Files (x86)/Epic Games/WutheringWavesj3oFh",
        "Wuthering Waves",
    ] {
        paths.push(prefix.join("drive_c").join(game));
    }
}

/// Includes the root and at most `depth` levels; never follows directory symlinks.
fn directories(root: &Path, depth: usize) -> Vec<PathBuf> {
    let mut result = Vec::new();
    if !root.is_dir() {
        return result;
    }
    result.push(root.to_path_buf());
    if depth > 0 {
        if let Ok(entries) = fs::read_dir(root) {
            for entry in entries.flatten() {
                if entry.file_type().is_ok_and(|kind| kind.is_dir()) {
                    result.extend(directories(&entry.path(), depth - 1));
                }
            }
        }
    }
    result
}

fn mounted_drives(mounts: &str) -> Vec<PathBuf> {
    mounts
        .lines()
        .filter_map(|line| {
            let mut fields = line.split_whitespace();
            let (_, mount, kind) = (fields.next()?, fields.next()?, fields.next()?);
            if matches!(
                kind,
                "proc"
                    | "sysfs"
                    | "devtmpfs"
                    | "tmpfs"
                    | "devpts"
                    | "securityfs"
                    | "pstore"
                    | "bpf"
                    | "tracefs"
                    | "debugfs"
                    | "hugetlbfs"
                    | "mqueue"
                    | "configfs"
                    | "fusectl"
                    | "binfmt_misc"
                    | "autofs"
                    | "rpc_pipefs"
                    | "nfsd"
                    | "overlay"
                    | "squashfs"
            ) || kind.starts_with("cgroup")
            {
                return None;
            }
            // These are the four escapes used by the kernel's mount table. Decode
            // backslashes last so a literal `\040` in a name stays literal.
            let mount = mount
                .replace(r"\040", " ")
                .replace(r"\011", "\t")
                .replace(r"\012", "\n")
                .replace(r"\134", "\\");
            if matches!(
                mount.as_str(),
                "/proc"
                    | "/sys"
                    | "/dev"
                    | "/run"
                    | "/tmp"
                    | "/var/tmp"
                    | "/boot"
                    | "/boot/efi"
                    | "/var/log"
                    | "/var/cache"
            ) {
                return None;
            }
            Some(PathBuf::from(mount))
        })
        .collect()
}

fn mounted_candidates(drive: &Path, paths: &mut Vec<PathBuf>) {
    // normalize_root also tries the "Wuthering Waves Game" child of each path.
    for game in [
        "SteamLibrary/steamapps/common/Wuthering Waves",
        "Program Files (x86)/Steam/steamapps/common/Wuthering Waves",
        "Program Files/Steam/steamapps/common/Wuthering Waves",
        "Games/Steam/steamapps/common/Wuthering Waves",
        "Steam/steamapps/common/Wuthering Waves",
        "Program Files/Epic Games/WutheringWavesj3oFh",
        "Program Files (x86)/Epic Games/WutheringWavesj3oFh",
        "Wuthering Waves Game",
        "Wuthering Waves",
        "Program Files/Wuthering Waves",
        "Games/Wuthering Waves Game",
        "Games/Wuthering Waves",
        "Program Files (x86)/Wuthering Waves",
    ] {
        paths.push(drive.join(game));
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::discovery::{normalize_root, resolve_candidates, SDK_FILE};
    use std::os::unix::fs::symlink;

    struct Fixture(PathBuf);

    impl Fixture {
        fn new() -> Self {
            let root = std::env::temp_dir().join(format!(
                "mornye-discovery-{}-{}",
                std::process::id(),
                rand::random::<u64>()
            ));
            fs::create_dir(&root).unwrap();
            Self(root)
        }

        fn install(&self, relative: &str) -> PathBuf {
            let root = self.0.join(relative);
            let sdk = root.join("Client").join(SDK_FILE);
            fs::create_dir_all(sdk.parent().unwrap()).unwrap();
            fs::write(sdk, "test SDK marker").unwrap();
            fs::canonicalize(root).unwrap()
        }

        fn home_candidates(&self) -> Vec<PathBuf> {
            let mut paths = Vec::new();
            home_candidates(&self.0, &mut paths);
            paths
        }
    }

    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn discovers_native_and_flatpak_steam_layouts() {
        for path in [
            ".steam/steam",
            ".local/share/Steam",
            ".var/app/com.valvesoftware.Steam/.local/share/Steam",
            ".var/app/com.valvesoftware.Steam/.steam/steam",
            ".var/app/com.valvesoftware.Steam/data/Steam",
        ] {
            let fixture = Fixture::new();
            let root = fixture.install(&format!(
                "{path}/steamapps/common/Wuthering Waves/Wuthering Waves Game"
            ));
            assert_eq!(resolve_candidates(fixture.home_candidates()).unwrap(), root);
        }
    }

    #[test]
    fn reads_custom_steam_libraries_from_both_vdf_locations() {
        for file in ["steamapps/libraryfolders.vdf", "config/libraryfolders.vdf"] {
            let fixture = Fixture::new();
            let library = fixture.0.join("Custom \"Games\" \\ Library");
            let root =
                fixture.install("Custom \"Games\" \\ Library/steamapps/common/Wuthering Waves");
            let vdf = fixture.0.join(".local/share/Steam").join(file);
            fs::create_dir_all(vdf.parent().unwrap()).unwrap();
            let escaped = library
                .to_str()
                .unwrap()
                .replace('\\', r"\\")
                .replace('"', r#"\""#);
            fs::write(
                vdf,
                format!("\"libraryfolders\" {{ \"0\" {{ \"path\" \"{escaped}\" }} }}"),
            )
            .unwrap();
            assert_eq!(resolve_candidates(fixture.home_candidates()).unwrap(), root);
        }
    }

    #[test]
    fn discovers_wine_and_epic_games_in_default_and_custom_prefixes() {
        for prefix in [
            ".wine",
            ".local/share/wineprefixes/custom",
            "Games/Wuthering-Waves",
        ] {
            for game in [
                "Program Files/Wuthering Waves",
                "Program Files (x86)/Wuthering Waves",
                "Program Files/Epic Games/WutheringWavesj3oFh",
                "Program Files (x86)/Epic Games/WutheringWavesj3oFh",
                "Wuthering Waves",
            ] {
                let fixture = Fixture::new();
                let root =
                    fixture.install(&format!("{prefix}/drive_c/{game}/Wuthering Waves Game"));
                assert_eq!(resolve_candidates(fixture.home_candidates()).unwrap(), root);
            }
        }
    }

    #[test]
    fn lutris_search_is_case_insensitive_and_bounded_to_two_levels() {
        let fixture = Fixture::new();
        let root = fixture.install("Games/lutris/WUTHERING-waves/Wuthering Waves Game");
        fixture.install("Games/other/deeper/wuthering-waves");
        assert_eq!(resolve_candidates(fixture.home_candidates()).unwrap(), root);
        let alias = fixture.0.join("Games/wuthering-symlink");
        symlink(fixture.0.join("Games"), alias).unwrap();
        assert_eq!(resolve_candidates(fixture.home_candidates()).unwrap(), root);
    }

    #[test]
    fn mounted_windows_steam_epic_and_standalone_layouts_are_found() {
        for path in [
            "SteamLibrary/steamapps/common/Wuthering Waves/Wuthering Waves Game",
            "Program Files (x86)/Steam/steamapps/common/Wuthering Waves",
            "Program Files/Steam/steamapps/common/Wuthering Waves/Wuthering Waves Game",
            "Games/Steam/steamapps/common/Wuthering Waves",
            "Steam/steamapps/common/Wuthering Waves",
            "Program Files/Epic Games/WutheringWavesj3oFh",
            "Program Files (x86)/Epic Games/WutheringWavesj3oFh/Wuthering Waves Game",
            "Wuthering Waves Game",
            "Wuthering Waves/Wuthering Waves Game",
            "Program Files/Wuthering Waves/Wuthering Waves Game",
            "Games/Wuthering Waves Game",
            "Games/Wuthering Waves/Wuthering Waves Game",
            "Program Files (x86)/Wuthering Waves/Wuthering Waves Game",
        ] {
            let fixture = Fixture::new();
            let root = fixture.install(path);
            let mut paths = Vec::new();
            mounted_candidates(&fixture.0, &mut paths);
            assert_eq!(resolve_candidates(paths).unwrap(), root);
        }
    }

    #[test]
    fn mount_table_decodes_spaces_and_excludes_virtual_and_system_mounts() {
        let text = concat!(
            "/dev/root / btrfs rw 0 0\n",
            "/dev/games /mnt/Windows\\040Games ntfs3 rw 0 0\n",
            "/dev/usb /run/media/user/Games ext4 rw 0 0\n",
            "/dev/odd /mnt/literal\\134040 ext4 rw 0 0\n",
            "proc /proc proc rw 0 0\n",
            "none /sys/fs/cgroup cgroup2 rw 0 0\n",
            "tmpfs /mnt/runtime tmpfs rw 0 0\n",
            "/dev/boot /boot/efi vfat rw 0 0\n",
            "invalid line\n",
        );
        assert_eq!(
            mounted_drives(text),
            vec![
                PathBuf::from("/"),
                PathBuf::from("/mnt/Windows Games"),
                PathBuf::from("/run/media/user/Games"),
                PathBuf::from(r"/mnt/literal\040"),
            ]
        );
    }

    #[test]
    fn duplicate_steam_paths_and_symlinks_resolve_to_one_installation() {
        let fixture = Fixture::new();
        let root = fixture.install(".local/share/Steam/steamapps/common/Wuthering Waves");
        fs::create_dir(fixture.0.join(".steam")).unwrap();
        symlink(
            fixture.0.join(".local/share/Steam"),
            fixture.0.join(".steam/steam"),
        )
        .unwrap();
        assert_eq!(resolve_candidates(fixture.home_candidates()).unwrap(), root);
        assert_eq!(normalize_root(&root.join("Client")), Some(root));
    }

    #[test]
    fn incomplete_or_multiple_installations_still_require_explicit_selection() {
        let fixture = Fixture::new();
        fs::create_dir_all(fixture.0.join("Games/wuthering-empty/Client/Saved/Logs")).unwrap();
        assert!(resolve_candidates(fixture.home_candidates())
            .unwrap_err()
            .to_string()
            .contains("not found"));
        fixture.install("Games/wuthering-one");
        fixture.install("Games/wuthering-two");
        assert!(resolve_candidates(fixture.home_candidates())
            .unwrap_err()
            .to_string()
            .contains("multiple installations"));
    }
}
