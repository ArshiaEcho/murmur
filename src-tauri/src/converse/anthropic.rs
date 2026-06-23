//! Minimal native Anthropic Messages client for Conversation Mode answers.
//! NOTE: this is the native `/v1/messages` API (NOT the OpenAI-shaped
//! `/chat/completions` that `llm_client.rs` speaks). MVP is non-streaming;
//! streaming + per-sentence TTS is a Phase 2 upgrade.

use serde_json::{json, Value};

/// Ask the model and return the full answer text.
pub fn answer(
    api_key: &str,
    model: &str,
    system: &str,
    user: &str,
    max_tokens: u32,
) -> Result<String, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(60))
        .build()
        .map_err(|e| e.to_string())?;

    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&json!({
            "model": model,
            "max_tokens": max_tokens,
            "system": system,
            "messages": [{ "role": "user", "content": user }],
        }))
        .send()
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        let code = resp.status();
        let body: String = resp.text().unwrap_or_default().chars().take(500).collect();
        return Err(format!("HTTP {code}: {body}"));
    }

    let v: Value = resp.json().map_err(|e| e.to_string())?;
    let text = v
        .get("content")
        .and_then(|c| c.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|b| b.get("text").and_then(|t| t.as_str()))
                .collect::<Vec<_>>()
                .join(" ")
        })
        .unwrap_or_default();

    if text.trim().is_empty() {
        return Err("Anthropic returned an empty answer".to_string());
    }
    Ok(text.trim().to_string())
}
