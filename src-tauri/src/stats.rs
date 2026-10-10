use regex::Regex;
use serde::Deserialize;
use std::collections::HashMap;

#[derive(Debug, Clone, Deserialize)]
pub struct StatRange {
    pub min: f64,
    pub max: f64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct StatsConfig {
    pub main: HashMap<String, StatRange>,
    pub sub: HashMap<String, StatRange>,
}

fn normalize_stat_name(name: &str) -> String {
    name.replace(".", "")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

// Map OCR-detected stat names to canonical names from stats.json
fn map_to_canonical_stat_name(stat_name: &str) -> String {
    let normalized = normalize_stat_name(stat_name).to_lowercase();

    match normalized.as_str() {
        // HP stats
        s if s.contains("hp") && s.contains("%") => "HP%".to_string(),
        s if s.contains("hp") => "HP".to_string(),

        // ATK stats
        s if s.contains("atk") && s.contains("%") => "ATK%".to_string(),
        s if s.contains("atk") => "ATK".to_string(),

        // DEF stats
        s if s.contains("def") && s.contains("%") => "DEF%".to_string(),
        s if s.contains("def") => "DEF".to_string(),

        // Crit stats
        s if s.contains("crit") && (s.contains("rate") || s.contains("rat")) => {
            "Crit. Rate".to_string()
        }
        s if s.contains("crit") && s.contains("dmg") => "Crit. DMG".to_string(),

        // Healing
        s if s.contains("healing") => "Healing Bonus".to_string(),

        // Element DMG
        s if s.contains("aero") => "Aero DMG Bonus".to_string(),
        s if s.contains("glacio") => "Glacio DMG Bonus".to_string(),
        s if s.contains("fusion") => "Fusion DMG Bonus".to_string(),
        s if s.contains("electro") => "Electro DMG Bonus".to_string(),
        s if s.contains("havoc") => "Havoc DMG Bonus".to_string(),
        s if s.contains("spectro") => "Spectro DMG Bonus".to_string(),

        // Energy Regen
        s if s.contains("energy") => "Energy Regen".to_string(),

        // Attack type bonuses
        s if s.contains("basic") && s.contains("attack") => "Basic Attack DMG Bonus".to_string(),
        s if s.contains("heavy") && s.contains("attack") => "Heavy Attack DMG Bonus".to_string(),
        s if s.contains("resonance") && s.contains("skill") => {
            "Resonance Skill DMG Bonus".to_string()
        }
        s if s.contains("resonance") && s.contains("liberation") => {
            "Resonance Liberation DMG Bonus".to_string()
        }

        // Fallback - return the original normalized name
        _ => stat_name.to_string(),
    }
}

fn try_fix_decimal(value_str: &str, min: f64, max: f64) -> Option<String> {
    // Remove any existing decimal points for processing
    let digits: String = value_str.chars().filter(|c| c.is_numeric()).collect();

    if digits.is_empty() {
        return None;
    }

    // Try the original number first
    if let Ok(val) = value_str.parse::<f64>() {
        if val >= min && val <= max {
            return Some(value_str.to_string());
        }
    }

    // Try adding decimal point from right to left
    for i in 1..=digits.len() {
        let (left, right) = digits.split_at(digits.len() - i);
        let candidate = if left.is_empty() {
            format!("0.{}", right)
        } else {
            format!("{}.{}", left, right)
        };

        if let Ok(val) = candidate.parse::<f64>() {
            if val >= min && val <= max {
                return Some(candidate);
            }
        }
    }

    None
}

fn correct_stat_value(
    stat_name: &str,
    value_str: &str,
    stats_config: &StatsConfig,
    is_main_stat: bool,
) -> String {
    // First map to canonical name
    let canonical_name = map_to_canonical_stat_name(stat_name);

    // Get the appropriate stat map (keys are already normalized)
    let stat_map = if is_main_stat {
        &stats_config.main
    } else {
        &stats_config.sub
    };

    // Try to find the stat range using canonical name
    let range = stat_map.get(&canonical_name);

    if let Some(range) = range {
        if let Some(corrected) = try_fix_decimal(value_str, range.min, range.max) {
            return corrected;
        }
    }

    // Return original if no correction found
    value_str.to_string()
}

fn correct_ocr_errors(text: &str) -> String {
    text.replace("AIK", "ATK")
        .replace("oe", "%")
        .replace("—", "")
        .replace("'", "")
        .replace("\"", "")
}

pub(crate) fn parse_stats(text: &str, stats_config: &StatsConfig, is_main_stat: bool) -> String {
    // Clean up the text - keep only letters, numbers, spaces, periods, percent signs, and plus signs
    let cleaned: String = text
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '.' || *c == '%' || *c == '+')
        .collect();

    // Correct common OCR errors
    let corrected = correct_ocr_errors(&cleaned);

    // Try to parse individual stat lines - flexible pattern to handle various OCR artifacts
    // First try to match percentages (more reliable), then fall back to flat values
    let percent_re = Regex::new(r"(?i)(HP|ATK|DEF|Energy\s*Regen|Crit\.?\s*Rate|Crit\.?\s*DMG|Healing\s*Bonus|Glacio\s*DMG|Fusion\s*DMG|Electro\s*DMG|Aero\s*DMG|Spectro\s*DMG|Havoc\s*DMG|Basic\s*Attack\s*DMG|Heavy\s*Attack\s*DMG|Resonance\s*Skill\s*DMG|Resonance\s*Liberation\s*DMG|Resonance\s*Skill|Resonance\s*Liberation).*?(\d+(?:\.\d+)?)\s*%").unwrap();
    let flat_re = Regex::new(r"(?i)(HP|ATK|DEF|Energy\s*Regen|Crit\.?\s*Rate|Crit\.?\s*DMG|Healing\s*Bonus|Glacio\s*DMG|Fusion\s*DMG|Electro\s*DMG|Aero\s*DMG|Spectro\s*DMG|Havoc\s*DMG|Basic\s*Attack\s*DMG|Heavy\s*Attack\s*DMG|Resonance\s*Skill\s*DMG|Resonance\s*Liberation\s*DMG|Resonance\s*Skill|Resonance\s*Liberation)[\s.]*(?:Bonus)?[\sa-z.]*?(\d+(?:\.\d+)?)").unwrap();

    // Collect all matches with their positions
    let mut all_matches: Vec<(usize, String)> = Vec::new();

    // Ranges already covered by percentage matches, so flat matches can skip them
    let mut percent_ranges: Vec<(usize, usize)> = Vec::new();

    // First, find all percentage matches
    for captures in percent_re.captures_iter(&corrected) {
        let stat_name: &str = captures.get(1).map_or("", |m| m.as_str());
        let value: &str = captures.get(2).map_or("", |m| m.as_str());
        let full_match = captures.get(0).map_or(0..0, |m| m.start()..m.end());

        // For percentage stats, append % to the stat name for proper lookup
        let stat_name_with_percent = format!("{}%", stat_name);

        // Map to canonical stat name (use the version with %)
        let canonical_name = map_to_canonical_stat_name(&stat_name_with_percent);

        // Correct the value if needed (use the version with % for proper range lookup)
        let corrected_value =
            correct_stat_value(&stat_name_with_percent, value, stats_config, is_main_stat);

        percent_ranges.push((full_match.start, full_match.end));
        all_matches.push((
            full_match.start,
            format!("{} {}%", canonical_name, corrected_value),
        ));
    }

    // Then find flat value matches that don't overlap a percentage match
    for captures in flat_re.captures_iter(&corrected) {
        let stat_name: &str = captures.get(1).map_or("", |m| m.as_str());
        let value: &str = captures.get(2).map_or("", |m| m.as_str());
        let full_match = captures.get(0).map_or(0..0, |m| m.start()..m.end());

        let overlaps = percent_ranges.iter().any(|&(start, end)| {
            (full_match.start >= start && full_match.start < end)
                || (full_match.end > start && full_match.end <= end)
        });

        if !overlaps {
            // Map to canonical stat name
            let canonical_name = map_to_canonical_stat_name(stat_name);

            // Correct the value if needed
            let corrected_value = correct_stat_value(stat_name, value, stats_config, is_main_stat);

            all_matches.push((
                full_match.start,
                format!("{} {}", canonical_name, corrected_value),
            ));
        }
    }

    // Sort by position to preserve order
    all_matches.sort_by_key(|(pos, _)| *pos);

    let stats: Vec<String> = all_matches.into_iter().map(|(_, stat)| stat).collect();

    if !stats.is_empty() {
        return stats.join("\n");
    }

    // Fallback: Split by lines and filter meaningful content
    corrected
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| {
            // Keep lines that contain meaningful content
            let l = line.to_lowercase();
            !line.is_empty()
                && (l.contains("upgrade")
                    || l.contains("activate")
                    || l.contains("hp")
                    || l.contains("atk")
                    || l.contains("def")
                    || l.contains("crit")
                    || l.contains("dmg")
                    || l.contains("energy")
                    || l.contains("+"))
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// Sanitize OCR digits for an echo level: strip leading characters until the
/// value fits the valid 0..=25 range (OCR often misreads the leading "+").
pub(crate) fn sanitize_level_digits(digits: &str) -> String {
    let mut digits = digits;
    while digits.len() > 1 && digits.parse::<u32>().is_ok_and(|v| v > 25) {
        digits = &digits[1..];
    }
    match digits.parse::<u32>() {
        Ok(v) if v <= 25 => digits.to_string(),
        _ => String::new(),
    }
}

#[cfg(test)]
mod level_tests {
    use super::sanitize_level_digits;

    #[test]
    fn sanitize_level_digits_strips_ocr_prefix() {
        assert_eq!(sanitize_level_digits("425"), "25");
        assert_eq!(sanitize_level_digits("25"), "25");
        assert_eq!(sanitize_level_digits("5"), "5");
        assert_eq!(sanitize_level_digits("0"), "0");
        assert_eq!(sanitize_level_digits("420"), "20");
        assert_eq!(sanitize_level_digits(""), "");
        assert_eq!(sanitize_level_digits("abc"), "");
    }
}
