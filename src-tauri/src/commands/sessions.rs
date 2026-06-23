//! Tauri commands backing the Sessions Observatory: list live sessions, summarize
//! one (Haiku), read its transcript, ask about it (Sonnet), focus its window, and
//! the per-view settings setters.

use crate::sessions::{SessionInfo, SessionRegistryManager};
use crate::settings;
use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::Path;
use std::sync::Arc;
use tauri::{AppHandle, Manager};

/// One flattened turn for the detail-pane transcript view.
#[derive(Serialize, Deserialize, Debug, Clone, Type)]
pub struct TranscriptTurn {
    pub role: String,
    pub text: String,
}

fn manager(app: &AppHandle) -> Result<Arc<SessionRegistryManager>, String> {
    app.try_state::<Arc<SessionRegistryManager>>()
        .map(|s| s.inner().clone())
        .ok_or_else(|| "Session registry not initialized".to_string())
}

/// Snapshot of every live Claude Code session (background/automation included; the
/// frontend filters them by `is_background` per the user's setting).
#[tauri::command]
#[specta::specta]
pub fn get_sessions(app: AppHandle) -> Result<Vec<SessionInfo>, String> {
    Ok(manager(&app)?.snapshot())
}

/// Compute (and cache) a one-line Haiku summary of a session, on demand.
#[tauri::command]
#[specta::specta]
pub fn summarize_session(app: AppHandle, session_id: String) -> Result<String, String> {
    manager(&app)?.summarize_now(&session_id)
}

/// Read the last `max_turns` user/assistant turns of a session's transcript.
#[tauri::command]
#[specta::specta]
pub fn get_session_transcript(
    app: AppHandle,
    session_id: String,
    max_turns: u32,
) -> Result<Vec<TranscriptTurn>, String> {
    let session = manager(&app)?
        .find(&session_id)
        .ok_or("Session not found or no longer live")?;
    let path = session
        .transcript_path
        .ok_or("Session has no transcript yet")?;
    let n = if max_turns == 0 { 60 } else { max_turns as usize };
    let ctx = crate::converse::session::tail_turns(Path::new(&path), n, 200_000);
    Ok(ctx
        .turns
        .into_iter()
        .map(|t| TranscriptTurn {
            role: t.role,
            text: t.text,
        })
        .collect())
}

/// Ask a question about a SPECIFIC session (answered by Sonnet, spoken by Monoli).
#[tauri::command]
#[specta::specta]
pub fn ask_session(app: AppHandle, session_id: String, question: String) -> Result<String, String> {
    let session = manager(&app)?
        .find(&session_id)
        .ok_or("Session not found or no longer live")?;
    let path = session
        .transcript_path
        .ok_or("Session has no transcript yet")?;
    let settings = settings::get_settings(&app);
    crate::converse::run_turn_for_path(&settings, &question, Path::new(&path))
}

/// Stop any in-flight Ask answer + speech.
#[tauri::command]
#[specta::specta]
pub fn ask_session_cancel() {
    crate::converse::cancel();
}

/// Speak a session's summary aloud (computing it first if needed).
#[tauri::command]
#[specta::specta]
pub fn speak_session_summary(app: AppHandle, session_id: String) -> Result<(), String> {
    let mgr = manager(&app)?;
    let summary = match mgr.find(&session_id).and_then(|s| s.summary) {
        Some(s) => s,
        None => mgr.summarize_now(&session_id)?,
    };
    let settings = settings::get_settings(&app);
    crate::tts::speak_with_settings(&settings, &summary);
    Ok(())
}

/// Raise the VS Code window that hosts this session (matched by workspace folder
/// name in the window title). Best-effort; needs Automation (Apple Events) consent.
#[tauri::command]
#[specta::specta]
pub fn focus_session_window(app: AppHandle, session_id: String) -> Result<(), String> {
    let session = manager(&app)?
        .find(&session_id)
        .ok_or("Session not found or no longer live")?;
    let raw_folder = session
        .cwd
        .trim_end_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or("");
    if raw_folder.is_empty() {
        return Err("No workspace folder for this session".to_string());
    }
    // Escape for an AppleScript double-quoted literal: drop control chars, escape
    // backslash FIRST (it is AppleScript's escape char) then the quote, so a folder
    // name containing `\` or `"` can't break out of (or corrupt) the string.
    let folder: String = raw_folder
        .chars()
        .filter(|c| !c.is_control())
        .collect::<String>()
        .replace('\\', "\\\\")
        .replace('"', "\\\"");
    // VS Code window titles end with the workspace folder name by default.
    let script = format!(
        r#"tell application "System Events"
  if exists (process "Code") then
    tell process "Code"
      repeat with w in windows
        if name of w ends with "{folder}" then
          perform action "AXRaise" of w
          set frontmost to true
          return
        end if
      end repeat
    end tell
  end if
end tell"#
    );
    match std::process::Command::new("osascript").arg("-e").arg(script).spawn() {
        Ok(mut child) => {
            // Reap on a detached thread so it never becomes a zombie.
            std::thread::spawn(move || {
                let _ = child.wait();
            });
            Ok(())
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
#[specta::specta]
pub fn set_sessions_rolling(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut s = settings::get_settings(&app);
    s.sessions_rolling_summaries = enabled;
    settings::write_settings(&app, s);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn toggle_session_pin(app: AppHandle, session_id: String) -> Result<(), String> {
    let mut s = settings::get_settings(&app);
    if let Some(idx) = s.sessions_pinned.iter().position(|x| x == &session_id) {
        s.sessions_pinned.remove(idx);
    } else {
        s.sessions_pinned.push(session_id);
    }
    settings::write_settings(&app, s);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_sessions_voice_alerts(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut s = settings::get_settings(&app);
    s.sessions_voice_alerts = enabled;
    settings::write_settings(&app, s);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_sessions_notifications(app: AppHandle, enabled: bool) -> Result<(), String> {
    let mut s = settings::get_settings(&app);
    s.sessions_notifications = enabled;
    settings::write_settings(&app, s);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn set_sessions_hide_background(app: AppHandle, hidden: bool) -> Result<(), String> {
    let mut s = settings::get_settings(&app);
    s.sessions_hide_background = hidden;
    settings::write_settings(&app, s);
    Ok(())
}

/// Set (or clear, when color is empty) a project's accent color. `key` is the
/// project/workspace basename (or repo) the UI groups by.
#[tauri::command]
#[specta::specta]
pub fn set_project_color(app: AppHandle, key: String, color: String) -> Result<(), String> {
    let mut s = settings::get_settings(&app);
    if color.trim().is_empty() {
        s.project_colors.remove(&key);
    } else {
        s.project_colors.insert(key, color);
    }
    settings::write_settings(&app, s);
    Ok(())
}
