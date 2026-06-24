use crate::actions::ACTION_MAP;
use crate::managers::audio::AudioRecordingManager;
use log::{debug, error, warn};
use std::sync::mpsc::{self, RecvTimeoutError, Sender};
use std::sync::Arc;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager};

/// Ignore key-repeat / bounce presses closer together than this.
const DEBOUNCE: Duration = Duration::from_millis(30);
/// A press shorter than this counts as a "tap" (candidate for double-tap-to-lock);
/// anything longer is a deliberate hold and stops immediately on release.
const TAP_MAX: Duration = Duration::from_millis(250);
/// Maximum gap between the two taps of a double-tap.
const DOUBLE_TAP_GAP: Duration = Duration::from_millis(400);

/// Commands processed sequentially by the coordinator thread.
enum Command {
    Input {
        binding_id: String,
        hotkey_string: String,
        is_pressed: bool,
        push_to_talk: bool,
    },
    Cancel {
        recording_was_active: bool,
    },
    ProcessingFinished,
}

/// Pipeline lifecycle, owned exclusively by the coordinator thread.
enum Stage {
    Idle,
    /// Actively recording. `latched` means a double-tap locked it hands-free,
    /// so key release does not stop it (only the next tap or cancel does).
    Recording {
        binding_id: String,
        hotkey: String,
        latched: bool,
        press_at: Instant,
    },
    /// A short tap was released; keep recording briefly to see if a second tap
    /// arrives (double-tap to lock). If the deadline passes, stop and process.
    AwaitLock {
        binding_id: String,
        hotkey: String,
        deadline: Instant,
    },
    Processing,
}

/// Serialises all transcription lifecycle events through a single thread
/// to eliminate race conditions between keyboard shortcuts, signals, and
/// the async transcribe-paste pipeline.
pub struct TranscriptionCoordinator {
    tx: Sender<Command>,
}

pub fn is_transcribe_binding(id: &str) -> bool {
    id == "transcribe" || id == "transcribe_with_post_process"
}

impl TranscriptionCoordinator {
    pub fn new(app: AppHandle) -> Self {
        let (tx, rx) = mpsc::channel();

        thread::spawn(move || {
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                let mut stage = Stage::Idle;
                let mut last_press: Option<Instant> = None;

                loop {
                    // While waiting for a possible second tap, bound the wait by the deadline.
                    let cmd = match &stage {
                        Stage::AwaitLock { deadline, .. } => {
                            let timeout = deadline.saturating_duration_since(Instant::now());
                            match rx.recv_timeout(timeout) {
                                Ok(c) => Some(c),
                                Err(RecvTimeoutError::Timeout) => None,
                                Err(RecvTimeoutError::Disconnected) => break,
                            }
                        }
                        _ => match rx.recv() {
                            Ok(c) => Some(c),
                            Err(_) => break,
                        },
                    };

                    let Some(cmd) = cmd else {
                        // AwaitLock expired with no second tap: it was a single tap. Stop + process.
                        if let Stage::AwaitLock {
                            binding_id, hotkey, ..
                        } = std::mem::replace(&mut stage, Stage::Idle)
                        {
                            stop(&app, &mut stage, &binding_id, &hotkey);
                        }
                        continue;
                    };

                    match cmd {
                        Command::Input {
                            binding_id,
                            hotkey_string,
                            is_pressed,
                            push_to_talk,
                        } => {
                            if is_pressed {
                                let now = Instant::now();
                                if last_press.map_or(false, |t| now.duration_since(t) < DEBOUNCE) {
                                    debug!("Debounced press for '{binding_id}'");
                                    continue;
                                }
                                last_press = Some(now);
                            }

                            if push_to_talk {
                                handle_push_to_talk(
                                    &app,
                                    &mut stage,
                                    &binding_id,
                                    &hotkey_string,
                                    is_pressed,
                                );
                            } else if is_pressed {
                                // Toggle mode: press toggles recording on/off.
                                match &stage {
                                    Stage::Idle => start(
                                        &app,
                                        &mut stage,
                                        &binding_id,
                                        &hotkey_string,
                                        Instant::now(),
                                    ),
                                    Stage::Recording { binding_id: id, .. } if id == &binding_id => {
                                        stop(&app, &mut stage, &binding_id, &hotkey_string)
                                    }
                                    _ => debug!("Ignoring press for '{binding_id}': pipeline busy"),
                                }
                            }
                        }
                        Command::Cancel {
                            recording_was_active,
                        } => {
                            if !matches!(stage, Stage::Processing)
                                && (recording_was_active
                                    || matches!(
                                        stage,
                                        Stage::Recording { .. } | Stage::AwaitLock { .. }
                                    ))
                            {
                                stage = Stage::Idle;
                            }
                        }
                        Command::ProcessingFinished => {
                            stage = Stage::Idle;
                        }
                    }
                }
                debug!("Transcription coordinator exited");
            }));
            if let Err(e) = result {
                error!("Transcription coordinator panicked: {e:?}");
            }
        });

        Self { tx }
    }

    /// Send a keyboard/signal input event for a transcribe binding.
    /// For signal-based toggles, use `is_pressed: true` and `push_to_talk: false`.
    pub fn send_input(
        &self,
        binding_id: &str,
        hotkey_string: &str,
        is_pressed: bool,
        push_to_talk: bool,
    ) {
        if self
            .tx
            .send(Command::Input {
                binding_id: binding_id.to_string(),
                hotkey_string: hotkey_string.to_string(),
                is_pressed,
                push_to_talk,
            })
            .is_err()
        {
            warn!("Transcription coordinator channel closed");
        }
    }

    pub fn notify_cancel(&self, recording_was_active: bool) {
        if self
            .tx
            .send(Command::Cancel {
                recording_was_active,
            })
            .is_err()
        {
            warn!("Transcription coordinator channel closed");
        }
    }

    pub fn notify_processing_finished(&self) {
        if self.tx.send(Command::ProcessingFinished).is_err() {
            warn!("Transcription coordinator channel closed");
        }
    }
}

/// Push-to-talk with double-tap-to-lock.
fn handle_push_to_talk(
    app: &AppHandle,
    stage: &mut Stage,
    binding_id: &str,
    hotkey: &str,
    is_pressed: bool,
) {
    let now = Instant::now();

    if is_pressed {
        match stage {
            Stage::Idle => start(app, stage, binding_id, hotkey, now),
            // Second tap inside the window: lock the (still-running) recording hands-free.
            Stage::AwaitLock { binding_id: id, .. } => {
                let id = id.clone();
                debug!("Double-tap: locking recording for '{id}'");
                *stage = Stage::Recording {
                    binding_id: id,
                    hotkey: hotkey.to_string(),
                    latched: true,
                    press_at: now,
                };
            }
            // A press while locked stops + processes the recording.
            Stage::Recording {
                binding_id: id,
                latched: true,
                ..
            } => {
                let id = id.clone();
                debug!("Tap while locked: stopping '{id}'");
                stop(app, stage, &id, hotkey);
            }
            _ => debug!("Ignoring press for '{binding_id}': pipeline busy"),
        }
    } else {
        // Release.
        match stage {
            Stage::Recording {
                binding_id: id,
                hotkey: hk,
                latched: false,
                press_at,
            } if id == binding_id => {
                let id = id.clone();
                let hk = hk.clone();
                if now.duration_since(*press_at) >= TAP_MAX {
                    // A deliberate hold: stop immediately (keeps hold-to-talk instant).
                    stop(app, stage, &id, &hk);
                } else {
                    // A quick tap: keep recording and wait briefly for a second tap.
                    *stage = Stage::AwaitLock {
                        binding_id: id,
                        hotkey: hk,
                        deadline: now + DOUBLE_TAP_GAP,
                    };
                }
            }
            // Locked: releasing the key does nothing; recording continues hands-free.
            _ => {}
        }
    }
}

fn start(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey: &str, press_at: Instant) {
    let Some(action) = ACTION_MAP.get(binding_id) else {
        warn!("No action in ACTION_MAP for '{binding_id}'");
        return;
    };
    action.start(app, binding_id, hotkey);
    if app
        .try_state::<Arc<AudioRecordingManager>>()
        .map_or(false, |a| a.is_recording_binding(binding_id))
    {
        *stage = Stage::Recording {
            binding_id: binding_id.to_string(),
            hotkey: hotkey.to_string(),
            latched: false,
            press_at,
        };
    } else {
        debug!("Start for '{binding_id}' did not begin recording; staying idle");
        *stage = Stage::Idle;
    }
}

fn stop(app: &AppHandle, stage: &mut Stage, binding_id: &str, hotkey: &str) {
    let Some(action) = ACTION_MAP.get(binding_id) else {
        warn!("No action in ACTION_MAP for '{binding_id}'");
        return;
    };
    action.stop(app, binding_id, hotkey);
    *stage = Stage::Processing;
}
