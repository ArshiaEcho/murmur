import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { cx } from "./lib";

/**
 * One reusable, accessible popover primitive — used for both the SwatchPicker
 * and the Options menu (which were two hand-rolled scrims before).
 *
 * a11y:
 *  - trigger gets aria-haspopup + aria-expanded
 *  - panel gets the provided role (menu / listbox)
 *  - opening focuses the first focusable item in the panel
 *  - Escape closes and returns focus to the trigger
 *  - Arrow Up/Down move between focusable items (roving via .focus())
 *  - click-outside closes
 *  - reveal animation honored via mur-reveal (reduced-motion kills it in App.css)
 */
export const Popover: React.FC<{
  /** Render-prop for the trigger; receives the props it must spread + ref. */
  trigger: (args: {
    ref: React.RefCallback<HTMLElement>;
    onClick: () => void;
    "aria-haspopup": "menu" | "listbox";
    "aria-expanded": boolean;
  }) => React.ReactNode;
  children: React.ReactNode;
  role?: "menu" | "listbox";
  /** Panel positioning classes (e.g. "right-0 top-[calc(100%+6px)]"). */
  panelClassName?: string;
  panelStyle?: React.CSSProperties;
  ariaLabel?: string;
}> = ({ trigger, children, role = "menu", panelClassName, panelStyle, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  const items = useCallback(
    () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ),
    [],
  );

  // Focus the first item on open.
  useEffect(() => {
    if (open) items()[0]?.focus();
  }, [open, items]);

  // Click-outside closes (without stealing focus back, since the click moves it).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      close(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation(); // don't also close the drawer
      close(true);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const list = items();
      const idx = list.indexOf(document.activeElement as HTMLElement);
      const next =
        e.key === "ArrowDown"
          ? list[(idx + 1) % list.length]
          : list[(idx - 1 + list.length) % list.length];
      next?.focus();
    }
  };

  return (
    <div className="relative inline-flex">
      {trigger({
        ref: (el) => {
          triggerRef.current = el;
        },
        onClick: () => setOpen((o) => !o),
        "aria-haspopup": role,
        "aria-expanded": open,
      })}
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          role={role}
          aria-label={ariaLabel}
          onKeyDown={onPanelKeyDown}
          style={{
            animation: "mur-reveal 0.15s var(--ease-out-quint)",
            boxShadow: "var(--shadow)",
            ...panelStyle,
          }}
          className={cx(
            "absolute z-50 rounded-2xl border border-line-2 bg-card-2 p-1.5",
            panelClassName,
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};
