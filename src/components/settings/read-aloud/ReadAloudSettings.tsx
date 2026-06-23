import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { commands } from "@/bindings";
import type { ElevenVoice } from "@/bindings";
import { ShortcutInput } from "../ShortcutInput";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Slider } from "../../ui/Slider";
import { useSettings } from "../../../hooks/useSettings";
import { ApiKeyField } from "../PostProcessingSettingsApi/ApiKeyField";

export const ReadAloudSettings: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting, refreshSettings } = useSettings();
  const [elVoices, setElVoices] = useState<ElevenVoice[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Read Aloud is ElevenLabs-first: the dropdown is your own voices + the free
  // ElevenLabs library. The macOS `say` voices are intentionally gone (only kept
  // as a silent offline fallback in the engine).
  const loadElVoices = useCallback(async () => {
    const result = await commands.listElevenlabsVoices();
    setElVoices(result.status === "ok" ? result.data : []);
    setLoaded(true);
  }, []);
  useEffect(() => {
    loadElVoices();
  }, [loadElVoices]);

  const provider = getSetting("tts_provider") ?? "say";
  const elVoiceId = getSetting("elevenlabs_voice_id") ?? "";
  const rate = getSetting("tts_rate") ?? 175;
  const elKey = getSetting("tts_secrets")?.["elevenlabs"] ?? "";

  const custom = elVoices.filter((v) => v.category !== "premade");
  const premade = elVoices
    .filter((v) => v.category === "premade")
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedValue =
    provider === "eleven_labs" && elVoiceId ? `el:${elVoiceId}` : "";

  const handleVoiceChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val.startsWith("el:")) {
      await updateSetting("tts_provider", "eleven_labs");
      await updateSetting("elevenlabs_voice_id", val.slice(3));
    } else {
      // Offline fallback: macOS system default voice.
      await updateSetting("tts_provider", "say");
      await updateSetting("tts_voice", null);
    }
  };

  const handleElKeyChange = async (key: string) => {
    await commands.changeElevenlabsApiKeySetting(key);
    await refreshSettings();
    loadElVoices();
  };

  const handlePreview = () => {
    commands.previewTtsVoice(
      getSetting("tts_voice") ?? "",
      t("settings.readAloud.preview.sample"),
    );
  };

  const handleStop = () => {
    commands.stopTts();
  };

  const hasKey = elKey.trim().length > 0;

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("settings.readAloud.title")}>
        <SettingContainer
          title={t("settings.readAloud.voice.title")}
          description={t("settings.readAloud.voice.description")}
          descriptionMode="tooltip"
          grouped={true}
        >
          <div className="flex items-center space-x-1">
            <select
              value={selectedValue}
              onChange={handleVoiceChange}
              disabled={!loaded}
              className="text-sm rounded-lg border border-mid-gray/20 bg-background-ui px-2 py-1 focus:outline-none focus:ring-2 focus:ring-logo-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {custom.length > 0 && (
                <optgroup label={t("settings.readAloud.voice.customGroup")}>
                  {custom.map((v) => (
                    <option key={v.voice_id} value={`el:${v.voice_id}`}>
                      {v.name}
                    </option>
                  ))}
                </optgroup>
              )}

              {premade.length > 0 && (
                <optgroup label={t("settings.readAloud.voice.freeGroup")}>
                  {premade.map((v) => (
                    <option key={v.voice_id} value={`el:${v.voice_id}`}>
                      {v.name}
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label={t("settings.readAloud.voice.offline")}>
                <option value="">
                  {t("settings.readAloud.voice.systemDefault")}
                </option>
              </optgroup>
            </select>
          </div>
        </SettingContainer>

        {loaded && elVoices.length === 0 && (
          <p className="px-4 text-sm text-mid-gray">
            {hasKey
              ? t("settings.readAloud.eleven.noVoices")
              : t("settings.readAloud.eleven.needKey")}
          </p>
        )}

        <p className="px-4 text-xs text-mid-gray">
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
              disabled={!loaded}
              className="text-sm font-medium rounded-lg px-3 py-1 bg-logo-primary/80 hover:bg-logo-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("settings.readAloud.preview.play")}
            </button>
            <button
              type="button"
              onClick={handleStop}
              className="text-sm font-medium rounded-lg px-3 py-1 border border-mid-gray/20 hover:bg-mid-gray/20 transition-colors"
            >
              {t("settings.readAloud.preview.stop")}
            </button>
          </div>
        </SettingContainer>
      </SettingsGroup>

      <SettingsGroup title={t("settings.readAloud.eleven.title")}>
        <SettingContainer
          title={t("settings.readAloud.eleven.keyTitle")}
          description={t("settings.readAloud.eleven.keyDescription")}
          descriptionMode="tooltip"
          layout="horizontal"
          grouped={true}
        >
          <div className="flex items-center gap-2">
            <ApiKeyField
              value={elKey}
              onBlur={handleElKeyChange}
              disabled={false}
              placeholder={t("settings.readAloud.eleven.keyPlaceholder")}
              className="min-w-[320px]"
            />
          </div>
        </SettingContainer>
        <p className="px-4 text-sm text-mid-gray">
          {elVoices.length > 0
            ? t("settings.readAloud.eleven.loaded", { count: elVoices.length })
            : t("settings.readAloud.eleven.noVoices")}
        </p>
      </SettingsGroup>

      <SettingsGroup title={t("settings.readAloud.hotkey.title")}>
        <ShortcutInput shortcutId="read_selection" grouped={true} />
        <p className="px-4 text-sm text-mid-gray">
          {t("settings.readAloud.hotkey.help")}
        </p>
      </SettingsGroup>
    </div>
  );
};
