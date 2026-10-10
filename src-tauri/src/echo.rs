use serde::{Deserialize, Serialize};
use tauri::AppHandle;

use crate::config::load_json_resource;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EchoSet {
    pub id: u32,
    pub name: String,
    /// Web path of the set icon (e.g. "/wuwa-assets/UI/.../T_IconElementAttriCure.png")
    pub icon: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Echo {
    pub echo_name: String,
    pub echo_id: u32,
    /// Calculator catalog id (`MonsterId`) used by `@wuwacalc/core`.
    #[serde(default)]
    pub monster_id: Option<i64>,
    pub echo_sets: Vec<EchoSet>,
}

pub(crate) fn load_echo_data(app_handle: &AppHandle) -> Result<Vec<Echo>, String> {
    load_json_resource(app_handle, "echo_data.json")
}

pub(crate) fn match_echo_name(ocr_text: &str, echoes: &[Echo]) -> Option<String> {
    if ocr_text.trim().is_empty() {
        return None;
    }

    let ocr_lower = ocr_text.to_lowercase();

    // First, try exact matches
    for echo in echoes {
        if echo.echo_name.to_lowercase() == ocr_lower {
            return Some(echo.echo_name.clone());
        }
    }

    // Then, try partial matches (OCR text contains echo name or vice versa)
    // and prefer the longest name, since it is the most specific.
    let mut best: Option<&Echo> = None;
    for echo in echoes {
        let echo_lower = echo.echo_name.to_lowercase();
        if (echo_lower.contains(&ocr_lower) || ocr_lower.contains(&echo_lower))
            && best.is_none_or(|b| echo.echo_name.len() > b.echo_name.len())
        {
            best = Some(echo);
        }
    }

    best.map(|echo| echo.echo_name.clone())
}
