import { create } from "zustand";

/**
 * Sidebar layout state, frontend-only (localStorage), same pattern as themeStore.
 *
 * - `expanded`: the preferred width when the rail is pinned — wide (icons + text)
 *   vs the narrow icon rail.
 * - `locked`: when true the rail is pinned to `expanded` and sits in-flow (content
 *   shifts with it). When false the rail collapses to the icon strip and expands as
 *   a hover overlay (content does not jump) — the "unlocked / peek" behavior.
 */
const STORAGE_KEY = "murmur-sidebar";

interface Persisted {
  expanded: boolean;
  locked: boolean;
}

function readStored(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const v = JSON.parse(raw);
      return {
        expanded: typeof v.expanded === "boolean" ? v.expanded : true,
        locked: typeof v.locked === "boolean" ? v.locked : true,
      };
    }
  } catch {
    // ignore malformed / unavailable storage
  }
  return { expanded: true, locked: true };
}

interface SidebarStore extends Persisted {
  setExpanded: (expanded: boolean) => void;
  toggleExpanded: () => void;
  setLocked: (locked: boolean) => void;
  toggleLocked: () => void;
}

function persist(state: Persisted) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ expanded: state.expanded, locked: state.locked }),
    );
  } catch {
    // best effort
  }
}

export const useSidebarStore = create<SidebarStore>((set, get) => ({
  ...readStored(),
  setExpanded: (expanded) => {
    set({ expanded });
    persist(get());
  },
  toggleExpanded: () => {
    set({ expanded: !get().expanded });
    persist(get());
  },
  setLocked: (locked) => {
    set({ locked });
    persist(get());
  },
  toggleLocked: () => {
    set({ locked: !get().locked });
    persist(get());
  },
}));
