use image::{DynamicImage, GrayImage};
use imageproc::contrast::{threshold, ThresholdType};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRegion {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    /// Optional text color (hex like "#ced5d8") to filter for before OCR.
    #[serde(default, rename = "textColor")]
    pub text_color: Option<String>,
    /// Max Euclidean RGB distance from text_color for a pixel to count as text.
    #[serde(default)]
    pub tolerance: Option<u16>,
}

impl ScanRegion {
    pub(crate) fn color_filter(&self) -> Option<ColorFilter> {
        let rgb = parse_hex_color(self.text_color.as_deref()?)?;
        Some(ColorFilter {
            rgb,
            tolerance: self.tolerance.unwrap_or(DEFAULT_COLOR_TOLERANCE),
        })
    }
}

#[derive(Debug, Clone, Copy)]
pub struct ColorFilter {
    pub(crate) rgb: (u8, u8, u8),
    pub(crate) tolerance: u16,
}

pub const DEFAULT_COLOR_TOLERANCE: u16 = 60;

pub(crate) fn parse_hex_color(color: &str) -> Option<(u8, u8, u8)> {
    let hex = color.trim().trim_start_matches('#');
    if hex.len() != 6 {
        return None;
    }
    let value = u32::from_str_radix(hex, 16).ok()?;
    Some(((value >> 16) as u8, (value >> 8) as u8, value as u8))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRegions {
    pub echo_upgrade: ScanRegion,
    /// "Tuning Successful" banner; read to tell an open panel whose title is
    /// covered by the tuning screen apart from a closed panel.
    #[serde(default)]
    pub tuning_successful: Option<ScanRegion>,
    /// The list sort icon shown by some screens (upgrade fodder selection,
    /// echo bags). While it is visible the overlay must not press any keys.
    #[serde(default)]
    pub sort_icon: Option<ScanRegion>,
    /// The confirmation dialog text shown when the upgrade fodder includes
    /// high-rarity or already-upgraded echoes ("Includes High Rarity and
    /// Upgrade materials. Do you wish to continue upgrade?"). Like the sort
    /// icon screen, the overlay must not press any keys while it is up.
    #[serde(default)]
    pub high_rarity_notice: Option<ScanRegion>,
}

pub(crate) fn color_filter_image(img: &DynamicImage, filter: &ColorFilter) -> GrayImage {
    let rgb = img.to_rgb8();
    let (width, height) = rgb.dimensions();
    let mut out: GrayImage = image::ImageBuffer::new(width, height);
    let tol_sq = (filter.tolerance as u32) * (filter.tolerance as u32);

    for (x, y, pixel) in rgb.enumerate_pixels() {
        let dr = pixel[0] as i32 - filter.rgb.0 as i32;
        let dg = pixel[1] as i32 - filter.rgb.1 as i32;
        let db = pixel[2] as i32 - filter.rgb.2 as i32;
        let dist_sq = (dr * dr + dg * dg + db * db) as u32;
        let is_text = dist_sq <= tol_sq;
        out.put_pixel(x, y, image::Luma([if is_text { 255 } else { 0 }]));
    }

    out
}

pub(crate) fn preprocess_image(img: &DynamicImage, filter: Option<&ColorFilter>) -> GrayImage {
    if let Some(filter) = filter {
        // Keep only pixels close to the configured text color (white) and
        // make everything else black, so only the text remains for OCR.
        return color_filter_image(img, filter);
    }

    // Fallback: convert to grayscale
    let gray = img.to_luma8();

    // Apply thresholding to make text more distinct
    // This helps with white text on darker backgrounds
    threshold(&gray, 128, ThresholdType::Binary)
}
