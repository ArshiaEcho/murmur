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
use std::sync::Mutex;

/// The currently-speaking `say` child process, if any.
static CURRENT: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));

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
