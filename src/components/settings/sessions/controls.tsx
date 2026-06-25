import React from "react";
import { useTranslation } from "react-i18next";
import { Popover } from "./Popover";
import { PALETTE, cx } from "./lib";

// ── focus-visible ring used across every interactive element in Sessions ──────
// Pinned to ONE token: the signal teal (focus = --color-signal).
export const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-1 focus-visible:ring-offset-bg";

// ── pill button shared by the header controls ────────────────────────────────
export const PILL =
  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-line-2 bg-card text-text-2 text-xs font-medium transition-colors duration-150 hover:border-signal hover:text-text " +
  FOCUS_RING;

// ── color swatch picker (per-project color — the organizing spine) ───────────

export const SwatchPicker: React.FC<{ color: string; onPick: (c: string) => void }> = ({
  color,
  onPick,
}) => (
  <Popover
    role="listbox"
    ariaLabel="Project color"
    panelClassName="left-0 top-[calc(100%+6px)] w-[148px]"
    trigger={({ ref, onClick, ...aria }) => (
      <button
        type="button"
        ref={ref as React.RefCallback<HTMLButtonElement>}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        aria-label="Project color"
        title="Project color"
        className={cx("h-3.5 w-3.5 rounded-full ring-2 ring-line-2 shrink-0", FOCUS_RING)}
        style={{ backgroundColor: color }}
        {...aria}
      />
    )}
  >
    <div className="flex flex-wrap gap-1.5 p-1">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          role="option"
          aria-selected={c === color}
          aria-label={`Color ${c}`}
          onClick={(e) => {
            e.stopPropagation();
            onPick(c);
          }}
          className={cx(
            "h-5 w-5 rounded-full transition-transform duration-150 hover:scale-110",
            c === color ? "ring-2 ring-offset-1 ring-offset-card-2 ring-signal" : "",
            FOCUS_RING,
          )}
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  </Popover>
);

// ── options menu (rolling summaries / voice alerts / show background) ─────────

const CheckBox: React.FC<{ on: boolean }> = ({ on }) => (
  <span
    aria-hidden
    className={cx(
      "flex items-center justify-center w-[18px] h-[18px] rounded-md shrink-0 border transition-colors duration-150",
      on ? "border-signal bg-signal" : "border-line-2 bg-transparent",
    )}
  >
    {on && (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--on-signal)" strokeWidth={3.5}>
        <path d="M5 12l5 5 9-10" />
      </svg>
    )}
  </span>
);

export const OptionsMenu: React.FC<{
  rolling: boolean;
  voiceAlerts: boolean;
  hideBackground: boolean;
  onRolling: () => void;
  onVoiceAlerts: () => void;
  onHideBackground: () => void;
}> = ({ rolling, voiceAlerts, hideBackground, onRolling, onVoiceAlerts, onHideBackground }) => {
  const { t } = useTranslation();
  const row =
    "flex items-center gap-3 w-full px-2.5 py-2.5 rounded-[10px] text-left transition-colors duration-150 hover:bg-card-hover " +
    FOCUS_RING;
  const label = "text-[12.5px] text-text";
  return (
    <Popover
      role="menu"
      ariaLabel="View options"
      panelClassName="right-0 top-[calc(100%+6px)] w-[248px]"
      trigger={({ ref, onClick, ...aria }) => (
        <button
          type="button"
          ref={ref as React.RefCallback<HTMLButtonElement>}
          onClick={onClick}
          title="View options"
          className={PILL}
          {...aria}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
            <line x1="4" y1="8" x2="20" y2="8" />
            <circle cx="9" cy="8" r="2.3" fill="var(--card)" />
            <line x1="4" y1="16" x2="20" y2="16" />
            <circle cx="15" cy="16" r="2.3" fill="var(--card)" />
          </svg>
          {t("sessions.options")}
        </button>
      )}
    >
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={rolling}
        onClick={onRolling}
        className={row}
      >
        <CheckBox on={rolling} />
        <span className={label}>{t("sessions.rollingSummaries")}</span>
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={voiceAlerts}
        onClick={onVoiceAlerts}
        className={row}
      >
        <CheckBox on={voiceAlerts} />
        <span className={label}>{t("sessions.voiceAlerts")}</span>
      </button>
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={!hideBackground}
        onClick={onHideBackground}
        className={row}
      >
        <CheckBox on={!hideBackground} />
        <span className={label}>{t("sessions.showBackground")}</span>
      </button>
    </Popover>
  );
};
