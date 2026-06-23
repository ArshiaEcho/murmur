//! Tauri commands backing Conversation Mode: the manual/test turn trigger, the
//! Claude-Code project picker, and the settings setters.

use crate::settings;
use serde::{Deserialize, Serialize};
use specta::Type;
use tauri::AppHandle;

/// A Claude Code project surfaced to the scope picker.
#[derive(Serialize, Deserialize, Debug, Clone, Type)]
pub struct ClaudeProject {
    pub cwd: String,
    pub dir: String,
}

/// Run one Conversation Mode turn from a typed question (manual trigger / test).
/// Reads the active session, answers via the configured model, speaks the answer,
/// and returns the answer text.
#[tauri::command]
#[specta::specta]
pub fn converse_test(app: AppHandle, question: String) -> Result<String, String> {
    let settings = settings::get_settings(&app);
    crate::converse::run_turn(&settings, &question)
}

/// Stop any in-flight Conversation Mode answer + speech.
#[tauri::command]
#[specta::specta]
pub fn converse_cancel() {
    crate::converse::cancel();
}

/// List Claude Code projects (cwd + project dir) for the scope picker.
#[tauri::command]
#[specta::specta]
pub fn list_claude_projects() -> Result<Vec<ClaudeProject>, String> {
    Ok(crate::converse::session::list_projects()
        .into_iter()
        .map(|(cwd, dir)| ClaudeProject { cwd, dir })
        .collect())
}

#[tauri::command]
#[specta::specta]
pub fn set_converse_enabled(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.converse_enabled = enabled;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_converse_model(app: AppHandle, model: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.converse_model = model;
    settings::write_settings(&app, settings);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_converse_scope(app: AppHandle, scope: Option<String>) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    settings.converse_project_scope = scope.filter(|s| !s.is_empty());
    settings::write_settings(&app, settings);
    Ok(())
}

/// Store (or clear, when empty) the Anthropic API key in the redacted secrets map.
#[tauri::command]
#[specta::specta]
pub fn set_converse_api_key(app: AppHandle, key: String) -> Result<(), String> {
    let mut settings = settings::get_settings(&app);
    let trimmed = key.trim().to_string();
    if trimmed.is_empty() {
        settings.tts_secrets.remove("anthropic");
    } else {
        settings.tts_secrets.insert("anthropic".to_string(), trimmed);
    }
    settings::write_settings(&app, settings);
    Ok(())
}
