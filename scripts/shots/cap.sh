#!/usr/bin/env bash
# Murmur screenshot helpers. Source me: `source cap.sh`
# Requires: Screen Recording permission granted to the host app (VS Code) AND Accessibility (already granted).
# Window geometry the runbook assumes: (100,33) 1280x860 on the PRIMARY display.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
OUT="$HOME/Dev/strat/docs/design-handoff/screenshots"
PROC="handy"   # System Events process name (CGWindow owner shows as "Murmur")

winid() { swift "$HERE/winlist.swift" | grep -i "name=Murmur" | sed -n 's/^id=\([0-9]*\).*/\1/p' | head -1; }

setwin() { # bring to front + place at known geometry
  osascript -e "tell application \"System Events\" to tell process \"$PROC\"
    set frontmost to true
    delay 0.3
    set w to first window whose name is \"Murmur\"
    set position of w to {100, 33}
    set size of w to {1280, 860}" >/dev/null 2>&1
  sleep 0.4
}

theme() { # theme light | dark
  local mode="$1"; local v="true"; [ "$mode" = "light" ] && v="false"
  osascript -e "tell application \"System Events\" to tell appearance preferences to set dark mode to $v" >/dev/null 2>&1
  sleep 0.6
}

click() { swift "$HERE/click.swift" "$1" "$2" >/dev/null; sleep 0.7; }

shot() { # shot <filename-no-ext>   -> captures the Murmur window (no shadow) to OUT/
  local id; id="$(winid)"
  [ -z "$id" ] && { echo "!! no Murmur window id"; return 1; }
  osascript -e "tell application \"System Events\" to tell process \"$PROC\" to set frontmost to true" >/dev/null 2>&1
  sleep 0.3
  screencapture -o -l "$id" "$OUT/$1.png" && echo "  saved $1.png"
}

overlayid() { swift "$HERE/winlist.swift" | grep -i "name=Recording" | sed -n 's/^id=\([0-9]*\).*/\1/p' | head -1; }

permcheck() { # returns 0 if Screen Recording works
  local t; t="$(mktemp /tmp/permXXXX.png)"
  if screencapture -x "$t" >/dev/null 2>&1 && [ -s "$t" ]; then echo "Screen Recording: OK"; rm -f "$t"; return 0
  else echo "Screen Recording: BLOCKED (grant VS Code + relaunch)"; rm -f "$t" 2>/dev/null; return 1; fi
}
echo "loaded cap.sh — fns: permcheck, winid, setwin, theme light|dark, click x y, shot name"
