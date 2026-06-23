//! Tauri commands backing the "Read Aloud" voice settings UI: list the macOS
//! voices, preview one, stop playback, and persist the voice/rate settings.

use crate::settings;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::AppHandle;

/// A macOS TTS voice surfaced to the voice picker.
#[derive(Serialize, Deserialize, Debug, Clone, Type)]
pub struct TtsVoice {
    pub name: String,
    pub locale: String,
    pub sample: String,
}

/// List the voices available to macOS `say`.
#[tauri::command]
#[specta::specta]
pub fn list_tts_voices() -> Result<Vec<TtsVoice>, String> {
    Ok(crate::tts::list_voices()
        .into_iter()
        .map(|v| TtsVoice {
            name: v.name,
            locale: v.locale,
            sample: v.sample,
        })
        .collect())
}

/// Speak a short preview in `voice` at the user's configured rate.
#[tauri::command]
#[specta::specta]
pub fn preview_tts_voice(app: AppHandle, voice: String, text: String) -> Result<(), String> {
    let settings = settings::get_settings(&app);
    let rate = if settings.tts_rate > 0 {
        Some(settings.tts_rate)
    } else {
        None
    };
    let sample = if text.trim().is_empty() {
        "This is how the Stratos voice sounds.".to_string()
    } else {
        text
    };
    let v = if voice.trim().is_empty() {
        None
    } else {
        Some(voice.as_str())
    };
    crate::tts::speak(&sample, v, rate);
    Ok(())
}

/// Stop any in-flight speech (e.g. cancel a preview).
#[tauri::command]
#[specta::specta]
pub fn stop_tts() {
    crate::tts::stop();
}

/// Set the Read Aloud voice (None / empty = system default).
#[tauri::command]
#[specta::specta]
pub fn change_tts_voice_setting(app: AppHandle, voice: Option<String>) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.tts_voice = voice.filter(|v| !v.is_empty());
    settings::write_settings(&app, settings);
    Ok(())
}

/// Set the Read Aloud speech rate (words per minute).
#[tauri::command]
#[specta::specta]
pub fn change_tts_rate_setting(app: AppHandle, rate: u32) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.tts_rate = rate;
    settings::write_settings(&app, settings);
    Ok(())
}
