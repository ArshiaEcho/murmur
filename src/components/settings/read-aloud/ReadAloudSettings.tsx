import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { commands } from "@/bindings";
import type { TtsVoice } from "@/bindings";
import { ShortcutInput } from "../ShortcutInput";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { Slider } from "../../ui/Slider";
import { useSettings } from "../../../hooks/useSettings";

export const ReadAloudSettings: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, updateSetting } = useSettings();
  const [voices, setVoices] = useState<TtsVoice[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await commands.listTtsVoices();
      if (cancelled) return;
      if (result.status === "ok") {
        setVoices(result.data);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedVoice = getSetting("tts_voice") ?? "";
  const rate = getSetting("tts_rate") ?? 175;
  const noVoices = loaded && voices.length === 0;

  const handleVoiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSetting("tts_voice", e.target.value || null);
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
              value={selectedVoice}
              onChange={handleVoiceChange}
              disabled={!loaded}
              className="text-sm rounded-lg border border-mid-gray/20 bg-background-ui px-2 py-1 focus:outline-none focus:ring-2 focus:ring-logo-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {t("settings.readAloud.voice.systemDefault")}
              </option>
              {voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {`${voice.name} — ${voice.locale}`}
                </option>
              ))}
            </select>
          </div>
        </SettingContainer>

        {noVoices && (
          <p className="px-4 text-sm text-mid-gray">
            {t("settings.readAloud.voice.none")}
          </p>
        )}

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
              disabled={!loaded || noVoices}
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

      <SettingsGroup title={t("settings.readAloud.hotkey.title")}>
        <ShortcutInput shortcutId="read_selection" grouped={true} />
        <p className="px-4 text-sm text-mid-gray">
          {t("settings.readAloud.hotkey.help")}
        </p>
      </SettingsGroup>
    </div>
  );
};
