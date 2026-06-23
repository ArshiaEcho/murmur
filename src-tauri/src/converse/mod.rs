//! Conversation Mode: ask a running Claude Code session "what's going on" by voice
//! (or text) and hear a spoken answer. Reads the active session transcript, answers
//! via the native Anthropic Messages API (Sonnet), and speaks via the ElevenLabs
//! "Monoli" voice through the existing `tts.rs` path.
//!
//! This module is also the shared substrate for the multi-session "Voice Agent
//! Control Center" (the push/queue half) — see the build plan.

pub mod anthropic;
pub mod prompt;
pub mod session;

use crate::settings::AppSettings;
use std::sync::atomic::{AtomicU64, Ordering};

/// Bumped on every turn / cancel so a superseded answer never speaks late.
static CONVERSE_GEN: AtomicU64 = AtomicU64::new(0);

/// Run one Conversation Mode turn: find the active session, answer the question,
/// speak the answer. Returns the answer text (for the UI / logging).
pub fn run_turn(settings: &AppSettings, question: &str) -> Result<String, String> {
    let my_gen = CONVERSE_GEN.fetch_add(1, Ordering::SeqCst) + 1;

    let api_key = settings
        .converse_api_key()
        .ok_or("No Anthropic API key configured for Conversation Mode")?;
    let model = if settings.converse_model.trim().is_empty() {
        "claude-sonnet-4-6".to_string()
    } else {
        settings.converse_model.clone()
    };
    let scope = settings.converse_project_scope.as_deref();

    let path = session::find_active_transcript(scope)
        .ok_or("No active Claude Code session transcript found")?;
    let max_turns = if settings.converse_max_turns == 0 {
        14
    } else {
        settings.converse_max_turns as usize
    };
    let ctx = session::tail_turns(&path, max_turns, 12_000);

    let system = prompt::system_prompt();
    let user = prompt::user_prompt(question, &ctx);
    let answer = anthropic::answer(&api_key, &model, &system, &user, 400)?;

    // If a newer turn or a cancel superseded us, return the text but don't speak.
    if CONVERSE_GEN.load(Ordering::SeqCst) == my_gen {
        crate::tts::speak_with_settings(settings, &answer);
    }
    Ok(answer)
}

/// Cancel any in-flight answer and stop speech.
pub fn cancel() {
    CONVERSE_GEN.fetch_add(1, Ordering::SeqCst);
    crate::tts::stop();
}
