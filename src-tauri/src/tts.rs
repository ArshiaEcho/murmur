//! Text-to-speech via the macOS `say` command. Offline, no extra dependencies.
//!
//! Shared by the Read Aloud feature (`ReadSelectionAction`) and, later,
//! Conversation Mode. One utterance plays at a time: every `speak()` cancels any
//! in-flight speech first, and `stop()` kills it immediately (used for hotkey /
//! Esc / new-dictation barge-in).

use kokoro_en::{KokoroTts, Voice};
use log::{debug, warn};
use once_cell::sync::{Lazy, OnceCell};
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Emitter};
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

// --- Kokoro (local neural TTS, free + offline) ------------------------------

/// Directory holding the Kokoro model (`model.onnx`) and `voices/<name>.bin`.
/// Set once at startup from `<app_data_dir>/models/kokoro`.
static KOKORO_DIR: OnceCell<PathBuf> = OnceCell::new();

/// The loaded Kokoro engine, initialized lazily on first synth (model load is
/// expensive). Reused across utterances.
static KOKORO_INSTANCE: tokio::sync::OnceCell<KokoroTts> = tokio::sync::OnceCell::const_new();

/// Configure where the Kokoro model + voicepacks live. Call once during setup.
pub fn set_kokoro_dir(dir: PathBuf) {
    // Force the CPU execution provider. The quantized Kokoro model we ship
    // cannot run on CoreML (it fails at synth with "dynamically resizing for
    // sequence length"), and the crate's auto-probe does not catch it. CPU is
    // ~2x realtime here, fine for Read Aloud. A power user can still override
    // with a real KOKORO_ORT_PROVIDER env var (e.g. with the fp32 model).
    if std::env::var_os("KOKORO_ORT_PROVIDER").is_none() {
        std::env::set_var("KOKORO_ORT_PROVIDER", "cpu");
    }
    let _ = KOKORO_DIR.set(dir);
}

/// App handle for surfacing TTS degradations to the UI (set once at startup).
static TTS_APP: OnceCell<AppHandle> = OnceCell::new();

/// Stash the app handle so the engine can emit `tts-degraded` events.
pub fn set_app_handle(app: AppHandle) {
    let _ = TTS_APP.set(app);
}

/// Surface a non-fatal TTS degradation to the UI instead of silently dropping
/// to a worse voice. `reason` is a stable code; `message` is human text shown
/// as a toast. This is the fix for "my voices silently disappeared".
fn emit_degraded(reason: &str, message: &str) {
    warn!("tts: degraded ({reason}): {message}");
    if let Some(app) = TTS_APP.get() {
        let _ = app.emit(
            "tts-degraded",
            serde_json::json!({ "reason": reason, "message": message }),
        );
    }
}

/// The default Kokoro voice when none is configured.
pub fn default_kokoro_voice() -> &'static str {
    "af_heart"
}

/// True if the Kokoro model file has been downloaded.
pub fn kokoro_model_ready() -> bool {
    KOKORO_DIR
        .get()
        .map(|d| d.join("model.onnx").exists())
        .unwrap_or(false)
}

/// List downloaded Kokoro voices (the `<name>.bin` file-stems in `voices/`),
/// sorted. Empty if the dir is unset or no voices are downloaded yet.
pub fn list_kokoro_voices() -> Vec<String> {
    let Some(dir) = KOKORO_DIR.get() else {
        return Vec::new();
    };
    let mut out = Vec::new();
    if let Ok(entries) = std::fs::read_dir(dir.join("voices")) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|x| x.to_str()) == Some("bin") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    out.push(stem.to_string());
                }
            }
        }
    }
    out.sort();
    out
}

/// Spawn `afplay <path>` as the tracked child (generation-guarded), so `stop()`
/// and `is_speaking()` work for file playback exactly as for `say`.
fn play_file(path: &Path, my_gen: u64) {
    match Command::new("afplay").arg(path).spawn() {
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
            debug!("tts: playing audio file {}", path.display());
        }
        Err(e) => warn!("tts: failed to spawn `afplay`: {e}"),
    }
}

/// Write mono f32 PCM samples (Kokoro outputs 24kHz) to a 16-bit WAV file.
fn write_wav_i16(path: &Path, samples: &[f32], sample_rate: u32) -> Result<(), String> {
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };
    let mut writer = hound::WavWriter::create(path, spec).map_err(|e| e.to_string())?;
    for &s in samples {
        let v = (s.clamp(-1.0, 1.0) * 32767.0) as i16;
        writer.write_sample(v).map_err(|e| e.to_string())?;
    }
    writer.finalize().map_err(|e| e.to_string())
}

/// Load (once) the Kokoro engine from `KOKORO_DIR`. Errors if the model is not
/// downloaded yet, so callers can fall back to `say`.
async fn kokoro_instance() -> Result<&'static KokoroTts, String> {
    KOKORO_INSTANCE
        .get_or_try_init(|| async {
            let dir = KOKORO_DIR.get().ok_or("kokoro dir not configured")?;
            let model = dir.join("model.onnx");
            let voices = dir.join("voices");
            if !model.exists() {
                return Err(format!("kokoro model not downloaded ({})", model.display()));
            }
            KokoroTts::new(model, voices)
                .await
                .map_err(|e| format!("kokoro load failed: {e}"))
        })
        .await
}

// --- shared chunked playback (reads start fast, not after the whole text) ----

/// Unique temp-file counter so rapid/overlapping utterances never collide.
static TMP_SEQ: AtomicU64 = AtomicU64::new(0);

fn tmp_audio_path(ext: &str) -> PathBuf {
    let n = TMP_SEQ.fetch_add(1, Ordering::Relaxed);
    std::env::temp_dir().join(format!("strat-tts-{n}.{ext}"))
}

/// Split text into readable chunks (~sentences, each <= ~400 chars) so the
/// first chunk plays in ~1s instead of waiting for the whole selection.
fn split_for_reading(text: &str) -> Vec<String> {
    const MAX: usize = 400;
    let mut chunks: Vec<String> = Vec::new();
    let mut cur = String::new();
    fn flush(chunks: &mut Vec<String>, cur: &mut String) {
        let s = cur.trim();
        if !s.is_empty() {
            chunks.push(s.to_string());
        }
        cur.clear();
    }
    for piece in text.split_inclusive(|c: char| matches!(c, '.' | '!' | '?' | '\n')) {
        let piece = piece.trim();
        if piece.is_empty() {
            continue;
        }
        if cur.len() + piece.len() + 1 > MAX {
            flush(&mut chunks, &mut cur);
        }
        if piece.len() > MAX {
            for word in piece.split_whitespace() {
                if cur.len() + word.len() + 1 > MAX {
                    flush(&mut chunks, &mut cur);
                }
                if !cur.is_empty() {
                    cur.push(' ');
                }
                cur.push_str(word);
            }
        } else {
            if !cur.is_empty() {
                cur.push(' ');
            }
            cur.push_str(piece);
        }
    }
    flush(&mut chunks, &mut cur);
    chunks
}

/// Play an audio file and BLOCK until it finishes or a newer utterance/stop
/// supersedes us. Returns false if superseded (so the chunk loop aborts).
fn play_and_wait(path: &Path, my_gen: u64) -> bool {
    play_file(path, my_gen);
    loop {
        std::thread::sleep(std::time::Duration::from_millis(60));
        if GEN.load(Ordering::SeqCst) != my_gen {
            return false;
        }
        if !is_speaking() {
            return true;
        }
    }
}

/// Speak `text` by splitting it into chunks and synthesizing + playing each in
/// order, so audio starts quickly. `synth` turns one chunk into a playable
/// audio file. On synth failure it surfaces a notice and reads the rest via
/// macOS `say`. Runs on a background thread; cancels cleanly on stop()/Esc.
fn speak_chunked<F>(
    text: &str,
    fallback_say_voice: Option<String>,
    reason: &'static str,
    message: &'static str,
    synth: F,
) where
    F: Fn(&str) -> Result<PathBuf, String> + Send + 'static,
{
    let full = text.trim().to_string();
    if full.is_empty() {
        return;
    }
    stop();
    let my_gen = GEN.load(Ordering::SeqCst);
    std::thread::spawn(move || {
        let chunks = split_for_reading(&full);
        for (i, chunk) in chunks.iter().enumerate() {
            if GEN.load(Ordering::SeqCst) != my_gen {
                return;
            }
            match synth(chunk) {
                Ok(path) => {
                    let played = play_and_wait(&path, my_gen);
                    let _ = std::fs::remove_file(&path);
                    if !played {
                        return;
                    }
                }
                Err(e) => {
                    warn!("tts: chunk synth failed ({e})");
                    if GEN.load(Ordering::SeqCst) == my_gen {
                        emit_degraded(reason, message);
                        speak(&chunks[i..].join(" "), fallback_say_voice.as_deref(), None);
                    }
                    return;
                }
            }
        }
    });
}

/// Speak `text` with a local Kokoro voice (free, offline), chunked so it starts
/// quickly. Each chunk is synthesized to a WAV and played in order.
pub fn speak_kokoro(text: &str, voice_id: &str, speed: f32, fallback_say_voice: Option<String>) {
    let voice_id = voice_id.to_string();
    speak_chunked(
        text,
        fallback_say_voice,
        "kokoro_failed",
        "Free voice engine unavailable (model not downloaded?). Using the system voice.",
        move |chunk| {
            let voice = Voice::new(voice_id.clone()).with_speed(speed);
            let samples = tauri::async_runtime::block_on(async {
                let tts = kokoro_instance().await?;
                tts.synth(chunk, voice)
                    .await
                    .map(|(s, _)| s)
                    .map_err(|e| e.to_string())
            })?;
            let path = tmp_audio_path("wav");
            write_wav_i16(&path, &samples, 24_000)?;
            Ok(path)
        },
    );
}

// --- edge-tts (Microsoft Edge "Read aloud" neural voices: free, fast, many) --

/// Install a rustls CryptoProvider so edge-tts's TLS works (both ring and
/// aws-lc-rs are in the dependency graph, so rustls won't auto-pick). Call once.
pub fn init_tls_provider() {
    let _ = rustls::crypto::aws_lc_rs::default_provider().install_default();
}

/// Cached edge-tts voice list (one network call, reused).
static EDGE_VOICES: OnceCell<Vec<msedge_tts::voice::Voice>> = OnceCell::new();

fn edge_voices() -> Result<&'static Vec<msedge_tts::voice::Voice>, String> {
    if let Some(v) = EDGE_VOICES.get() {
        return Ok(v);
    }
    let v = msedge_tts::voice::get_voices_list().map_err(|e| e.to_string())?;
    let _ = EDGE_VOICES.set(v);
    Ok(EDGE_VOICES.get().unwrap())
}

/// Parse "Microsoft ... Voice (en-US, AriaNeural)" -> (id "AriaNeural",
/// display "Aria", locale "en-US").
fn parse_edge_voice(full: &str) -> Option<(String, String, String)> {
    let inside = full.rsplit_once('(')?.1.trim_end_matches(')');
    let (locale, short) = inside.split_once(',')?;
    let id = short.trim().to_string();
    let display = id.trim_end_matches("Neural").trim().to_string();
    Some((id, display, locale.trim().to_string()))
}

/// English edge-tts voices as (id, display, locale), sorted by locale+display.
pub fn list_edge_voices() -> Vec<(String, String, String)> {
    let Ok(voices) = edge_voices() else {
        return Vec::new();
    };
    let mut out: Vec<_> = voices
        .iter()
        .filter_map(|v| parse_edge_voice(&v.name))
        .filter(|(_, _, locale)| locale.to_lowercase().starts_with("en"))
        .collect();
    out.sort_by(|a, b| (&a.2, &a.1).cmp(&(&b.2, &b.1)));
    out.dedup();
    out
}

fn edge_config(voice_id: &str) -> Result<msedge_tts::tts::SpeechConfig, String> {
    let voices = edge_voices()?;
    let v = voices
        .iter()
        .find(|v| v.name.contains(voice_id))
        .ok_or_else(|| format!("edge voice not found: {voice_id}"))?;
    Ok(msedge_tts::tts::SpeechConfig::from(v))
}

/// The default edge-tts voice (US, natural female).
pub fn default_edge_voice() -> &'static str {
    "AriaNeural"
}

/// Speak `text` with an edge-tts neural voice (free, fast, online), chunked so
/// it starts quickly. Each chunk is synthesized to mp3 and played in order.
pub fn speak_edge(text: &str, voice_id: &str, fallback_say_voice: Option<String>) {
    let voice_id = voice_id.to_string();
    speak_chunked(
        text,
        fallback_say_voice,
        "edge_failed",
        "Edge voice unavailable (offline?). Using the system voice.",
        move |chunk| {
            let config = edge_config(&voice_id)?;
            let mut client = msedge_tts::tts::client::connect().map_err(|e| e.to_string())?;
            let audio = client
                .synthesize(chunk, &config)
                .map_err(|e| e.to_string())?;
            let path = tmp_audio_path("mp3");
            std::fs::write(&path, &audio.audio_bytes).map_err(|e| e.to_string())?;
            Ok(path)
        },
    );
}

/// Speak `text` using whichever engine the settings select: local Kokoro
/// (default), macOS `say`, or ElevenLabs (opt-in). This is the single seam the
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
        TtsProvider::Kokoro => {
            let voice = settings
                .kokoro_voice_id
                .clone()
                .unwrap_or_else(|| default_kokoro_voice().to_string());
            // Map Read Aloud rate (wpm; default 175) to Kokoro's speed multiplier.
            let speed = (settings.tts_rate as f32 / 175.0).clamp(0.5, 2.0);
            speak_kokoro(text, &voice, speed, settings.tts_voice.clone());
        }
        TtsProvider::EdgeTts => {
            let voice = settings
                .edge_voice_id
                .clone()
                .unwrap_or_else(|| default_edge_voice().to_string());
            speak_edge(text, &voice, settings.tts_voice.clone());
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
            warn!("tts: ElevenLabs request failed ({e})");
            if GEN.load(Ordering::SeqCst) == my_gen {
                emit_degraded(
                    "elevenlabs_failed",
                    "ElevenLabs unavailable (quota, key, or network). Using the free Kokoro voice.",
                );
                speak_kokoro(&text, default_kokoro_voice(), 1.0, None);
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

    /// Headless smoke test for the Kokoro engine. Requires the model to be
    /// downloaded to the app data dir. Run explicitly:
    ///   cargo test kokoro_smoke -- --ignored --nocapture
    ///   afplay /tmp/kokoro_smoke.wav
    #[test]
    #[ignore]
    fn kokoro_smoke() {
        let home = std::env::var("HOME").unwrap();
        let base = format!("{home}/Library/Application Support/com.stratos.strat/models/kokoro");
        tauri::async_runtime::block_on(async {
            let tts = KokoroTts::new(format!("{base}/model.onnx"), format!("{base}/voices"))
                .await
                .expect("load kokoro model");
            let (samples, dur) = tts
                .synth(
                    "Hello from Murmur. This is the Kokoro voice, running locally and completely free.",
                    Voice::new("af_heart"),
                )
                .await
                .expect("synth");
            eprintln!("kokoro: {} samples in {:?}", samples.len(), dur);
            assert!(!samples.is_empty(), "expected non-empty audio");
            let out = std::path::Path::new("/tmp/kokoro_smoke.wav");
            write_wav_i16(out, &samples, 24_000).expect("write wav");
            eprintln!("wrote {}", out.display());
        });
    }

    /// Headless smoke test for edge-tts (Microsoft Edge Read Aloud). Hits the
    /// network. Run: cargo test edge_smoke -- --ignored --nocapture ; afplay /tmp/edge_smoke.mp3
    #[test]
    #[ignore]
    fn edge_smoke() {
        use msedge_tts::tts::{client::connect, SpeechConfig};
        use msedge_tts::voice::get_voices_list;
        let voices = get_voices_list().expect("voice list");
        let en: Vec<_> = voices
            .iter()
            .filter(|v| {
                v.locale
                    .as_deref()
                    .unwrap_or("")
                    .to_lowercase()
                    .starts_with("en")
            })
            .collect();
        eprintln!("edge voices: {} total, {} english", voices.len(), en.len());
        for v in en.iter().take(10) {
            eprintln!("  {} | {}", v.name, v.locale.as_deref().unwrap_or(""));
        }
        let voice = en
            .iter()
            .find(|v| v.name.contains("AriaNeural"))
            .or_else(|| en.first())
            .expect("an english voice");
        let _ = rustls::crypto::aws_lc_rs::default_provider().install_default();
        let config = SpeechConfig::from(*voice);
        let t0 = std::time::Instant::now();
        let mut client = connect().expect("connect");
        let audio = client
            .synthesize(
                "Hello Arshia, this is a free Microsoft Edge neural voice running in Murmur.",
                &config,
            )
            .expect("synthesize");
        eprintln!(
            "edge synth: {} audio bytes in {:?}",
            audio.audio_bytes.len(),
            t0.elapsed()
        );
        assert!(!audio.audio_bytes.is_empty());
        std::fs::write("/tmp/edge_smoke.mp3", &audio.audio_bytes).expect("write");
        eprintln!("wrote /tmp/edge_smoke.mp3");
    }
}
