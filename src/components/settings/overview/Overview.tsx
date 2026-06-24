import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cpu, Volume2, Sparkles, History, Cog, Info } from "lucide-react";
import { commands } from "@/bindings";
import type { ElevenVoice } from "@/bindings";
import { useSettings } from "../../../hooks/useSettings";
import { useModelStore } from "../../../stores/modelStore";
import { useAgentsStore } from "../../../stores/agentsStore";
import { useOsType } from "../../../hooks/useOsType";
import { useNavigate } from "../../../hooks/useNavigate";
import { formatKeyCombination } from "../../../lib/utils/keyboard";
import StratLogo from "../../icons/StratLogo";
import { SummaryCard } from "./SummaryCard";
import { KeyChip, FieldRow } from "./fields";

// The Overview home: a glanceable control center. Read-only summary cards that
// deep-link into each section. All data reuses existing settings/stores/commands.
export const Overview: React.FC = () => {
  const { t } = useTranslation();
  const go = useNavigate();
  const osType = useOsType();
  const { getSetting } = useSettings();
  const { currentModel, models, downloadingModels } = useModelStore();
  const agentRuns = useAgentsStore((s) => s.runs);
  const initAgents = useAgentsStore((s) => s.init);
  const [elVoices, setElVoices] = useState<ElevenVoice[]>([]);

  useEffect(() => {
    initAgents();
    commands.listElevenlabsVoices().then((r) => {
      if (r.status === "ok") setElVoices(r.data);
    });
  }, [initAgents]);

  const agentsReady = agentRuns.filter((r) => r.status === "ready").length;
  const agentSessions = new Set(agentRuns.map((r) => r.repo)).size;

  const bindings =
    (getSetting("bindings") as
      | Record<string, { current_binding?: string }>
      | undefined) || {};
  const fmt = (id: string) =>
    bindings[id]?.current_binding
      ? formatKeyCombination(bindings[id]!.current_binding!, osType)
      : "—";

  const activeModel =
    models.find((m) => m.id === currentModel)?.name ?? t("overview.noModel");
  const modelStatus = downloadingModels[currentModel]
    ? "loading"
    : currentModel
      ? "active"
      : "idle";

  const provider = getSetting("tts_provider") ?? "say";
  const voiceName =
    provider === "eleven_labs"
      ? (elVoices.find((v) => v.voice_id === getSetting("elevenlabs_voice_id"))
          ?.name ?? "—")
      : t("overview.systemVoice");

  const ppOn = !!getSetting("post_process_enabled");
  const ppProviderId = getSetting("post_process_provider_id");
  const ppProviders =
    (getSetting("post_process_providers") as
      | Array<{ id: string; label?: string }>
      | undefined) || [];
  const ppProvider =
    ppProviders.find((p) => p.id === ppProviderId)?.label ?? ppProviderId ?? "—";

  const mic = getSetting("selected_microphone") || t("overview.systemDefault");

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <h1 className="m-0 text-[28px] font-semibold tracking-[-0.5px] text-text">
          {t("sidebar.overview")}
        </h1>
        <span className="pb-[5px] font-mono text-[12.5px] font-medium text-text-3">
          {t("overview.tagline")}
        </span>
      </div>

      {/* HERO — inverted accent surface, deep-links into Sessions */}
      <button
        type="button"
        onClick={() => go("sessions")}
        aria-label={`${t("sidebar.sessions")}: ${agentsReady} ${t("overview.ready")}, ${agentSessions} ${t("overview.sessions")}`}
        className="relative mb-[13px] w-full overflow-hidden rounded-[20px] bg-accent-surface px-[26px] py-6 text-left text-accent-on transition-[filter] duration-150 [transition-timing-function:var(--ease-out-quint)] hover:brightness-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        <div className="flex flex-wrap items-start gap-[18px]">
          <div className="min-w-[200px] flex-1">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[1.5px] opacity-[.62]">
              {t("sidebar.sessions")}
            </div>
            <div className="mt-2.5 flex flex-wrap items-end gap-[13px]">
              <span className="font-sans text-[58px] font-semibold leading-[0.9] tracking-[-2.5px] tnum">
                {agentsReady}
              </span>
              <span className="pb-2 text-sm font-medium opacity-[.62]">
                {t("overview.agentsNeedYou")} · {agentSessions}{" "}
                {t("overview.live")}
              </span>
            </div>
          </div>
          <div className="flex max-w-[200px] flex-wrap gap-[7px] self-center">
            {agentRuns.map((r) => (
              <span
                key={r.id}
                className="h-[13px] w-[13px] rounded-full bg-accent-on"
                style={{ opacity: r.status === "ready" ? 1 : 0.22 }}
              />
            ))}
          </div>
        </div>
      </button>

      {/* Summary cards — each deep-links into its settings section */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-3">
        <SummaryCard
          icon={StratLogo}
          title={t("sidebar.general")}
          onOpen={() => go("general")}
        >
          <FieldRow
            label={t("overview.hotkey")}
            value={<KeyChip keys={fmt("transcribe")} />}
          />
          <FieldRow label={t("overview.mic")} value={mic} />
        </SummaryCard>

        <SummaryCard
          icon={Cpu}
          title={t("sidebar.models")}
          status={modelStatus}
          onOpen={() => go("models")}
        >
          <FieldRow label={t("overview.active")} value={activeModel} />
        </SummaryCard>

        <SummaryCard
          icon={Volume2}
          title={t("sidebar.readAloud")}
          onOpen={() => go("readAloud")}
        >
          <FieldRow label={t("overview.voice")} value={voiceName} />
          <FieldRow
            label={t("overview.hotkey")}
            value={<KeyChip keys={fmt("read_selection")} />}
          />
        </SummaryCard>

        <SummaryCard
          icon={Sparkles}
          title={t("sidebar.postProcessing")}
          status={ppOn ? "on" : "off"}
          onOpen={() => go("postprocessing")}
        >
          <FieldRow
            label={t("overview.status")}
            value={ppOn ? t("overview.on") : t("overview.off")}
          />
          <FieldRow label={t("overview.provider")} value={ppProvider} />
        </SummaryCard>

        <SummaryCard
          icon={History}
          title={t("sidebar.history")}
          onOpen={() => go("history")}
        >
          <FieldRow
            label={t("overview.limit")}
            value={String(getSetting("history_limit") ?? "—")}
          />
        </SummaryCard>

        <SummaryCard
          icon={Cog}
          title={t("sidebar.advanced")}
          onOpen={() => go("advanced")}
        >
          <p className="text-xs font-medium text-text-3">
            {t("overview.advancedHint")}
          </p>
        </SummaryCard>

        <SummaryCard
          icon={Info}
          title={t("sidebar.about")}
          onOpen={() => go("about")}
        >
          <p className="text-xs font-medium text-text-3">
            {t("overview.aboutHint")}
          </p>
        </SummaryCard>
      </div>
    </div>
  );
};
