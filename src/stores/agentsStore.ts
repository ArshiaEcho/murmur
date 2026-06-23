import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import { commands } from "@/bindings";
import type { AgentRun, AgentsUpdate } from "@/bindings";

interface AgentsStore {
  runs: AgentRun[];
  initialized: boolean;
  init: () => Promise<void>;
}

// Live queue of agent runs (finished Claude Code session reports). Hydrated from
// the Rust snapshot, then kept in sync via the "agents-update" event.
export const useAgentsStore = create<AgentsStore>((set, get) => ({
  runs: [],
  initialized: false,
  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });
    const snap = await commands.getAgentRuns();
    if (snap.status === "ok") set({ runs: snap.data });
    await listen<AgentsUpdate>("agents-update", (e) => {
      const m = e.payload;
      set((st) => {
        switch (m.action) {
          case "added":
            return { runs: [m.run, ...st.runs.filter((r) => r.id !== m.run.id)] };
          case "updated":
            return { runs: st.runs.map((r) => (r.id === m.run.id ? m.run : r)) };
          case "removed":
            return { runs: st.runs.filter((r) => r.id !== m.id) };
          case "reset":
            return { runs: m.runs };
          default:
            return {};
        }
      });
    });
  },
}));
