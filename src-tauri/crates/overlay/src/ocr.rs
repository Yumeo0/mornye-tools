use image::{DynamicImage, ImageFormat};
use std::io::Cursor;
use std::path::PathBuf;
use tauri::AppHandle;
use xberg::{extract, ExtractInput, ExtractionConfig, OcrConfig, TesseractConfig};

use crate::scan_region::{preprocess_image, ColorFilter};

fn get_tessdata_dir(app_handle: &AppHandle) -> Result<PathBuf, String> {
    // The dev tree lives at `src-tauri/tessdata` (crate-relative, unlike the
    // other repo-root resources); packaged builds bundle it at the resource
    // root as `tessdata`.
    if let Some(dir) =
        crate::config::resource_candidates(app_handle, ["src-tauri/tessdata", "tessdata"])
            .into_iter()
            .find(|path| path.exists())
    {
        return Ok(dir);
    }

    // Fallback to TESSDATA_PREFIX environment variable
    if let Ok(dir) = std::env::var("TESSDATA_PREFIX") {
        return Ok(PathBuf::from(dir));
    }

    Err("Tessdata directory not found. Please ensure tessdata is in src-tauri/tessdata for development or bundled with the app for production.".to_string())
}

fn build_ocr_config(app_handle: &AppHandle) -> Result<ExtractionConfig, String> {
    let tessdata_dir = get_tessdata_dir(app_handle)?;

    Ok(ExtractionConfig {
        ocr: Some(OcrConfig {
            backend: "tesseract".to_string(),
            language: vec!["eng".to_string()],
            tessdata_path: Some(tessdata_dir),
            tesseract_config: Some(TesseractConfig {
                psm: Some(6),
                output_format: "text".to_string(),
                // Table detection rebuilds the content as paragraphs + table and
                // duplicates every line for columnar game-UI text.
                enable_table_detection: false,
                ..Default::default()
            }),
            ..Default::default()
        }),
        ..Default::default()
    })
}

pub(crate) fn perform_ocr_on_image(
    img: &DynamicImage,
    app_handle: &AppHandle,
    filter: Option<&ColorFilter>,
) -> Result<String, String> {
    // Preprocess the image
    let processed = preprocess_image(img, filter);

    // Convert back to DynamicImage
    let processed_dynamic = DynamicImage::ImageLuma8(processed);

    // Encode the preprocessed image as PNG for xberg
    let mut png_buffer = Cursor::new(Vec::new());
    processed_dynamic
        .write_to(&mut png_buffer, ImageFormat::Png)
        .map_err(|e| format!("Failed to encode image: {}", e))?;

    let input = ExtractInput::from_bytes(png_buffer.into_inner(), "image/png", None::<String>);
    let config = build_ocr_config(app_handle)?;

    let output = tauri::async_runtime::block_on(extract(input, &config))
        .map_err(|e| format!("OCR error: {}", e))?;

    let document = output
        .results
        .first()
        .ok_or_else(|| "OCR returned no results".to_string())?;

    Ok(document.content.clone())
}
