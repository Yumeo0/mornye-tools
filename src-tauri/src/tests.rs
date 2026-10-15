use crate::scan_region::{preprocess_image, ColorFilter, ScanRegion};
use image::imageops::crop_imm;
use image::{DynamicImage, ImageFormat};
use std::io::Cursor;
use std::path::PathBuf;
use xberg::{extract, ExtractInput, ExtractionConfig, OcrConfig, TesseractConfig};

pub(crate) fn test_ocr(img: &DynamicImage, filter: Option<&ColorFilter>) -> String {
    let processed = preprocess_image(img, filter);
    let processed_dynamic = DynamicImage::ImageLuma8(processed);

    let mut png_buffer = Cursor::new(Vec::new());
    processed_dynamic
        .write_to(&mut png_buffer, ImageFormat::Png)
        .unwrap();

    let input = ExtractInput::from_bytes(png_buffer.into_inner(), "image/png", None::<String>);
    let tessdata = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tessdata");
    let config = ExtractionConfig {
        ocr: Some(OcrConfig {
            backend: "tesseract".to_string(),
            language: vec!["eng".to_string()],
            tessdata_path: Some(tessdata),
            tesseract_config: Some(TesseractConfig {
                psm: Some(6),
                output_format: "text".to_string(),
                enable_table_detection: false,
                ..Default::default()
            }),
            ..Default::default()
        }),
        ..Default::default()
    };

    let output = tauri::async_runtime::block_on(extract(input, &config)).unwrap();
    output.results.first().unwrap().content.clone()
}

#[test]
fn calibrate_inventory_regions() {
    let screenshot_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap()
        .join("inventory_screenshot.png");
    if !screenshot_path.exists() {
        eprintln!("skipping: inventory screenshot not found");
        return;
    }

    let img = image::open(&screenshot_path).unwrap();
    use image::GenericImageView;
    let (w, h) = img.dimensions();
    let sx = w as f64 / 2560.0;
    let sy = h as f64 / 1440.0;

    let regions: Vec<(&str, ScanRegion)> = vec![
        (
            "counter",
            ScanRegion {
                x: 145,
                y: 68,
                width: 310,
                height: 50,
                text_color: None,
                tolerance: None,
            },
        ),
        (
            "name",
            ScanRegion {
                x: 1770,
                y: 160,
                width: 450,
                height: 70,
                text_color: None,
                tolerance: None,
            },
        ),
        (
            "level",
            ScanRegion {
                x: 1785,
                y: 255,
                width: 100,
                height: 55,
                text_color: None,
                tolerance: None,
            },
        ),
        (
            "main_stats",
            ScanRegion {
                x: 1778,
                y: 612,
                width: 770,
                height: 58,
                text_color: None,
                tolerance: None,
            },
        ),
        (
            "sub_stats",
            ScanRegion {
                x: 1778,
                y: 680,
                width: 770,
                height: 395,
                text_color: None,
                tolerance: None,
            },
        ),
    ];

    for (label, region) in regions {
        let crop = crop_imm(
            &img,
            (region.x as f64 * sx) as u32,
            (region.y as f64 * sy) as u32,
            (region.width as f64 * sx) as u32,
            (region.height as f64 * sy) as u32,
        )
        .to_image();
        println!("== {label} ==");
        let variants: Vec<(&str, Option<ColorFilter>)> = vec![
            ("none", None),
            (
                "ced5d8/60",
                Some(ColorFilter {
                    rgb: (0xce, 0xd5, 0xd8),
                    tolerance: 60,
                }),
            ),
            (
                "ced5d8/120",
                Some(ColorFilter {
                    rgb: (0xce, 0xd5, 0xd8),
                    tolerance: 120,
                }),
            ),
            (
                "f9ffff/60",
                Some(ColorFilter {
                    rgb: (0xf9, 0xff, 0xff),
                    tolerance: 60,
                }),
            ),
        ];
        for (variant, filter) in variants {
            let text = test_ocr(&DynamicImage::ImageRgba8(crop.clone()), filter.as_ref());
            println!("[{variant}] {}", text.trim().replace('\n', " | "));
        }
        let _ = crop.save(std::env::temp_dir().join(format!("region_{label}.png")));
    }
}

#[test]
fn crop_region_enforces_window_bounds() {
    use image::GenericImageView;

    let frame = DynamicImage::ImageRgba8(image::RgbaImage::new(100, 80));
    let region = |x, y, width, height| ScanRegion {
        x,
        y,
        width,
        height,
        text_color: None,
        tolerance: None,
    };

    let cropped = crate::capture::crop_region(&frame, &region(10, 10, 50, 40)).unwrap();
    assert_eq!(cropped.dimensions(), (50, 40));

    // A region touching the bottom-right edge still fits.
    assert!(crate::capture::crop_region(&frame, &region(60, 40, 40, 40)).is_ok());

    // One pixel past the edge is rejected instead of panicking.
    assert!(crate::capture::crop_region(&frame, &region(61, 0, 40, 10)).is_err());
    assert!(crate::capture::crop_region(&frame, &region(0, 41, 10, 40)).is_err());
}

#[test]
fn blank_frame_detection() {
    assert!(crate::capture::is_blank(&image::RgbaImage::new(64, 64)));

    let mut frame = image::RgbaImage::new(64, 64);
    frame.put_pixel(32, 32, image::Rgba([200, 200, 200, 255]));
    assert!(!crate::capture::is_blank(&frame));
}

#[test]
fn scan_live_region_like_sync_command() {
    // Mimic scan_region_for_text: capture the game window, crop, OCR
    let (screenshot, _origin) = match crate::capture::capture_game_window() {
        Ok(captured) => captured,
        Err(error) => {
            eprintln!("skipping: {error}");
            return;
        }
    };
    use image::GenericImageView;
    let (width, height) = screenshot.dimensions();
    println!("Captured game window: {width}x{height}");

    let region = ScanRegion {
        x: 130,
        y: 65,
        width: 270,
        height: 60,
        text_color: None,
        tolerance: None,
    };
    let cropped = crate::capture::crop_region(&screenshot, &region).unwrap();
    let text = test_ocr(&cropped, region.color_filter().as_ref());
    println!("LIVE OCR TEXT:\n{text}\n===");
}

#[test]
fn sort_icon_similarity_matches_the_icon_shape() {
    use image::{Rgba, RgbaImage};

    // A synthetic icon: dark round body with a bright glyph on transparency.
    fn icon() -> RgbaImage {
        let mut img = RgbaImage::new(48, 48);
        for y in 0..48 {
            for x in 0..48 {
                let dx = x as i32 - 24;
                let dy = y as i32 - 24;
                let inside = dx * dx + dy * dy <= 20 * 20;
                let glyph = (18..=30).contains(&x) && (14..=34).contains(&y);
                let px = if !inside {
                    Rgba([0, 0, 0, 0])
                } else if glyph {
                    Rgba([220, 220, 220, 255])
                } else {
                    Rgba([24, 26, 26, 255])
                };
                img.put_pixel(x, y, px);
            }
        }
        img
    }

    let template = DynamicImage::ImageRgba8(icon());

    // The icon on screen inside a slightly larger region, a few pixels off.
    let mut screen = RgbaImage::from_pixel(60, 60, Rgba([180, 180, 180, 255]));
    image::imageops::overlay(&mut screen, &icon(), 7, 6);
    let visible =
        crate::sort_icon_similarity_best(&DynamicImage::ImageRgba8(screen), &template);
    assert!(visible > 0.97, "identical icon scored {visible}");

    // A screen without the icon is clearly below the threshold.
    let plain = DynamicImage::ImageRgba8(RgbaImage::from_pixel(
        60,
        60,
        Rgba([180, 180, 180, 255]),
    ));
    let missing = crate::sort_icon_similarity_best(&plain, &template);
    assert!(missing < 0.8, "plain background scored {missing}");
}
