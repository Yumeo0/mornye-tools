//! Debug helper: capture the game window exactly like the OCR path does and
//! dump the frame plus the configured scan regions for inspection.
//!
//! Usage: cargo run --example capture_debug

use image::GenericImageView;
use mornye_tools_lib::capture::{capture_game_window, crop_region, find_game_window};
use mornye_tools_lib::scan_region::ScanRegion;
use std::path::PathBuf;

fn main() {
    match find_game_window() {
        Some(window) => println!(
            "window: title={:?} app={:?} pid={:?}\nbounds: x={:?} y={:?} w={:?} h={:?} minimized={:?}",
            window.title(),
            window.app_name(),
            window.pid(),
            window.x(),
            window.y(),
            window.width(),
            window.height(),
            window.is_minimized(),
        ),
        None => {
            println!("no game window found");
            return;
        }
    }

    let (frame, origin) = match capture_game_window() {
        Ok(captured) => captured,
        Err(error) => {
            println!("capture failed: {error}");
            return;
        }
    };
    let (width, height) = frame.dimensions();
    println!(
        "captured: {}x{} origin=({}, {})",
        width, height, origin.x, origin.y
    );

    let out_dir = std::env::temp_dir().join("opencode");
    std::fs::create_dir_all(&out_dir).unwrap();
    let frame_path = out_dir.join("game-window-capture.png");
    frame.save(&frame_path).unwrap();
    println!("saved frame: {}", frame_path.display());

    // Dump the configured regions when the capture size matches the config.
    let config_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("src/configs/ocr.json");
    let config: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(config_path).unwrap()).unwrap();
    let res = &config["resolutions"]["2560x1440"];

    for (name, key) in [
        ("echo_upgrade", "echoUpgrade"),
        ("echo_name", "echoName"),
        ("level", "level"),
        ("main_stats", "mainStats"),
        ("sub_stats", "subStats"),
    ] {
        let region: ScanRegion = serde_json::from_value(res[key].clone()).unwrap();
        match crop_region(&frame, &region) {
            Ok(crop) => {
                let path = out_dir.join(format!("game-window-{name}.png"));
                crop.save(&path).unwrap();
                println!(
                    "saved {name}: {} ({}x{})",
                    path.display(),
                    crop.width(),
                    crop.height()
                );
            }
            Err(error) => println!("{name}: {error}"),
        }
    }
}
