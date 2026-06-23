//! Voice Agent Control Center: a file-drop queue of "agent runs" (finished Claude
//! Code session reports dropped by the Strat Stop hook / skill) that Strat watches,
//! lists in the Sessions dashboard, and speaks in the session's voice (Monoli by
//! default). See docs/voice-agent-control-center.md.

use serde::{Deserialize, Serialize};
use specta::Type;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::{fs, thread, time::Duration};
use tauri::{AppHandle, Manager};
use tauri_specta::Event;

#[derive(Clone, Debug, Serialize, Deserialize, Type, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentKind {
    SessionReport,
    VoiceTask,
}

#[derive(Clone, Debug, Serialize, Deserialize, Type, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum AgentStatus {
    Ready,
    Playing,
    Reviewed,
    Failed,
}

/// One agent run: a finished session reporting back, or a voice task dispatched.
#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct AgentRun {
    #[serde(default = "default_v")]
    pub v: u32,
    pub id: String,
    #[serde(default = "default_kind")]
    pub kind: AgentKind,
    #[serde(default)]
    pub session_id: Option<String>,
    #[serde(default)]
    pub cwd: Option<String>,
    #[serde(default)]
    pub repo: Option<String>,
    #[serde(default)]
    pub repo_dashed: Option<String>,
    #[serde(default)]
    pub git_branch: Option<String>,
    #[serde(default)]
    pub transcript_path: Option<String>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default)]
    pub next_steps: Vec<String>,
    #[serde(default)]
    pub speak_text: String,
    #[serde(default)]
    pub char_count: u32,
    #[serde(default = "default_status")]
    pub status: AgentStatus,
    #[serde(default)]
    pub source: Option<String>,
}

fn default_v() -> u32 {
    1
}
fn default_kind() -> AgentKind {
    AgentKind::SessionReport
}
fn default_status() -> AgentStatus {
    AgentStatus::Ready
}

/// Rust -> React event for the Sessions dashboard (kebab name: "agents-update").
#[derive(Clone, Debug, Serialize, Deserialize, Type, Event)]
#[serde(tag = "action", rename_all = "snake_case")]
pub enum AgentsUpdate {
    Added { run: AgentRun },
    Updated { run: AgentRun },
    Removed { id: String },
    Reset { runs: Vec<AgentRun> },
}

/// `~/.claude/strat`.
pub fn strat_dir() -> PathBuf {
    let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    PathBuf::from(home).join(".claude/strat")
}

/// Load persisted runs from done/ (most-recent first, capped) so the dashboard
/// survives app restarts.
fn load_runs(done_dir: &Path) -> Vec<AgentRun> {
    let mut files: Vec<PathBuf> = match fs::read_dir(done_dir) {
        Ok(e) => e
            .filter_map(|x| x.ok().map(|x| x.path()))
            .filter(|p| p.extension().map(|x| x == "json").unwrap_or(false))
            .collect(),
        Err(_) => return Vec::new(),
    };
    files.sort_by_key(|p| std::cmp::Reverse(fs::metadata(p).and_then(|m| m.modified()).ok()));
    let mut runs: Vec<AgentRun> = files
        .into_iter()
        .take(100)
        .filter_map(|p| fs::read_to_string(&p).ok())
        .filter_map(|t| serde_json::from_str::<AgentRun>(&t).ok())
        .collect();
    runs.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    runs
}

pub struct AgentQueueManager {
    app: AppHandle,
    runs: Mutex<Vec<AgentRun>>,
    queue_dir: PathBuf,
    done_dir: PathBuf,
}

impl AgentQueueManager {
    pub fn new(app: &AppHandle) -> Self {
        let base = strat_dir();
        let queue_dir = base.join("queue");
        let done_dir = base.join("done");
        let _ = fs::create_dir_all(&queue_dir);
        let _ = fs::create_dir_all(&done_dir);
        let _ = fs::create_dir_all(base.join("archive"));
        let _ = fs::create_dir_all(base.join(".state"));
        // Rehydrate past runs from done/ so the dashboard survives restarts.
        let runs = load_runs(&done_dir);
        Self {
            app: app.clone(),
            runs: Mutex::new(runs),
            queue_dir,
            done_dir,
        }
    }

    /// Hydrate the UI, then poll the queue dir on a background thread.
    pub fn start(self: &Arc<Self>) {
        let _ = AgentsUpdate::Reset {
            runs: self.runs.lock().unwrap().clone(),
        }
        .emit(&self.app);
        let me = self.clone();
        thread::spawn(move || loop {
            me.ingest_new();
            thread::sleep(Duration::from_millis(1500));
        });
    }

    fn ingest_new(&self) {
        let settings = crate::settings::get_settings(&self.app);
        if !settings.agents_enabled {
            return; // master switch off
        }
        let entries = match fs::read_dir(&self.queue_dir) {
            Ok(e) => e,
            Err(_) => return,
        };
        let mut files: Vec<PathBuf> = entries
            .filter_map(|e| e.ok().map(|e| e.path()))
            .filter(|p| {
                p.extension().map(|x| x == "json").unwrap_or(false)
                    && !p
                        .file_name()
                        .and_then(|n| n.to_str())
                        .map(|n| n.starts_with(".tmp-"))
                        .unwrap_or(false)
            })
            .collect();
        files.sort();
        for path in files {
            let text = match fs::read_to_string(&path) {
                Ok(t) => t,
                Err(_) => continue,
            };
            let run: AgentRun = match serde_json::from_str(&text) {
                Ok(r) => r,
                Err(e) => {
                    log::warn!("agents: bad queue entry {:?}: {e}", path);
                    let _ = self.move_to_done(&path);
                    continue;
                }
            };
            {
                let mut guard = self.runs.lock().unwrap();
                if guard.iter().any(|r| r.id == run.id) {
                    let _ = self.move_to_done(&path);
                    continue;
                }
                guard.insert(0, run.clone());
            }
            log::info!("agents: ingested run {} ({:?})", run.id, run.repo);
            let _ = self.move_to_done(&path);
            let _ = AgentsUpdate::Added { run: run.clone() }.emit(&self.app);
            // Auto-speak new reports if enabled and nothing is currently playing (FIFO-ish).
            if settings.agents_autospeak && !crate::tts::is_speaking() {
                self.play(&run.id);
            }
        }
    }

    fn move_to_done(&self, path: &Path) -> std::io::Result<()> {
        if let Some(name) = path.file_name() {
            fs::rename(path, self.done_dir.join(name))?;
        }
        Ok(())
    }

    pub fn snapshot(&self) -> Vec<AgentRun> {
        self.runs.lock().unwrap().clone()
    }

    /// Speak a run in its resolved voice and mark it reviewed.
    pub fn play(&self, id: &str) {
        let run = self.runs.lock().unwrap().iter().find(|r| r.id == id).cloned();
        let Some(run) = run else { return };
        let settings = crate::settings::get_settings(&self.app);
        let mut s = settings.clone();
        if let Some(v) = resolve_voice(&settings, &run) {
            s.tts_provider = crate::settings::TtsProvider::ElevenLabs;
            s.elevenlabs_voice_id = Some(v);
        }
        let text = if run.speak_text.trim().is_empty() {
            run.summary.clone().unwrap_or_default()
        } else {
            run.speak_text.clone()
        };
        if text.trim().is_empty() {
            self.set_status(id, AgentStatus::Reviewed);
            return;
        }
        self.set_status(id, AgentStatus::Playing);
        crate::tts::speak_with_settings(&s, &text);
        // Flip to Reviewed when playback actually finishes (background watcher).
        let app = self.app.clone();
        let id = id.to_string();
        thread::spawn(move || {
            let t0 = std::time::Instant::now();
            while !crate::tts::is_speaking() && t0.elapsed().as_secs() < 8 {
                thread::sleep(Duration::from_millis(200));
            }
            let t1 = std::time::Instant::now();
            while crate::tts::is_speaking() && t1.elapsed().as_secs() < 180 {
                thread::sleep(Duration::from_millis(300));
            }
            if let Some(mgr) = app.try_state::<Arc<AgentQueueManager>>() {
                mgr.set_status(&id, AgentStatus::Reviewed);
            }
        });
    }

    pub fn dismiss(&self, id: &str) {
        self.set_status(id, AgentStatus::Reviewed);
    }

    fn set_status(&self, id: &str, status: AgentStatus) {
        let updated = {
            let mut guard = self.runs.lock().unwrap();
            guard.iter_mut().find(|r| r.id == id).map(|r| {
                r.status = status;
                r.clone()
            })
        };
        if let Some(run) = updated {
            // Persist the new status so it survives restarts.
            if let Ok(text) = serde_json::to_string(&run) {
                let _ = fs::write(self.done_dir.join(format!("{}.json", run.id)), text);
            }
            let _ = AgentsUpdate::Updated { run }.emit(&self.app);
        }
    }

    pub fn delete(&self, id: &str) {
        self.runs.lock().unwrap().retain(|r| r.id != id);
        let _ = fs::remove_file(self.done_dir.join(format!("{}.json", id)));
        let _ = AgentsUpdate::Removed { id: id.to_string() }.emit(&self.app);
    }
}

/// Per-session voice -> per-repo voice -> global Read Aloud voice (Monoli).
fn resolve_voice(settings: &crate::settings::AppSettings, run: &AgentRun) -> Option<String> {
    let m = &settings.session_voices;
    run.session_id
        .as_ref()
        .and_then(|s| m.get(s))
        .cloned()
        .or_else(|| run.repo_dashed.as_ref().and_then(|r| m.get(r)).cloned())
        .or_else(|| settings.elevenlabs_voice_id.clone())
}
