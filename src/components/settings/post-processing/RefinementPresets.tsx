import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Plus } from "lucide-react";
import { commands } from "@/bindings";
import { useSettings } from "../../../hooks/useSettings";

interface Preset {
  key: string;
  name: string;
  prompt: string;
}

// Curated refinement prompts (VoiceBox A4) that drop into the existing
// post-process prompt engine with one click. Stored name is English; the chip
// label is localized.
const PRESETS: Preset[] = [
  {
    key: "cleanup",
    name: "Clean up",
    prompt:
      "Clean up this dictated text: remove filler words and false starts, fix obvious punctuation and capitalization, and keep the original meaning, wording, and tone. Return only the cleaned text.",
  },
  {
    key: "fillers",
    name: "Remove fillers",
    prompt:
      "Remove filler words and verbal tics (um, uh, like, you know, sort of, I mean) from this dictated text without changing anything else. Return only the result.",
  },
  {
    key: "selfcorrect",
    name: "Fix self-corrections",
    prompt:
      "This is dictated text where I sometimes correct myself mid-sentence. Keep only my final intended version of each correction and remove the discarded attempts. Do not change anything else. Return only the result.",
  },
  {
    key: "technical",
    name: "Preserve technical terms",
    prompt:
      "Clean up this dictated text (fillers, false starts, punctuation) but never alter code, file paths, identifiers, commands, or technical terms. Return only the cleaned text.",
  },
  {
    key: "professional",
    name: "Professional tone",
    prompt:
      "Lightly edit this dictated text for grammar, punctuation, and a clear professional tone, without adding new information or changing the meaning. Return only the edited text.",
  },
];

export const RefinementPresets: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, refreshSettings, updateSetting } = useSettings();
  const prompts = getSetting("post_process_prompts") || [];
  const [busy, setBusy] = useState<string | null>(null);

  const existing = (name: string) => prompts.find((p) => p.name === name);

  const apply = async (preset: Preset) => {
    setBusy(preset.key);
    try {
      const found = existing(preset.name);
      if (found) {
        updateSetting("post_process_selected_prompt_id", found.id);
      } else {
        const r = await commands.addPostProcessPrompt(preset.name, preset.prompt);
        if (r.status === "ok") {
          await refreshSettings();
          updateSetting("post_process_selected_prompt_id", r.data.id);
        }
      }
    } catch (error) {
      console.error("Failed to apply refinement preset:", error);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="px-[17px] py-[14px]">
      <p className="text-xs text-text-3 mb-3">
        {t("settings.postProcessing.presets.description")}
      </p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const added = !!existing(preset.name);
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => apply(preset)}
              disabled={busy !== null}
              aria-pressed={added}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-signal disabled:opacity-50 ${
                added
                  ? "border-transparent bg-ok-soft text-ok"
                  : "border-line-2 text-text-2 hover:border-signal hover:text-signal-ink hover:bg-signal-soft"
              }`}
            >
              {added ? <Check size={13} /> : <Plus size={13} />}
              {t(`settings.postProcessing.presets.items.${preset.key}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
};
