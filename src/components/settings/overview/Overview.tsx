import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Cpu, Volume2, Sparkles, History, Cog, Info } from "lucide-react";
import { commands } from "@/bindings";
import type { ElevenVoice } from "@/bindings";
import { useSettings } from "../../../hooks/useSettings";
import { useModelStore } from "../../../stores/modelStore";
import { useOsType } from "../../../hooks/useOsType";
import { useNavigate } from "../../../hooks/useNavigate";
import { formatKeyCombination } from "../../../lib/utils/keyboard";
import StratosMark from "../../icons/StratosMark";
import HandyTextLogo from "../../icons/HandyTextLogo";
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
  const [elVoices, setElVoices] = useState<ElevenVoice[]>([]);

  useEffect(() => {
    commands.listElevenlabsVoices().then((r) => {
      if (r.status === "ok") setElVoices(r.data);
    });
  }, []);

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
      | Array<{ id: string; name?: string }>
      | undefined) || [];
  const ppProvider =
    ppProviders.find((p) => p.id === ppProviderId)?.name ?? ppProviderId ?? "—";

  const mic = getSetting("selected_microphone") || t("overview.systemDefault");

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <div className="flex items-center gap-4 rounded-2xl border border-logo-primary/20 bg-gradient-to-br from-logo-primary/10 to-transparent p-5">
        <StratosMark
          variant="brand"
          outline
          size={56}
          className="shrink-0 drop-shadow-[0_6px_18px_rgba(22,184,163,0.30)]"
        />
        <div className="min-w-0">
          <HandyTextLogo width={96} />
          <p className="text-sm text-mid-gray mt-1">{t("overview.tagline")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <SummaryCard
          icon={StratosMark}
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
          <p className="text-sm text-mid-gray">{t("overview.advancedHint")}</p>
        </SummaryCard>

        <SummaryCard
          icon={Info}
          title={t("sidebar.about")}
          onOpen={() => go("about")}
        >
          <p className="text-sm text-mid-gray">{t("overview.aboutHint")}</p>
        </SummaryCard>
      </div>
    </div>
  );
};
