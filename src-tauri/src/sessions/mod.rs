//! Live Claude Code session registry — the Sessions Observatory backend.
//!
//! Source of truth (recon-verified, undocumented CC internals):
//!   - `~/.claude/sessions/<PID>.json` — one file per running `claude` process:
//!     `{pid, sessionId, cwd, startedAt, entrypoint, kind}`. Self-deletes on exit.
//!     Liveness = file exists AND `kill(pid, 0)` succeeds.
//!   - transcript at `~/.claude/projects/<forward-encoded-cwd>/<sessionId>.jsonl`,
//!     forward-encoded = every non-`[A-Za-z0-9]` char -> '-' (NEVER reverse-decode).
//!   - `~/.claude/ide/<PID>.lock` -> `workspaceFolders` maps a VS Code window to a
//!     workspace folder (for grouping).
//!   - activity = transcript file **mtime** (the sessions JSON mtime is frozen).
//!
//! We poll on a background thread (mirrors `AgentQueueManager`) and emit a
//! `SessionsUpdate::Reset` snapshot. On a transition into `WaitingForYou` we fire a
//! native macOS notification (+ optional spoken alert). Field names are keyed
//! defensively since these are version-fragile internals.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;
use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{Duration, SystemTime, UNIX_EPOCH};
use std::{fs, thread};
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

use crate::converse::session::tail_turns;
use crate::settings::AppSettings;

/// A transcript appended within this window = the session is actively working.
const WORKING_WINDOW_SECS: f64 = 8.0;
/// Max summaries to kick off per poll tick in rolling mode (bounds API spend).
const ROLLING_BATCH: usize = 3;

#[derive(Clone, Copy, Debug, Serialize, Deserialize, Type, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SessionStatus {
    Working,
    WaitingForYou,
    Idle,
}

/// One live Claude Code session, as shown in the Sessions view.
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct SessionInfo {
    pub id: String, // sessionId (uuid)
    pub pid: i32,
    pub cwd: String,
    pub repo: String,        // basename(cwd)
    pub repo_dashed: String, // forward-encoded cwd
    pub git_branch: Option<String>,
    pub entrypoint: String, // claude-vscode | cli | sdk-cli | sdk-py
    pub kind: String,       // interactive | ...
    pub is_background: bool, // sdk/automation (claude-mem etc.)
    pub workspace: Option<String>, // VS Code workspace folder (grouping key)
    pub started_at: f64,           // epoch ms
    pub last_activity_ms: Option<f64>, // transcript mtime, epoch ms
    pub transcript_path: Option<String>,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub status: SessionStatus,
    pub pinned: bool,
}

/// Rust -> React event for the Sessions view (kebab name: "sessions-update").
#[derive(Clone, Debug, Serialize, Deserialize, Type, Event)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum SessionsUpdate {
    Reset { sessions: Vec<SessionInfo> },
}

/// The `<PID>.json` shape. Defensive: tolerate missing/renamed fields.
#[derive(Deserialize)]
struct RawSession {
    #[serde(default)]
    pid: i32,
    #[serde(rename = "sessionId", default)]
    session_id: String,
    #[serde(default)]
    cwd: String,
    #[serde(rename = "startedAt", default)]
    started_at: f64,
    #[serde(default)]
    entrypoint: String,
    #[serde(default)]
    kind: String,
}

fn home() -> PathBuf {
    PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| ".".to_string()))
}

fn now_ms() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as f64)
        .unwrap_or(0.0)
}

fn mtime_ms(path: &Path) -> Option<f64> {
    let m = fs::metadata(path).ok()?.modified().ok()?;
    m.duration_since(UNIX_EPOCH).ok().map(|d| d.as_millis() as f64)
}

/// Forward-encode a cwd to its `~/.claude/projects` directory name: every
/// non-alphanumeric char becomes '-'. This is lossy by design — never reverse it.
pub fn forward_encode(cwd: &str) -> String {
    cwd.chars()
        .map(|c| if c.is_ascii_alphanumeric() { c } else { '-' })
        .collect()
}

/// Is `pid` a live process? `kill(pid, 0)` returns 0 if the process exists.
fn process_alive(pid: i32) -> bool {
    if pid <= 0 {
        return false;
    }
    unsafe { libc::kill(pid, 0) == 0 }
}

fn basename(cwd: &str) -> String {
    let trimmed = cwd.trim_end_matches('/');
    trimmed
        .rsplit('/')
        .next()
        .filter(|s| !s.is_empty())
        .unwrap_or("session")
        .to_string()
}

/// Map of VS Code workspace folders, read from `~/.claude/ide/*.lock`.
fn read_ide_workspaces() -> Vec<String> {
    let dir = home().join(".claude/ide");
    let mut out = Vec::new();
    let Ok(entries) = fs::read_dir(&dir) else {
        return out;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("lock") {
            continue;
        }
        if let Ok(text) = fs::read_to_string(&path) {
            if let Ok(v) = serde_json::from_str::<Value>(&text) {
                if let Some(folders) = v.get("workspaceFolders").and_then(|f| f.as_array()) {
                    for f in folders {
                        if let Some(s) = f.as_str() {
                            out.push(s.trim_end_matches('/').to_string());
                        }
                    }
                }
            }
        }
    }
    out
}

/// The workspace folder that contains `cwd` (exact or ancestor), if any.
fn workspace_for(cwd: &str, workspaces: &[String]) -> Option<String> {
    let cwd = cwd.trim_end_matches('/');
    workspaces
        .iter()
        .filter(|w| cwd == w.as_str() || cwd.starts_with(&format!("{w}/")))
        // Prefer the deepest (longest) matching folder.
        .max_by_key(|w| w.len())
        .cloned()
}

/// Read the first user message (for a title) from the head of a transcript.
fn extract_title(path: &Path) -> Option<String> {
    let content = read_head(path, 64 * 1024);
    for line in content.lines() {
        let Ok(v) = serde_json::from_str::<Value>(line) else {
            continue;
        };
        if v.get("type").and_then(|t| t.as_str()) != Some("user") {
            continue;
        }
        if v.get("isSidechain").and_then(|b| b.as_bool()).unwrap_or(false) {
            continue;
        }
        if v.get("message").and_then(|m| m.get("role")).and_then(|r| r.as_str()) != Some("user") {
            continue;
        }
        let text = match v.get("message").and_then(|m| m.get("content")) {
            Some(Value::String(s)) => s.trim().to_string(),
            Some(Value::Array(blocks)) => blocks
                .iter()
                .filter_map(|b| {
                    if b.get("type").and_then(|t| t.as_str()) == Some("text") {
                        b.get("text").and_then(|t| t.as_str()).map(|s| s.trim().to_string())
                    } else {
                        None
                    }
                })
                .find(|s| !s.is_empty())
                .unwrap_or_default(),
            _ => String::new(),
        };
        let text = text.trim();
        // Skip tool results, command wrappers, system reminders, caveats.
        if text.is_empty()
            || text.starts_with('<')
            || text.starts_with("Caveat:")
            || text.contains("tool_result")
            || text.starts_with("[Request interrupted")
        {
            continue;
        }
        let one_line = text.lines().next().unwrap_or(text).trim();
        return Some(truncate_chars(one_line, 80));
    }
    None
}

/// The role of the most recent real message + git branch, from the tail. The role
/// is one of "user" (user text), "assistant" (assistant TEXT turn — a real handoff
/// to the user), or "assistant_tooluse" (assistant emitted only a tool_use — it is
/// mid-work, waiting on a TOOL result, NOT on the user). We read a generous tail so
/// a single huge attachment/tool block doesn't hide the last real message.
fn last_role_and_branch(path: &Path) -> (Option<String>, Option<String>) {
    let content = read_tail(path, 256 * 1024);
    let mut branch: Option<String> = None;
    let mut last_role: Option<String> = None;
    for line in content.lines() {
        let Ok(v) = serde_json::from_str::<Value>(line) else {
            continue;
        };
        if let Some(b) = v.get("gitBranch").and_then(|b| b.as_str()) {
            if !b.is_empty() {
                branch = Some(b.to_string());
            }
        }
        if v.get("isSidechain").and_then(|b| b.as_bool()).unwrap_or(false) {
            continue;
        }
        if v.get("isMeta").and_then(|b| b.as_bool()).unwrap_or(false) {
            continue;
        }
        let ty = v.get("type").and_then(|t| t.as_str()).unwrap_or("");
        if ty != "user" && ty != "assistant" {
            continue;
        }
        let content = v.get("message").and_then(|m| m.get("content"));
        let (has_text, has_tool_use) = match content {
            Some(Value::String(s)) => (!s.trim().is_empty(), false),
            Some(Value::Array(blocks)) => {
                let text = blocks.iter().any(|b| {
                    b.get("type").and_then(|t| t.as_str()) == Some("text")
                        && b.get("text")
                            .and_then(|t| t.as_str())
                            .map_or(false, |s| !s.trim().is_empty())
                });
                let tool = blocks
                    .iter()
                    .any(|b| b.get("type").and_then(|t| t.as_str()) == Some("tool_use"));
                (text, tool)
            }
            _ => (false, false),
        };
        if ty == "assistant" {
            if has_text {
                last_role = Some("assistant".to_string());
            } else if has_tool_use {
                last_role = Some("assistant_tooluse".to_string());
            }
        } else if has_text {
            last_role = Some("user".to_string());
        }
    }
    (last_role, branch)
}

fn compute_status(last_activity_ms: Option<f64>, last_role: Option<&str>) -> SessionStatus {
    if let Some(t) = last_activity_ms {
        if now_ms() - t < WORKING_WINDOW_SECS * 1000.0 {
            return SessionStatus::Working;
        }
    }
    // Only a finished assistant TEXT turn means "your move". An assistant tool_use
    // (agent waiting on a tool), a user message, or nothing => Idle, never an alert.
    match last_role {
        Some("assistant") => SessionStatus::WaitingForYou,
        _ => SessionStatus::Idle,
    }
}

fn read_head(path: &Path, max_bytes: usize) -> String {
    use std::io::Read;
    let Ok(mut file) = fs::File::open(path) else {
        return String::new();
    };
    let mut buf = vec![0u8; max_bytes];
    let n = file.read(&mut buf).unwrap_or(0);
    buf.truncate(n);
    String::from_utf8_lossy(&buf).into_owned()
}

fn read_tail(path: &Path, max_bytes: u64) -> String {
    use std::io::{Read, Seek, SeekFrom};
    let Ok(mut file) = fs::File::open(path) else {
        return String::new();
    };
    let len = file.metadata().map(|m| m.len()).unwrap_or(0);
    let start = len.saturating_sub(max_bytes);
    if file.seek(SeekFrom::Start(start)).is_err() {
        return String::new();
    }
    let mut buf = Vec::new();
    if file.read_to_end(&mut buf).is_err() {
        return String::new();
    }
    let s = String::from_utf8_lossy(&buf).into_owned();
    if start > 0 {
        if let Some(idx) = s.find('\n') {
            return s[idx + 1..].to_string();
        }
    }
    s
}

fn truncate_chars(s: &str, n: usize) -> String {
    let mut out: String = s.chars().take(n).collect();
    if s.chars().count() > n {
        out.push('…');
    }
    out
}

/// Scan `~/.claude/sessions/*.json` and build a snapshot of every LIVE session.
pub fn discover(pinned: &HashSet<String>) -> Vec<SessionInfo> {
    let sessions_dir = home().join(".claude/sessions");
    let projects_dir = home().join(".claude/projects");
    let workspaces = read_ide_workspaces();

    let entries = match fs::read_dir(&sessions_dir) {
        Ok(e) => e,
        Err(_) => return Vec::new(),
    };

    let mut out = Vec::new();
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }
        let Ok(text) = fs::read_to_string(&path) else {
            continue;
        };
        let Ok(raw) = serde_json::from_str::<RawSession>(&text) else {
            continue;
        };
        if raw.session_id.is_empty() || !process_alive(raw.pid) {
            continue;
        }

        let repo_dashed = forward_encode(&raw.cwd);
        let transcript = projects_dir
            .join(&repo_dashed)
            .join(format!("{}.jsonl", raw.session_id));
        let transcript_path = transcript.exists().then(|| transcript.clone());

        let (last_activity_ms, title, last_role, git_branch) = match &transcript_path {
            Some(p) => {
                let (role, branch) = last_role_and_branch(p);
                (mtime_ms(p), extract_title(p), role, branch)
            }
            None => (None, None, None, None),
        };

        let entrypoint = raw.entrypoint.clone();
        let kind = if raw.kind.is_empty() {
            "interactive".to_string()
        } else {
            raw.kind.clone()
        };
        let is_background = entrypoint.starts_with("sdk") || kind != "interactive";
        let status = compute_status(last_activity_ms, last_role.as_deref());

        out.push(SessionInfo {
            id: raw.session_id.clone(),
            pid: raw.pid,
            repo: basename(&raw.cwd),
            repo_dashed,
            cwd: raw.cwd.clone(),
            git_branch,
            entrypoint,
            kind,
            is_background,
            workspace: workspace_for(&raw.cwd, &workspaces),
            started_at: raw.started_at,
            last_activity_ms,
            pinned: pinned.contains(&raw.session_id),
            transcript_path: transcript_path.map(|p| p.to_string_lossy().into_owned()),
            title,
            summary: None,
            status,
        });
    }

    // Most-recently-active first; sessions with no transcript sink to the bottom.
    out.sort_by(|a, b| {
        b.last_activity_ms
            .unwrap_or(0.0)
            .partial_cmp(&a.last_activity_ms.unwrap_or(0.0))
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    out
}

/// Build the Haiku prompt body for a one-sentence "what's it doing now" summary.
fn summary_user_prompt(ctx: &crate::converse::session::SessionContext) -> String {
    let mut s = String::new();
    s.push_str(&format!(
        "Repo: {}\nBranch: {}\n\nRecent session activity (oldest to newest):\n",
        if ctx.cwd.is_empty() { "unknown" } else { &ctx.cwd },
        if ctx.git_branch.is_empty() { "unknown" } else { &ctx.git_branch }
    ));
    for turn in &ctx.turns {
        let who = if turn.role == "assistant" { "Agent" } else { "User" };
        s.push_str(&format!("{who}: {}\n", turn.text));
    }
    s.push_str("\nIn ONE short sentence (max 18 words), what is this session doing right now?");
    s
}

/// Compute a Haiku one-line summary for a session (blocking). `None` on any error.
pub fn compute_summary(settings: &AppSettings, transcript_path: &str) -> Option<String> {
    let key = settings.converse_api_key()?;
    let model = if settings.summary_model.trim().is_empty() {
        "claude-haiku-4-5".to_string()
    } else {
        settings.summary_model.clone()
    };
    let ctx = tail_turns(Path::new(transcript_path), 14, 12_000);
    if ctx.turns.is_empty() {
        return None;
    }
    let system = "You summarize what a coding session is doing right now in ONE short, plain \
sentence (max 18 words). No markdown, no preamble, no quotes. Just the sentence.";
    let user = summary_user_prompt(&ctx);
    crate::converse::anthropic::answer(&key, &model, system, &user, 80).ok()
}

/// Make a string safe to embed inside an AppleScript double-quoted literal:
/// strip control chars/newlines, escape backslash FIRST then the quote, and bound
/// the length. (Backslash is AppleScript's escape char, so it must be escaped
/// before the quote or a trailing `\` would escape the closing quote.)
fn applescript_literal(text: &str) -> String {
    text.chars()
        .filter(|c| !c.is_control())
        .take(180)
        .collect::<String>()
        .replace('\\', "\\\\")
        .replace('"', "\\\"")
}

/// Fire a native macOS notification (best-effort, zero-dependency). Reaps the
/// child on a detached thread so it never becomes a zombie.
fn notify(title: &str, body: &str) {
    let script = format!(
        "display notification \"{}\" with title \"{}\"",
        applescript_literal(body),
        applescript_literal(title)
    );
    if let Ok(mut child) = std::process::Command::new("osascript").arg("-e").arg(script).spawn() {
        thread::spawn(move || {
            let _ = child.wait();
        });
    }
}

pub struct SessionRegistryManager {
    app: AppHandle,
    sessions: Mutex<Vec<SessionInfo>>,
    /// session_id -> (transcript mtime when summarized, summary text).
    summaries: Mutex<HashMap<String, (f64, String)>>,
    /// Previous status per session, to detect transitions into WaitingForYou.
    prev_status: Mutex<HashMap<String, SessionStatus>>,
    /// Summaries currently being fetched (avoid duplicate in-flight calls).
    in_flight: Mutex<HashSet<String>>,
}

impl SessionRegistryManager {
    pub fn new(app: &AppHandle) -> Self {
        Self {
            app: app.clone(),
            sessions: Mutex::new(Vec::new()),
            summaries: Mutex::new(HashMap::new()),
            prev_status: Mutex::new(HashMap::new()),
            in_flight: Mutex::new(HashSet::new()),
        }
    }

    pub fn start(self: &Arc<Self>) {
        let me = self.clone();
        thread::spawn(move || {
            // First scan inside the worker so app startup isn't blocked by disk I/O.
            // suppress_alerts=true means it won't record prev_status, so the first
            // real poll sees was==None and correctly does NOT alert on already-waiting
            // sessions (fire_attention_alerts requires was.is_some()).
            me.refresh(true);
            loop {
                thread::sleep(Duration::from_millis(1500));
                me.refresh(false);
            }
        });
    }

    pub fn snapshot(&self) -> Vec<SessionInfo> {
        self.sessions.lock().unwrap_or_else(|e| e.into_inner()).clone()
    }

    /// Look up a live session by id (for transcript / focus / ask commands).
    pub fn find(&self, id: &str) -> Option<SessionInfo> {
        self.sessions.lock().unwrap_or_else(|e| e.into_inner()).iter().find(|s| s.id == id).cloned()
    }

    /// Cache an externally-computed summary and re-emit on the next tick.
    pub fn set_summary(&self, id: &str, mtime: f64, summary: String) {
        self.summaries
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .insert(id.to_string(), (mtime, summary));
        self.in_flight.lock().unwrap_or_else(|e| e.into_inner()).remove(id);
    }

    /// Compute + cache a summary now (used by the on-demand command). Blocking.
    pub fn summarize_now(&self, id: &str) -> Result<String, String> {
        let session = self.find(id).ok_or("Session not found or no longer live")?;
        let path = session
            .transcript_path
            .ok_or("Session has no transcript yet")?;
        // Claim the in-flight slot so a concurrent rolling worker skips this id.
        self.in_flight
            .lock()
            .unwrap_or_else(|e| e.into_inner())
            .insert(id.to_string());
        let settings = crate::settings::get_settings(&self.app);
        let summary = match compute_summary(&settings, &path) {
            Some(s) => s,
            None => {
                // Release the slot we claimed so future summaries aren't blocked.
                self.in_flight.lock().unwrap_or_else(|e| e.into_inner()).remove(id);
                return Err("Could not summarize (no API key or empty transcript)".to_string());
            }
        };
        let mtime = mtime_ms(Path::new(&path)).unwrap_or_else(now_ms);
        self.set_summary(id, mtime, summary.clone()); // also clears the in-flight slot
        // Reflect immediately rather than waiting for the next poll.
        self.refresh(true);
        Ok(summary)
    }

    fn refresh(&self, suppress_alerts: bool) {
        let settings = crate::settings::get_settings(&self.app);
        let pinned: HashSet<String> = settings.sessions_pinned.iter().cloned().collect();
        let mut list = discover(&pinned);

        // Merge cached summaries (only if the transcript hasn't changed since).
        {
            let cache = self.summaries.lock().unwrap_or_else(|e| e.into_inner());
            for s in list.iter_mut() {
                if let Some((mtime, text)) = cache.get(&s.id) {
                    if s.last_activity_ms.map_or(true, |m| m <= *mtime + 1.0) {
                        s.summary = Some(text.clone());
                    }
                }
            }
        }

        // Rolling mode: kick off Haiku summaries for stale active/pinned sessions.
        if settings.sessions_rolling_summaries {
            self.kick_rolling_summaries(&list, &settings);
        }

        // Detect transitions into WaitingForYou and alert. Only an alert-evaluating
        // refresh records prev_status — otherwise a suppressed refresh (e.g. an
        // on-demand summarize racing a transition) could overwrite Working with
        // WaitingForYou and swallow the next poll's real alert.
        if !suppress_alerts {
            self.fire_attention_alerts(&list, &settings);
            let mut prev = self.prev_status.lock().unwrap_or_else(|e| e.into_inner());
            prev.clear();
            for s in &list {
                prev.insert(s.id.clone(), s.status);
            }
        }

        *self.sessions.lock().unwrap_or_else(|e| e.into_inner()) = list.clone();
        let _ = SessionsUpdate::Reset { sessions: list }.emit(&self.app);
    }

    fn kick_rolling_summaries(&self, list: &[SessionInfo], settings: &AppSettings) {
        let cache_snapshot: HashMap<String, f64> = {
            let cache = self.summaries.lock().unwrap_or_else(|e| e.into_inner());
            cache.iter().map(|(k, (m, _))| (k.clone(), *m)).collect()
        };
        let mut started = 0usize;
        for s in list {
            if started >= ROLLING_BATCH {
                break;
            }
            if s.is_background {
                continue;
            }
            // Only summarize sessions worth tracking: actively working or pinned.
            let interesting = s.status == SessionStatus::Working || s.pinned;
            if !interesting {
                continue;
            }
            let Some(path) = s.transcript_path.clone() else {
                continue;
            };
            let mtime = s.last_activity_ms.unwrap_or(0.0);
            let fresh = cache_snapshot.get(&s.id).map_or(true, |c| mtime > *c + 1.0);
            if !fresh {
                continue;
            }
            {
                let mut inflight = self.in_flight.lock().unwrap_or_else(|e| e.into_inner());
                if inflight.contains(&s.id) {
                    continue;
                }
                inflight.insert(s.id.clone());
            }
            started += 1;
            let app = self.app.clone();
            let id = s.id.clone();
            let settings = settings.clone();
            thread::spawn(move || {
                let summary = compute_summary(&settings, &path);
                if let Some(mgr) = app.try_state::<Arc<SessionRegistryManager>>() {
                    match summary {
                        Some(text) => mgr.set_summary(&id, mtime, text),
                        None => {
                            mgr.in_flight.lock().unwrap_or_else(|e| e.into_inner()).remove(&id);
                        }
                    }
                }
            });
        }
    }

    fn fire_attention_alerts(&self, list: &[SessionInfo], settings: &AppSettings) {
        let prev = self.prev_status.lock().unwrap_or_else(|e| e.into_inner()).clone();
        for s in list {
            if s.is_background {
                continue;
            }
            let was = prev.get(&s.id).copied();
            let now_waiting = s.status == SessionStatus::WaitingForYou;
            let became_waiting = now_waiting && was != Some(SessionStatus::WaitingForYou);
            // Only alert on a real transition (not on a session we just discovered).
            if became_waiting && was.is_some() {
                if settings.sessions_notifications {
                    notify("Murmur", &format!("{} needs you", s.repo));
                }
                if settings.sessions_voice_alerts {
                    crate::tts::speak_with_settings(settings, &format!("{} needs you", s.repo));
                }
            }
        }
    }
}
