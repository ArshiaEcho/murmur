//! Commands for the Voice Agent Control Center: install the Claude Code Stop hook
//! + skill into a repo, and drive the in-app queue (list / play / dismiss / delete).

use crate::agents::{AgentQueueManager, AgentRun};
use serde_json::{json, Value};
use std::path::PathBuf;
use std::sync::Arc;
use std::{fs, io::Write};
use tauri::{AppHandle, Manager};

/// The Stop-hook command string we merge into a repo's .claude/settings.json.
/// Idempotency keys off this exact string.
const STOP_CMD: &str = "python3 \"$HOME/.claude/strat/strat-report.py\"";

/// The Stop hook: reads the hook payload on stdin, distills the session's final
/// assistant summary, writes a queue entry atomically. Idempotent + loop-safe.
const HOOK_PY: &str = r#"#!/usr/bin/env python3
import sys, os, json, re, uuid, tempfile, hashlib
from datetime import datetime, timezone

STRAT = os.path.join(os.path.expanduser("~"), ".claude", "strat")
QUEUE = os.path.join(STRAT, "queue")
STATE = os.path.join(STRAT, ".state")
os.makedirs(QUEUE, exist_ok=True)
os.makedirs(STATE, exist_ok=True)

raw = sys.stdin.read()
try:
    hook = json.loads(raw)
except Exception:
    sys.exit(0)

if hook.get("stop_hook_active") is True:
    sys.exit(0)

session_id = hook.get("session_id") or ""
cwd = hook.get("cwd") or ""
transcript_path = hook.get("transcript_path") or ""
if not transcript_path or not os.path.isfile(transcript_path):
    sys.exit(0)

last_text, git_branch = None, None
try:
    with open(transcript_path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                o = json.loads(line)
            except Exception:
                continue
            if o.get("type") != "assistant":
                continue
            content = (o.get("message") or {}).get("content")
            text = ""
            if isinstance(content, list):
                for c in content:
                    if isinstance(c, dict) and c.get("type") == "text":
                        text += c.get("text", "")
            elif isinstance(content, str):
                text = content
            if text.strip():
                last_text = text.strip()
                git_branch = o.get("gitBranch") or git_branch
except Exception:
    sys.exit(0)

if not last_text:
    sys.exit(0)

fp = hashlib.sha256((session_id + "\x00" + last_text).encode()).hexdigest()
statef = os.path.join(STATE, (session_id or "last") + ".last")
try:
    if open(statef).read().strip() == fp:
        sys.exit(0)
except FileNotFoundError:
    pass

def clean(t):
    t = re.sub(r"```.*?```", " code omitted ", t, flags=re.S)
    t = re.sub(r"`([^`]*)`", r"\1", t)
    t = re.sub(r"^#{1,6}\s*", "", t, flags=re.M)
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1", t)
    t = re.sub(r"^\s*[-*]\s+", "", t, flags=re.M)
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
    t = re.sub(r"https?://\S+", "a link", t)
    t = re.sub(r"(sk-[A-Za-z0-9_\-]{12,}|xi-[A-Za-z0-9]{12,})", "a key", t)
    t = re.sub(r"[ \t]+", " ", t)
    return t.strip()

spoken = clean(last_text)
if len(spoken) > 1200:
    spoken = spoken[:1200].rsplit(" ", 1)[0] + " ... open Strat for the full report."

repo = os.path.basename(cwd.rstrip("/")) or "session"
repo_dashed = re.sub(r"[^A-Za-z0-9]", "-", cwd)
title = (spoken.splitlines()[0] if spoken else repo)[:80]
run = {
  "v": 1, "id": str(uuid.uuid4()), "kind": "session_report",
  "session_id": session_id, "cwd": cwd, "repo": repo, "repo_dashed": repo_dashed,
  "git_branch": git_branch, "transcript_path": transcript_path,
  "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
  "title": title, "summary": spoken, "next_steps": [],
  "speak_text": "Here's what we did on " + repo + ". " + spoken,
  "char_count": len(spoken), "status": "ready", "source": "stop_hook",
}
fd, tmp = tempfile.mkstemp(dir=QUEUE, prefix=".tmp-", suffix=".json")
with os.fdopen(fd, "w", encoding="utf-8") as wf:
    json.dump(run, wf, ensure_ascii=False)
os.replace(tmp, os.path.join(QUEUE, run["id"] + ".json"))
with open(statef, "w") as sf:
    sf.write(fp)
"#;

const SKILL_MD: &str = r#"---
name: strat-report
description: Use at the end of a work session, or when the user says "report to strat", "strat report", "push to strat", "read this back", or "tell strat what we did". Delivers this session's end-of-work summary (what we did / what's next) to the Strat macOS app's Agent queue so it is read back aloud in this session's assigned voice. Also fires automatically via the Stop hook; invoke explicitly to push a clean spoken summary mid-session.
---

# Strat Report — push a spoken session summary to the Strat app

You are reporting this session's outcome to Strat (the macOS voice app). Strat reads your
summary aloud and shows it in the Agents dashboard, labeled by this repo. Write for the ear.

## How to write the summary (voice-first)
1. Lead with the headline: one sentence on what changed / what now works.
2. 2 to 4 sentences of detail, plain language, no code, no file paths read aloud.
3. "What's next": 1 to 3 concrete next actions.
4. Under ~150 words. No markdown, no bullets, no backticks.

## Steps
1. Compose the summary per the rules above.
2. Push it (pass the summary on stdin):
   ```bash
   bash "$HOME/.claude/skills/strat-report/push.sh" <<'SUMMARY'
   <your voice-first summary here>
   SUMMARY
   ```
3. Tell the user in one line that it was pushed and will be read back.

## Notes
- The helper writes a queue entry to ~/.claude/strat/queue/; Strat owns the voice.
- Do not include secrets or full file contents; the summary is spoken aloud and stored.
"#;

const PUSH_SH: &str = r#"#!/usr/bin/env bash
set -euo pipefail
QUEUE_DIR="${HOME}/.claude/strat/queue"; mkdir -p "$QUEUE_DIR"
SUMMARY="$(cat || true)"; [ -z "${SUMMARY// }" ] && { echo "strat-report: empty summary"; exit 0; }
CWD="${CLAUDE_PROJECT_DIR:-$PWD}"
SUMMARY="$SUMMARY" CWD="$CWD" QUEUE_DIR="$QUEUE_DIR" python3 - <<'PY'
import sys, os, json, re, uuid, tempfile
from datetime import datetime, timezone
queue_dir = os.environ["QUEUE_DIR"]; cwd = os.environ["CWD"]
spoken = os.environ["SUMMARY"].strip()
repo = os.path.basename(cwd.rstrip("/")) or "session"
repo_dashed = re.sub(r"[^A-Za-z0-9]", "-", cwd)
title = (spoken.splitlines()[0] if spoken else repo)[:80]
run = {"v":1,"id":str(uuid.uuid4()),"kind":"session_report",
  "session_id":os.environ.get("CLAUDE_SESSION_ID"),"cwd":cwd,"repo":repo,
  "repo_dashed":repo_dashed,"git_branch":None,"transcript_path":None,
  "created_at":datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
  "title":title,"summary":spoken,"next_steps":[],
  "speak_text":"Here's what we did on "+repo+". "+spoken,
  "char_count":len(spoken),"status":"ready","source":"skill"}
fd, tmp = tempfile.mkstemp(dir=queue_dir, prefix=".tmp-", suffix=".json")
with os.fdopen(fd,"w",encoding="utf-8") as f: json.dump(run,f,ensure_ascii=False)
os.replace(tmp, os.path.join(queue_dir, run["id"]+".json"))
print("strat-report: pushed to Strat queue")
PY
"#;

fn home() -> Result<PathBuf, String> {
    std::env::var("HOME")
        .map(PathBuf::from)
        .map_err(|_| "HOME not set".to_string())
}

#[cfg(unix)]
fn write_executable(path: &PathBuf, contents: &str) -> Result<(), String> {
    use std::os::unix::fs::OpenOptionsExt;
    let mut f = fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(0o755)
        .open(path)
        .map_err(|e| e.to_string())?;
    f.write_all(contents.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg(not(unix))]
fn write_executable(path: &PathBuf, contents: &str) -> Result<(), String> {
    fs::write(path, contents).map_err(|e| e.to_string())
}

/// Ensure ~/.claude/strat scaffolding + the hook and skill scripts exist.
fn ensure_scaffolding() -> Result<(), String> {
    let strat = crate::agents::strat_dir();
    for sub in ["queue", "done", "archive", ".state"] {
        fs::create_dir_all(strat.join(sub)).map_err(|e| e.to_string())?;
    }
    write_executable(&strat.join("strat-report.py"), HOOK_PY)?;

    let skill_dir = home()?.join(".claude/skills/strat-report");
    fs::create_dir_all(&skill_dir).map_err(|e| e.to_string())?;
    fs::write(skill_dir.join("SKILL.md"), SKILL_MD).map_err(|e| e.to_string())?;
    write_executable(&skill_dir.join("push.sh"), PUSH_SH)?;
    Ok(())
}

/// Install the Stop hook + skill, and idempotently merge the hook into the target
/// repo's .claude/settings.json (never clobbering existing config).
#[tauri::command]
#[specta::specta]
pub fn install_strat_reporter(repo_path: String) -> Result<String, String> {
    ensure_scaffolding()?;

    let settings_path = PathBuf::from(&repo_path).join(".claude").join("settings.json");
    fs::create_dir_all(settings_path.parent().unwrap()).map_err(|e| e.to_string())?;

    let mut root: Value = match fs::read_to_string(&settings_path) {
        Ok(s) if !s.trim().is_empty() => {
            serde_json::from_str(&s).map_err(|e| format!("existing settings.json is invalid: {e}"))?
        }
        _ => json!({}),
    };
    let obj = root
        .as_object_mut()
        .ok_or("settings.json is not a JSON object")?;
    let hooks = obj.entry("hooks").or_insert(json!({}));
    let stop = hooks
        .as_object_mut()
        .ok_or("hooks is not an object")?
        .entry("Stop")
        .or_insert(json!([]));
    let arr = stop.as_array_mut().ok_or("hooks.Stop is not an array")?;

    let already = arr.iter().any(|grp| {
        grp.get("hooks")
            .and_then(|h| h.as_array())
            .map_or(false, |hs| {
                hs.iter()
                    .any(|h| h.get("command").and_then(|c| c.as_str()) == Some(STOP_CMD))
            })
    });
    if !already {
        arr.push(json!({ "hooks": [ { "type": "command", "command": STOP_CMD, "timeout": 15 } ] }));
        fs::write(&settings_path, serde_json::to_string_pretty(&root).unwrap())
            .map_err(|e| e.to_string())?;
    }
    Ok(if already {
        "Already installed for this repo.".to_string()
    } else {
        format!("Installed. Sessions in {} will now report to Strat.", repo_path)
    })
}

fn manager(app: &AppHandle) -> Result<Arc<AgentQueueManager>, String> {
    app.try_state::<Arc<AgentQueueManager>>()
        .map(|s| s.inner().clone())
        .ok_or("Agent queue not initialized".to_string())
}

#[tauri::command]
#[specta::specta]
pub fn get_agent_runs(app: AppHandle) -> Result<Vec<AgentRun>, String> {
    Ok(manager(&app)?.snapshot())
}

#[tauri::command]
#[specta::specta]
pub fn play_agent_run(app: AppHandle, id: String) -> Result<(), String> {
    manager(&app)?.play(&id);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn dismiss_agent_run(app: AppHandle, id: String) -> Result<(), String> {
    manager(&app)?.dismiss(&id);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn delete_agent_run(app: AppHandle, id: String) -> Result<(), String> {
    manager(&app)?.delete(&id);
    Ok(())
}
