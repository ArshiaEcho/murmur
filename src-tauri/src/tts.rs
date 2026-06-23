//! Text-to-speech via the macOS `say` command. Offline, no extra dependencies.
//!
//! Shared by the Read Aloud feature (`ReadSelectionAction`) and, later,
//! Conversation Mode. One utterance plays at a time: every `speak()` cancels any
//! in-flight speech first, and `stop()` kills it immediately (used for hotkey /
//! Esc / new-dictation barge-in).

use log::{debug, warn};
use once_cell::sync::Lazy;
use std::io::Write;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Mutex;

/// The currently-playing child process (`say` or `afplay`), if any.
static CURRENT: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));

/// Bumped on every `stop()` / new utterance so an in-flight ElevenLabs fetch can
/// detect it has been superseded and must not start playing late.
static GEN: AtomicU64 = AtomicU64::new(0);

/// Speak `text` aloud with macOS `say`. Cancels any in-flight utterance first.
///
/// - `voice`: a `say -v` voice name (e.g. "Samantha"); `None`/empty = system default.
/// - `rate`: words per minute; `None`/0 = the voice's default.
///
/// The text is piped via stdin (`say -f -`) so long selections never hit ARG_MAX.
pub fn speak(text: &str, voice: Option<&str>, rate: Option<u32>) {
    let text = text.trim();
    if text.is_empty() {
        return;
    }
    stop(); // mutually exclusive: one utterance at a time

    let mut cmd = Command::new("say");
    if let Some(v) = voice {
        if !v.is_empty() {
            cmd.arg("-v").arg(v);
        }
    }
    if let Some(r) = rate {
        if r > 0 {
            cmd.arg("-r").arg(r.to_string());
        }
    }
    cmd.arg("-f").arg("-").stdin(Stdio::piped());

    match cmd.spawn() {
        Ok(mut child) => {
            if let Some(mut stdin) = child.stdin.take() {
                let _ = stdin.write_all(text.as_bytes());
                // stdin drops here -> EOF -> `say` begins speaking.
            }
            *CURRENT.lock().unwrap() = Some(child);
            debug!("tts: speaking {} chars (voice={:?}, rate={:?})", text.len(), voice, rate);
        }
        Err(e) => warn!("tts: failed to spawn `say`: {e}"),
    }
}

/// Stop any in-flight speech immediately. Safe to call when nothing is playing.
pub fn stop() {
    // Invalidate any ElevenLabs fetch that is still in flight, then kill playback.
    GEN.fetch_add(1, Ordering::SeqCst);
    if let Some(mut child) = CURRENT.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait(); // reap to avoid a zombie
    }
}

/// True if `say` is currently speaking. Reaps the child if it has finished.
pub fn is_speaking() -> bool {
    let mut guard = CURRENT.lock().unwrap();
    match guard.as_mut() {
        Some(child) => match child.try_wait() {
            Ok(Some(_)) => {
                *guard = None;
                false
            }
            Ok(None) => true,
            Err(_) => false,
        },
        None => false,
    }
}

/// List available macOS voices by parsing `say -v '?'`.
///
/// Output lines look like `Name   xx_XX   # sample sentence`, where the name may
/// contain spaces and parenthetical language labels. We anchor on the `xx_XX`
/// locale token rather than splitting on whitespace.
pub fn list_voices() -> Vec<TtsVoiceInfo> {
    let output = match Command::new("say").arg("-v").arg("?").output() {
        Ok(o) => o,
        Err(e) => {
            warn!("tts: `say -v ?` failed: {e}");
            return Vec::new();
        }
    };
    let text = String::from_utf8_lossy(&output.stdout);
    parse_voice_list(&text)
}

/// One voice from `say -v '?'`.
#[derive(Debug, Clone)]
pub struct TtsVoiceInfo {
    pub name: String,
    pub locale: String,
    pub sample: String,
}

fn parse_voice_list(text: &str) -> Vec<TtsVoiceInfo> {
    // name (non-greedy) + whitespace + locale (xx_XX / xxx_XX) + whitespace + '#' sample
    static RE: Lazy<regex::Regex> = Lazy::new(|| {
        regex::Regex::new(r"^(?P<name>.+?)\s+(?P<locale>[a-z]{2,3}_[A-Z]{2,})\s+#\s*(?P<sample>.*)$")
            .expect("valid voice regex")
    });
    text.lines()
        .filter_map(|line| {
            let caps = RE.captures(line.trim_end())?;
            Some(TtsVoiceInfo {
                name: caps.name("name")?.as_str().trim().to_string(),
                locale: caps.name("locale")?.as_str().to_string(),
                sample: caps.name("sample")?.as_str().trim().to_string(),
            })
        })
        .collect()
}

/// Speak `text` using whichever engine the settings select: macOS `say` by
/// default, ElevenLabs when chosen and configured. This is the single seam the
/// hotkey action and the preview command route through.
pub fn speak_with_settings(settings: &crate::settings::AppSettings, text: &str) {
    use crate::settings::TtsProvider;
    let rate = if settings.tts_rate > 0 {
        Some(settings.tts_rate)
    } else {
        None
    };
    match settings.tts_provider {
        TtsProvider::ElevenLabs => {
            let voice = settings.elevenlabs_voice_id.clone().unwrap_or_default();
            match settings.elevenlabs_api_key() {
                Some(key) if !key.is_empty() && !voice.is_empty() => {
                    speak_elevenlabs(text, &voice, &key)
                }
                _ => {
                    warn!("tts: ElevenLabs selected but key/voice missing; using macOS say");
                    speak(text, settings.tts_voice.as_deref(), rate);
                }
            }
        }
        TtsProvider::Say => speak(text, settings.tts_voice.as_deref(), rate),
    }
}

/// Speak `text` with an ElevenLabs voice. Fetches the audio over HTTP on a
/// background thread, then plays the returned mp3 with `afplay` (tracked in
/// `CURRENT` exactly like `say`, so `stop()` / `is_speaking()` work unchanged).
///
/// On any failure (no key, wrong scope, offline, rate-limit) it falls back to the
/// offline macOS `say` voice so the user still hears the text.
pub fn speak_elevenlabs(text: &str, voice_id: &str, api_key: &str) {
    let text = text.trim().to_string();
    if text.is_empty() {
        return;
    }
    stop(); // silence anything playing and claim a fresh generation
    let my_gen = GEN.load(Ordering::SeqCst);
    let voice_id = voice_id.to_string();
    let api_key = api_key.to_string();

    std::thread::spawn(move || match fetch_elevenlabs_mp3(&text, &voice_id, &api_key) {
        Ok(bytes) => {
            if GEN.load(Ordering::SeqCst) != my_gen {
                return; // a stop()/new utterance superseded us while fetching
            }
            let path = std::env::temp_dir().join("strat-tts.mp3");
            if let Err(e) = std::fs::write(&path, &bytes) {
                warn!("tts: failed to write ElevenLabs audio: {e}");
                return;
            }
            match Command::new("afplay").arg(&path).spawn() {
                Ok(mut child) => {
                    let mut guard = CURRENT.lock().unwrap();
                    if GEN.load(Ordering::SeqCst) != my_gen {
                        let _ = child.kill();
                        let _ = child.wait();
                        return;
                    }
                    if let Some(mut old) = guard.take() {
                        let _ = old.kill();
                        let _ = old.wait();
                    }
                    *guard = Some(child);
                    debug!("tts: playing ElevenLabs audio ({} bytes)", bytes.len());
                }
                Err(e) => warn!("tts: failed to spawn `afplay`: {e}"),
            }
        }
        Err(e) => {
            warn!("tts: ElevenLabs request failed ({e}); falling back to macOS say");
            if GEN.load(Ordering::SeqCst) == my_gen {
                speak(&text, None, None);
            }
        }
    });
}

/// Blocking POST to ElevenLabs text-to-speech; returns mp3 bytes.
fn fetch_elevenlabs_mp3(text: &str, voice_id: &str, api_key: &str) -> Result<Vec<u8>, String> {
    let url = format!("https://api.elevenlabs.io/v1/text-to-speech/{voice_id}");
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .post(&url)
        .header("xi-api-key", api_key)
        .header("accept", "audio/mpeg")
        .json(&serde_json::json!({
            "text": text,
            // Flash v2.5: lowest-latency model (~75ms), 32 languages.
            "model_id": "eleven_flash_v2_5",
        }))
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        let code = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("HTTP {code}: {body}"));
    }
    Ok(resp.bytes().map_err(|e| e.to_string())?.to_vec())
}

/// List the user's ElevenLabs voices as `(voice_id, name, category)`.
/// Needs the API key's `voices_read` scope.
pub fn list_elevenlabs_voices(api_key: &str) -> Result<Vec<(String, String, String)>, String> {
    let client = reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;
    let resp = client
        .get("https://api.elevenlabs.io/v1/voices")
        .header("xi-api-key", api_key)
        .send()
        .map_err(|e| e.to_string())?;
    if !resp.status().is_success() {
        let code = resp.status();
        let body = resp.text().unwrap_or_default();
        return Err(format!("HTTP {code}: {body}"));
    }
    let json: serde_json::Value = resp.json().map_err(|e| e.to_string())?;
    let voices = json
        .get("voices")
        .and_then(|v| v.as_array())
        .ok_or("unexpected ElevenLabs response: no voices array")?
        .iter()
        .filter_map(|v| {
            let id = v.get("voice_id")?.as_str()?.to_string();
            let name = v.get("name").and_then(|n| n.as_str()).unwrap_or("Unnamed").to_string();
            let category = v
                .get("category")
                .and_then(|c| c.as_str())
                .unwrap_or("")
                .to_string();
            Some((id, name, category))
        })
        .collect();
    Ok(voices)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_multiword_and_parenthetical_names() {
        let sample = "\
Samantha           en_US    # Hello, my name is Samantha.
Eddy (English (US)) en_US    # Hi, I am Eddy.
Bad News            en_US    # The light you see at the end of the tunnel is the headlamp of a fast approaching train.
Amira               ar_001   # مرحبا، اسمي أميرة.";
        let voices = parse_voice_list(sample);
        assert_eq!(voices.len(), 4);
        assert_eq!(voices[0].name, "Samantha");
        assert_eq!(voices[0].locale, "en_US");
        assert_eq!(voices[1].name, "Eddy (English (US))");
        assert_eq!(voices[2].name, "Bad News");
        assert_eq!(voices[3].locale, "ar_001");
    }
}
