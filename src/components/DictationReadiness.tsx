import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type } from "@tauri-apps/plugin-os";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import {
  checkAccessibilityPermission,
  requestAccessibilityPermission,
  checkInputMonitoringPermission,
  requestInputMonitoringPermission,
  checkMicrophonePermission,
  requestMicrophonePermission,
} from "tauri-plugin-macos-permissions-api";
import { commands } from "@/bindings";
import { useNavigate } from "../hooks/useNavigate";

type Status = boolean | null; // null = still checking

interface ReadinessItem {
  key: "accessibility" | "inputMonitoring" | "microphone" | "model";
  ok: Status;
  grant?: () => Promise<unknown>;
  fix?: () => void;
}

/**
 * Dictation readiness checklist (VoiceBox A6): the permissions + model Murmur
 * needs to hear you and type for you, each with an inline Grant action that deep
 * links to System Settings. Re-checks on window focus so granting in Settings and
 * returning updates the list. macOS shows the permission rows; every platform
 * shows the model row.
 */
export const DictationReadiness: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isMac = type() === "macos";

  const [acc, setAcc] = useState<Status>(null);
  const [inputMon, setInputMon] = useState<Status>(null);
  const [mic, setMic] = useState<Status>(null);
  const [model, setModel] = useState<Status>(null);
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      if (isMac) {
        const [a, i, m] = await Promise.all([
          checkAccessibilityPermission().catch(() => false),
          checkInputMonitoringPermission().catch(() => false),
          checkMicrophonePermission().catch(() => false),
        ]);
        setAcc(a);
        setInputMon(i);
        setMic(m);
      }
      try {
        const r = await commands.hasAnyModelsAvailable();
        setModel(r.status === "ok" && !!r.data);
      } catch {
        setModel(false);
      }
    } finally {
      setChecking(false);
    }
  }, [isMac]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // The user grants permissions in System Settings (another app), then returns —
  // re-check on focus so the list reflects reality without a manual refresh.
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const items: ReadinessItem[] = [
    ...(isMac
      ? ([
          { key: "accessibility", ok: acc, grant: requestAccessibilityPermission },
          { key: "inputMonitoring", ok: inputMon, grant: requestInputMonitoringPermission },
          { key: "microphone", ok: mic, grant: requestMicrophonePermission },
        ] as ReadinessItem[])
      : []),
    { key: "model", ok: model, fix: () => navigate("models") },
  ];

  // Treat "still checking" (null) as not-ready so the header can't briefly flash
  // "ready" before the permission checks settle.
  const remaining = items.filter((i) => i.ok !== true).length;
  const allReady = remaining === 0;

  const onGrant = async (item: ReadinessItem) => {
    if (item.grant) {
      try {
        await item.grant();
      } catch {
        /* user dismissed the prompt; focus re-check will catch a later grant */
      }
      window.setTimeout(refresh, 800);
    } else if (item.fix) {
      item.fix();
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-[17px] py-[14px] border-b border-line">
        <span className={allReady ? "text-ok" : "text-warn"}>
          {allReady ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
        </span>
        <div className="min-w-0">
          <h3 className="text-[13.5px] font-medium text-text">
            {t("readiness.title")}
          </h3>
          <p className="text-xs text-text-3">
            {allReady
              ? t("readiness.ready")
              : t("readiness.remaining", { count: remaining })}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          title={t("readiness.recheck")}
          aria-label={t("readiness.recheck")}
          className="ms-auto flex items-center justify-center w-8 h-8 rounded-full text-text-3 transition-colors duration-150 hover:text-signal hover:bg-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <RefreshCw size={14} className={checking ? "animate-spin" : ""} />
        </button>
      </div>
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3 px-[17px] py-3">
            <span className={item.ok ? "text-ok" : "text-text-3"}>
              {item.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-text">
                {t(`readiness.items.${item.key}.label`)}
              </div>
              <div className="text-[11.5px] text-text-3">
                {t(`readiness.items.${item.key}.desc`)}
              </div>
            </div>
            {item.ok === false && (
              <button
                type="button"
                onClick={() => onGrant(item)}
                className="shrink-0 rounded-full border border-line-2 px-3 py-1 text-[12px] font-semibold text-signal transition-colors duration-150 hover:border-signal hover:bg-signal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              >
                {item.grant ? t("readiness.grant") : t("readiness.install")}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
