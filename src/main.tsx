import React from "react";
import ReactDOM from "react-dom/client";
import { platform } from "@tauri-apps/plugin-os";
import App from "./App";
import { applyThemeClass, useThemeStore } from "./stores/themeStore";

// Set platform before render so CSS can scope per-platform (e.g. scrollbar styles)
document.documentElement.dataset.platform = platform();

// Apply the persisted theme before first paint to avoid a flash of the wrong
// theme. Light is the default (see themeStore). The `.dark` class on <html>
// flips the App.css token set.
applyThemeClass(useThemeStore.getState().theme);

// Initialize i18n
import "./i18n";

// Initialize model store (loads models and sets up event listeners)
import { useModelStore } from "./stores/modelStore";
useModelStore.getState().initialize();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
