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
    let sample = if text.trim().is_empty() {
        "This is how the Stratos voice sounds.".to_string()
    } else {
        text
    };
    if matches!(
        settings.tts_provider,
        settings::TtsProvider::ElevenLabs
            | settings::TtsProvider::Kokoro
            | settings::TtsProvider::EdgeTts
    ) {
        // Preview the currently-configured cloud/neural voice.
        crate::tts::speak_with_settings(&settings, &sample);
    } else {
        let rate = if settings.tts_rate > 0 {
            Some(settings.tts_rate)
        } else {
            None
        };
        let v = if voice.trim().is_empty() {
            None
        } else {
            Some(voice.as_str())
        };
        crate::tts::speak(&sample, v, rate);
    }
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

/// An ElevenLabs voice surfaced to the voice picker.
#[derive(Serialize, Deserialize, Debug, Clone, Type)]
pub struct ElevenVoice {
    pub voice_id: String,
    pub name: String,
    pub category: String,
}

/// List the user's ElevenLabs voices (needs the key's `voices_read` scope).
#[tauri::command]
#[specta::specta]
pub fn list_elevenlabs_voices(app: AppHandle) -> Result<Vec<ElevenVoice>, String> {
    let settings = settings::get_settings(&app);
    let key = settings
        .elevenlabs_api_key()
        .ok_or("No ElevenLabs API key set")?;
    let voices = crate::tts::list_elevenlabs_voices(&key)?;
    Ok(voices
        .into_iter()
        .map(|(voice_id, name, category)| ElevenVoice {
            voice_id,
            name,
            category,
        })
        .collect())
}

/// Choose the Read Aloud engine ("say" or "eleven_labs").
#[tauri::command]
#[specta::specta]
pub fn change_tts_provider_setting(app: AppHandle, provider: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.tts_provider = match provider.as_str() {
        "eleven_labs" => settings::TtsProvider::ElevenLabs,
        "kokoro" => settings::TtsProvider::Kokoro,
        "edge_tts" => settings::TtsProvider::EdgeTts,
        _ => settings::TtsProvider::Say,
    };
    settings::write_settings(&app, settings);
    Ok(())
}

/// Set the active ElevenLabs voice id (None / empty = unset).
#[tauri::command]
#[specta::specta]
pub fn change_elevenlabs_voice_setting(
    app: AppHandle,
    voice_id: Option<String>,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.elevenlabs_voice_id = voice_id.filter(|v| !v.is_empty());
    settings::write_settings(&app, settings);
    Ok(())
}

/// Store (or clear, when empty) the ElevenLabs API key. Kept in the redacted
/// `tts_secrets` map so it never lands in debug logs.
#[tauri::command]
#[specta::specta]
pub fn change_elevenlabs_api_key_setting(app: AppHandle, key: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let trimmed = key.trim().to_string();
    if trimmed.is_empty() {
        settings.tts_secrets.remove("elevenlabs");
    } else {
        settings
            .tts_secrets
            .insert("elevenlabs".to_string(), trimmed);
    }
    settings::write_settings(&app, settings);
    Ok(())
}

/// List the downloaded Kokoro voices (file-stem ids like "af_heart").
#[tauri::command]
#[specta::specta]
pub fn list_kokoro_voices() -> Result<Vec<String>, String> {
    Ok(crate::tts::list_kokoro_voices())
}

/// Set the active Kokoro voice (file-stem id; None / empty = default).
#[tauri::command]
#[specta::specta]
pub fn change_kokoro_voice_setting(
    app: AppHandle,
    voice_id: Option<String>,
) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.kokoro_voice_id = voice_id.filter(|v| !v.is_empty());
    settings::write_settings(&app, settings);
    Ok(())
}

/// An edge-tts neural voice surfaced to the voice picker.
#[derive(Serialize, Deserialize, Debug, Clone, Type)]
pub struct EdgeVoice {
    pub id: String,
    pub display: String,
    pub locale: String,
}

/// List the English edge-tts neural voices (free, no key; one network call).
#[tauri::command]
#[specta::specta]
pub fn list_edge_voices() -> Result<Vec<EdgeVoice>, String> {
    Ok(crate::tts::list_edge_voices()
        .into_iter()
        .map(|(id, display, locale)| EdgeVoice {
            id,
            display,
            locale,
        })
        .collect())
}

/// Set the active edge-tts voice id (None / empty = default).
#[tauri::command]
#[specta::specta]
pub fn change_edge_voice_setting(app: AppHandle, voice_id: Option<String>) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.edge_voice_id = voice_id.filter(|v| !v.is_empty());
    settings::write_settings(&app, settings);
    Ok(())
}
