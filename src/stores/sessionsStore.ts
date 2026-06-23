import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { commands } from "@/bindings";
import type { SessionInfo, SessionsUpdate } from "@/bindings";

interface SessionsStore {
  sessions: SessionInfo[];
  selectedId: string | null;
  initialized: boolean;
  init: () => Promise<void>;
  select: (id: string | null) => void;
}

// Live registry of Claude Code sessions. Hydrated from the Rust snapshot, then
// kept in sync via the "sessions-update" reset event (emitted every poll tick).
export const useSessionsStore = create<SessionsStore>((set, get) => ({
  sessions: [],
  selectedId: null,
  initialized: false,
  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });
    const snap = await commands.getSessions();
    if (snap.status === "ok") set({ sessions: snap.data });
    await listen<SessionsUpdate>("sessions-update", (e) => {
      const m = e.payload;
      if (m.action === "reset") set({ sessions: m.sessions });
    });
  },
  select: (id) => set({ selectedId: id }),
}));
