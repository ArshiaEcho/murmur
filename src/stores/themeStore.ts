import { create } from "zustand";

/**
 * Light/dark theme, frontend-only.
 *
 * Deliberately NOT routed through the Rust AppSettings/bindings path: a theme
 * is a pure UI preference, and touching bindings.ts triggers the specta-regen
 * landmine that breaks tsc. We persist to localStorage and drive the `.dark`
 * class on <html>, mirroring VoiceBox's approach. App.css tokens are scoped to
 * `:root` (light, default) and `:root.dark`, so flipping the class reskins the
 * whole app instantly.
 */
export type Theme = "light" | "dark";

const STORAGE_KEY = "murmur-theme";

function readStored(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    // localStorage may be unavailable (private mode / hardened webview)
  }
  return "light"; // light-first: Arshia's explicit priority
}

/** Apply the theme to <html> (class for CSS, data attr for any JS hooks). */
export function applyThemeClass(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
}

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: readStored(),
  setTheme: (theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // best-effort persistence
    }
    applyThemeClass(theme);
    set({ theme });
  },
  toggleTheme: () => get().setTheme(get().theme === "dark" ? "light" : "dark"),
}));
