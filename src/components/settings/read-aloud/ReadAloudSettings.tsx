import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { commands } from "@/bindings";
import type { ElevenVoice, EdgeVoice } from "@/bindings";
import { ShortcutInput } from "../ShortcutInput";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Slider } from "../../ui/Slider";
import { useSettings } from "../../../hooks/useSettings";
import { ApiKeyField } from "../PostProcessingSettingsApi/ApiKeyField";

// "af_heart" -> "Heart · US F". Convention: [accent a=US/b=UK][gender f/m]_name.
function prettyKokoro(id: string): string {
  const m = id.match(/^([ab])([fm])_(.+)$/);
  const base = (m ? m[3] : id).replace(/_/g, " ");
  const cap = base.charAt(0).toUpperCase() + base.slice(1);
  if (!m) return cap;
  return `${cap} · ${m[1] === "a" ? "US" : "UK"} ${m[2] === "f" ? "F" : "M"}`;
}

// edge-tts voice -> "Aria · US".
function edgeLabel(v: EdgeVoice): string {
  return `${v.display} · ${v.locale.replace(/^en-/i, "")}`;
}

/**
 * Read Aloud voice picker. Primary = free, fast, natural edge-tts neural voices
 * (online). Then free offline Kokoro voices. ElevenLabs (bring your own key) is
 * tucked behind an Advanced disclosure. macOS `say` is only a silent fallback.
 */
export const ReadAloudSettings: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, refreshSettings } = useSettings();
  const [edgeVoices, setEdgeVoices] = useState<EdgeVoice[]>([]);
  const [kokoroVoices, setKokoroVoices] = useState<string[]>([]);
  const [elVoices, setElVoices] = useState<ElevenVoice[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const provider = getSetting("tts_provider") ?? "edge_tts";
  const edgeVoiceId = getSetting("edge_voice_id") ?? "";
  const kokoroVoiceId = getSetting("kokoro_voice_id") ?? "";
  const elVoiceId = getSetting("elevenlabs_voice_id") ?? "";
  const rate = getSetting("tts_rate") ?? 175;
  const elKey = getSetting("tts_secrets")?.["elevenlabs"] ?? "";
  const hasKey = elKey.trim().length > 0;

  const loadEdge = useCallback(async () => {
    const r = await commands.listEdgeVoices();
    setEdgeVoices(r.status === "ok" ? r.data : []);
  }, []);
  const loadKokoro = useCallback(async () => {
    const r = await commands.listKokoroVoices();
    setKokoroVoices(r.status === "ok" ? r.data : []);
  }, []);
  const loadEl = useCallback(async () => {
    const r = await commands.listElevenlabsVoices();
    setElVoices(r.status === "ok" ? r.data : []);
  }, []);
  useEffect(() => {
    loadEdge();
    loadKokoro();
    loadEl();
  }, [loadEdge, loadKokoro, loadEl]);
  useEffect(() => {
    if (provider === "eleven_labs") setShowAdvanced(true);
  }, [provider]);

  const onPick = async (val: string) => {
    if (val.startsWith("edge:")) {
      await updateSetting("edge_voice_id", val.slice(5));
      await updateSetting("tts_provider", "edge_tts");
    } else if (val.startsWith("kokoro:")) {
      await updateSetting("kokoro_voice_id", val.slice(7));
      await updateSetting("tts_provider", "kokoro");
    }
  };
  const selectEleven = async (voiceId: string) => {
    if (!voiceId) return;
    await updateSetting("elevenlabs_voice_id", voiceId);
    await updateSetting("tts_provider", "eleven_labs");
  };
  const handleElKeyChange = async (key: string) => {
    await commands.changeElevenlabsApiKeySetting(key);
    await refreshSettings();
    loadEl();
  };
  const handlePreview = () =>
    commands.previewTtsVoice("", t("settings.readAloud.preview.sample"));
  const handleStop = () => commands.stopTts();

  const custom = elVoices.filter((v) => v.category !== "premade");
  const premade = elVoices
    .filter((v) => v.category === "premade")
    .sort((a, b) => a.name.localeCompare(b.name));

  let selectedValue = "";
  if (provider === "edge_tts")
    selectedValue = `edge:${edgeVoiceId || "AriaNeural"}`;
  else if (provider === "kokoro")
    selectedValue = `kokoro:${kokoroVoiceId || "af_heart"}`;

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.readAloud.title")}>
        <SettingContainer
          title={t("settings.readAloud.voice.title")}
          description={t("settings.readAloud.voice.description")}
          descriptionMode="tooltip"
          grouped={true}
        >
          <div className="flex items-center space-x-2">
            <select
              value={selectedValue}
              onChange={(e) => onPick(e.target.value)}
              className="text-sm rounded-lg border border-line bg-bg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-signal max-w-[260px]"
            >
              {selectedValue === "" && <option value="">—</option>}
              {edgeVoices.length > 0 && (
                <optgroup label="Natural voices (free, online)">
                  {edgeVoices.map((v) => (
                    <option key={v.id} value={`edge:${v.id}`}>
                      {edgeLabel(v)}
                    </option>
                  ))}
                </optgroup>
              )}
              {kokoroVoices.length > 0 && (
                <optgroup label="Offline voices (free)">
                  {kokoroVoices.map((v) => (
                    <option key={v} value={`kokoro:${v}`}>
                      {prettyKokoro(v)}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {provider === "edge_tts" && (
              <span className="text-xs text-text-2 whitespace-nowrap">
                Free · natural
              </span>
            )}
            {provider === "kokoro" && (
              <span className="text-xs text-text-2 whitespace-nowrap">
                Free · offline
              </span>
            )}
          </div>
        </SettingContainer>

        <p className="px-4 text-xs text-text-2">
          {t("settings.readAloud.voice.hint")}
        </p>

        <Slider
          value={rate}
          onChange={(value: number) => updateSetting("tts_rate", value)}
          min={100}
          max={300}
          step={5}
          label={t("settings.readAloud.rate.title")}
          description={t("settings.readAloud.rate.description")}
          descriptionMode="tooltip"
          grouped={true}
          formatValue={(value) => `${value} wpm`}
        />

        <SettingContainer
          title={t("settings.readAloud.preview.title")}
          description={t("settings.readAloud.preview.description")}
          descriptionMode="tooltip"
          grouped={true}
        >
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePreview}
              className="text-sm font-medium rounded-lg px-3 py-1 bg-signal/80 hover:bg-signal transition-colors"
            >
              {t("settings.readAloud.preview.play")}
            </button>
            <button
              type="button"
              onClick={handleStop}
              className="text-sm font-medium rounded-lg px-3 py-1 border border-line hover:bg-card-2 transition-colors"
            >
              {t("settings.readAloud.preview.stop")}
            </button>
          </div>
        </SettingContainer>
      </SettingsGroup>

      <SettingsGroup title={t("settings.readAloud.eleven.title")}>
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="px-4 text-sm text-text-2 hover:text-text transition-colors text-left"
        >
          {showAdvanced ? "▾" : "▸"} Advanced: use my ElevenLabs key
          {provider === "eleven_labs" ? " (active)" : ""}
        </button>

        {showAdvanced && (
          <>
            <SettingContainer
              title={t("settings.readAloud.eleven.keyTitle")}
              description={t("settings.readAloud.eleven.keyDescription")}
              descriptionMode="tooltip"
              layout="horizontal"
              grouped={true}
            >
              <ApiKeyField
                value={elKey}
                onBlur={handleElKeyChange}
                disabled={false}
                placeholder={t("settings.readAloud.eleven.keyPlaceholder")}
                className="min-w-[320px]"
              />
            </SettingContainer>

            {hasKey && (
              <SettingContainer
                title={t("settings.readAloud.voice.title")}
                description={t("settings.readAloud.voice.description")}
                descriptionMode="tooltip"
                grouped={true}
              >
                <select
                  value={provider === "eleven_labs" ? elVoiceId : ""}
                  onChange={(e) => selectEleven(e.target.value)}
                  className="text-sm rounded-lg border border-line bg-bg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-signal"
                >
                  <option value="">—</option>
                  {custom.length > 0 && (
                    <optgroup label={t("settings.readAloud.voice.customGroup")}>
                      {custom.map((v) => (
                        <option key={v.voice_id} value={v.voice_id}>
                          {v.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {premade.length > 0 && (
                    <optgroup label={t("settings.readAloud.voice.freeGroup")}>
                      {premade.map((v) => (
                        <option key={v.voice_id} value={v.voice_id}>
                          {v.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </SettingContainer>
            )}

            <p className="px-4 text-sm text-text-2">
              {elVoices.length > 0
                ? t("settings.readAloud.eleven.loaded", { count: elVoices.length })
                : t("settings.readAloud.eleven.needKey")}
            </p>
          </>
        )}
      </SettingsGroup>

      <SettingsGroup title={t("settings.readAloud.hotkey.title")}>
        <ShortcutInput shortcutId="read_selection" grouped={true} />
        <p className="px-4 text-sm text-text-2">
          {t("settings.readAloud.hotkey.help")}
        </p>
      </SettingsGroup>
    </div>
  );
};
