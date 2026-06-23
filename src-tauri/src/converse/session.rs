//! Reads the active Claude Code session transcript (append-only JSONL) to ground
//! Conversation Mode. Path scheme (verified on-machine):
//! `~/.claude/projects/<cwd with '/' and '.' replaced by '-'>/<session-uuid>.jsonl`.
//! Lines are JSON objects with `type` (user|assistant|system|...) and an
//! Anthropic-shaped `message.content[]` of text/thinking/tool_use/tool_result.

use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};

pub struct Turn {
    pub role: String, // "user" | "assistant"
    pub text: String, // flattened, compacted content
}

pub struct SessionContext {
    pub cwd: String,
    pub git_branch: String,
    pub turns: Vec<Turn>,
}

fn claude_projects_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    Some(PathBuf::from(home).join(".claude/projects"))
}

/// Most-recently-modified main-session `*.jsonl` transcript, optionally scoped to
/// a project DIR NAME (the dashed dir, e.g. "-Users-vabi-Dev-strat"). `None`/empty
/// scope walks all projects ("auto"). Skips background activity: subagent subtrees
/// (`subagents/`, `agent-*.jsonl`) and claude-mem observer projects — otherwise the
/// newest file is usually a subagent or claude-mem, not the user's coding session.
pub fn find_active_transcript(scope: Option<&str>) -> Option<PathBuf> {
    let root = claude_projects_dir()?;
    let search_root = match scope {
        Some(dir) if !dir.is_empty() => root.join(dir),
        _ => root.clone(),
    };
    let mut best: Option<(std::time::SystemTime, PathBuf)> = None;
    let mut stack = vec![search_root];
    while let Some(dir) = stack.pop() {
        let dname = dir.file_name().and_then(|n| n.to_str()).unwrap_or("");
        if dname == "subagents" || dir.to_string_lossy().contains("claude-mem") {
            continue;
        }
        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.extension().and_then(|e| e.to_str()) == Some("jsonl") {
                let fname = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
                if fname.starts_with("agent-") {
                    continue; // subagent transcript, not a main session
                }
                if let Ok(modified) = entry.metadata().and_then(|m| m.modified()) {
                    if best.as_ref().map_or(true, |(t, _)| modified > *t) {
                        best = Some((modified, path));
                    }
                }
            }
        }
    }
    best.map(|(_, p)| p)
}

/// Read the last `max_bytes` of a file as text, dropping the first (partial) line.
fn read_tail(path: &Path, max_bytes: u64) -> String {
    use std::io::{Read, Seek, SeekFrom};
    let mut file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return String::new(),
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

/// Read the first `max_bytes` of a file as text.
fn read_head(path: &Path, max_bytes: usize) -> String {
    use std::io::Read;
    let mut file = match fs::File::open(path) {
        Ok(f) => f,
        Err(_) => return String::new(),
    };
    let mut buf = vec![0u8; max_bytes];
    let n = file.read(&mut buf).unwrap_or(0);
    buf.truncate(n);
    String::from_utf8_lossy(&buf).into_owned()
}

/// List `(cwd, project_dir_name)` for every Claude Code project (for the scope picker).
pub fn list_projects() -> Vec<(String, String)> {
    let Some(root) = claude_projects_dir() else {
        return Vec::new();
    };
    let mut out = Vec::new();
    if let Ok(entries) = fs::read_dir(&root) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                if let Some(name) = entry.file_name().to_str() {
                    // Best-effort un-dash for display; the real cwd is read from a
                    // transcript when one is selected. Dashes are ambiguous, so we
                    // surface the most-recent transcript's cwd when available.
                    let cwd = newest_transcript_cwd(&entry.path()).unwrap_or_else(|| name.to_string());
                    out.push((cwd, name.to_string()));
                }
            }
        }
    }
    out
}

fn newest_transcript_cwd(dir: &Path) -> Option<String> {
    let mut best: Option<(std::time::SystemTime, PathBuf)> = None;
    for entry in fs::read_dir(dir).ok()?.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("jsonl") {
            if let Ok(modified) = entry.metadata().and_then(|m| m.modified()) {
                if best.as_ref().map_or(true, |(t, _)| modified > *t) {
                    best = Some((modified, path));
                }
            }
        }
    }
    let path = best?.1;
    let content = read_head(&path, 16384);
    for line in content.lines() {
        if let Ok(v) = serde_json::from_str::<Value>(line) {
            if let Some(cwd) = v.get("cwd").and_then(|c| c.as_str()) {
                return Some(cwd.to_string());
            }
        }
    }
    None
}

fn truncate_chars(s: &str, n: usize) -> String {
    let mut out: String = s.chars().take(n).collect();
    if s.chars().count() > n {
        out.push('…');
    }
    out
}

/// Flatten one Anthropic content block to a short line; drops `thinking`.
fn block_to_text(block: &Value) -> Option<String> {
    match block.get("type").and_then(|t| t.as_str())? {
        "text" => block
            .get("text")
            .and_then(|t| t.as_str())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty()),
        "tool_use" => {
            let name = block.get("name").and_then(|n| n.as_str()).unwrap_or("tool");
            let input = block
                .get("input")
                .map(|i| truncate_chars(&i.to_string(), 120))
                .unwrap_or_default();
            Some(format!("[tool: {} {}]", name, input))
        }
        "tool_result" => {
            let head = match block.get("content") {
                Some(Value::String(s)) => truncate_chars(s, 200),
                Some(Value::Array(arr)) => truncate_chars(
                    &arr.iter()
                        .filter_map(|b| b.get("text").and_then(|t| t.as_str()))
                        .collect::<Vec<_>>()
                        .join(" "),
                    200,
                ),
                _ => String::new(),
            };
            if head.is_empty() {
                None
            } else {
                Some(format!("[result: {}]", head))
            }
        }
        _ => None, // drop thinking + unknown blocks
    }
}

/// Read the transcript, keep the last `max_turns` user/assistant turns (bounded to
/// ~`max_bytes`), flattening tool calls and dropping chain-of-thought.
pub fn tail_turns(path: &Path, max_turns: usize, max_bytes: usize) -> SessionContext {
    // Read only the tail of the file (transcripts can be tens of MB).
    let content = read_tail(path, 256 * 1024);
    let mut cwd = String::new();
    let mut git_branch = String::new();
    let mut turns: Vec<Turn> = Vec::new();

    for line in content.lines() {
        let v: Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };
        // Skip subagent (sidechain) and injected meta/skill-context lines.
        if v.get("isSidechain").and_then(|b| b.as_bool()).unwrap_or(false) {
            continue;
        }
        if v.get("isMeta").and_then(|b| b.as_bool()).unwrap_or(false) {
            continue;
        }
        if let Some(c) = v.get("cwd").and_then(|c| c.as_str()) {
            cwd = c.to_string();
        }
        if let Some(b) = v.get("gitBranch").and_then(|b| b.as_str()) {
            git_branch = b.to_string();
        }
        let ty = v.get("type").and_then(|t| t.as_str()).unwrap_or("");
        if ty != "user" && ty != "assistant" {
            continue;
        }
        let text = match v.get("message").and_then(|m| m.get("content")) {
            Some(Value::String(s)) => s.trim().to_string(),
            Some(Value::Array(blocks)) => blocks
                .iter()
                .filter_map(block_to_text)
                .collect::<Vec<_>>()
                .join(" "),
            _ => String::new(),
        };
        let text = text.trim().to_string();
        if text.is_empty() {
            continue;
        }
        turns.push(Turn {
            role: ty.to_string(),
            text,
        });
    }

    if turns.len() > max_turns {
        turns = turns.split_off(turns.len() - max_turns);
    }
    // Bound total size from the most-recent end.
    let mut total = 0usize;
    let mut kept: Vec<Turn> = Vec::new();
    for turn in turns.into_iter().rev() {
        total += turn.text.len();
        kept.push(turn);
        if total > max_bytes {
            break;
        }
    }
    kept.reverse();

    SessionContext {
        cwd,
        git_branch,
        turns: kept,
    }
}
