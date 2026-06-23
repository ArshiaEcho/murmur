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

/// Map a cwd to its Claude Code project dir name: every '/' and '.' becomes '-'.
pub fn cwd_to_project_dir(cwd: &str) -> String {
    cwd.chars()
        .map(|c| if c == '/' || c == '.' { '-' } else { c })
        .collect()
}

/// Most-recently-modified `*.jsonl` transcript, optionally scoped to a cwd's
/// project dir. `None`/empty scope walks all projects (the magical "auto" mode).
pub fn find_active_transcript(scope: Option<&str>) -> Option<PathBuf> {
    let root = claude_projects_dir()?;
    let search_root = match scope {
        Some(cwd) if !cwd.is_empty() => root.join(cwd_to_project_dir(cwd)),
        _ => root,
    };
    let mut best: Option<(std::time::SystemTime, PathBuf)> = None;
    let mut stack = vec![search_root];
    while let Some(dir) = stack.pop() {
        let entries = match fs::read_dir(&dir) {
            Ok(e) => e,
            Err(_) => continue,
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.extension().and_then(|e| e.to_str()) == Some("jsonl") {
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
    let content = fs::read_to_string(path).ok()?;
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
    let content = fs::read_to_string(path).unwrap_or_default();
    let mut cwd = String::new();
    let mut git_branch = String::new();
    let mut turns: Vec<Turn> = Vec::new();

    for line in content.lines() {
        let v: Value = match serde_json::from_str(line) {
            Ok(v) => v,
            Err(_) => continue,
        };
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
