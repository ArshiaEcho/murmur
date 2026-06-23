import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { commands } from "@/bindings";
import type { ClaudeProject } from "@/bindings";
import { SettingsGroup } from "../../ui/SettingsGroup";
import { SettingContainer } from "../../ui/SettingContainer";
import { useSettings } from "../../../hooks/useSettings";
import { ApiKeyField } from "../PostProcessingSettingsApi/ApiKeyField";

const MODELS = [
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6 (balanced)" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5 (fastest, cheapest)" },
];

export const ConversationSettings: React.FC = () => {
  const { t } = useTranslation();
  const { getSetting, refreshSettings } = useSettings();
  const [projects, setProjects] = useState<ClaudeProject[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    commands.listClaudeProjects().then((r) => {
      if (r.status === "ok") setProjects(r.data);
    });
  }, []);

  const enabled = !!getSetting("converse_enabled");
  const model = getSetting("converse_model") ?? "claude-sonnet-4-6";
  const scope = getSetting("converse_project_scope") ?? "";
  const apiKey = getSetting("tts_secrets")?.["anthropic"] ?? "";

  const toggleEnabled = async () => {
    await commands.setConverseEnabled(!enabled);
    await refreshSettings();
  };
  const changeModel = async (m: string) => {
    await commands.setConverseModel(m);
    await refreshSettings();
  };
  const changeScope = async (s: string) => {
    await commands.setConverseScope(s || null);
    await refreshSettings();
  };
  const changeKey = async (k: string) => {
    await commands.setConverseApiKey(k);
    await refreshSettings();
  };

  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setBusy(true);
    setError(null);
    setAnswer(null);
    const r = await commands.converseTest(q);
    setBusy(false);
    if (r.status === "ok") setAnswer(r.data);
    else setError(r.error);
  };
  const stop = () => commands.converseCancel();

  const selectCls =
    "text-sm rounded-lg border border-mid-gray/20 bg-background-ui px-2 py-1 focus:outline-none focus:ring-2 focus:ring-logo-primary";

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <SettingsGroup title={t("conversation.title")}>
        <SettingContainer
          title={t("conversation.enable.title")}
          description={t("conversation.enable.description")}
          descriptionMode="tooltip"
          grouped={true}
        >
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={toggleEnabled} />
            {enabled ? t("conversation.enable.on") : t("conversation.enable.off")}
          </label>
        </SettingContainer>

        <SettingContainer
          title={t("conversation.model.title")}
          description={t("conversation.model.description")}
          descriptionMode="tooltip"
          grouped={true}
        >
          <select
            value={model}
            onChange={(e) => changeModel(e.target.value)}
            className={selectCls}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </SettingContainer>

        <SettingContainer
          title={t("conversation.scope.title")}
          description={t("conversation.scope.description")}
          descriptionMode="tooltip"
          grouped={true}
        >
          <select
            value={scope}
            onChange={(e) => changeScope(e.target.value)}
            className={selectCls}
          >
            <option value="">{t("conversation.scope.auto")}</option>
            {projects.map((p) => (
              <option key={p.dir} value={p.cwd}>
                {p.cwd}
              </option>
            ))}
          </select>
        </SettingContainer>
      </SettingsGroup>

      <SettingsGroup title={t("conversation.api.title")}>
        <SettingContainer
          title={t("conversation.api.keyTitle")}
          description={t("conversation.api.keyDescription")}
          descriptionMode="tooltip"
          layout="horizontal"
          grouped={true}
        >
          <div className="flex items-center gap-2">
            <ApiKeyField
              value={apiKey}
              onBlur={changeKey}
              disabled={false}
              placeholder="sk-ant-..."
              className="min-w-[320px]"
            />
          </div>
        </SettingContainer>
        <p className="px-4 text-sm text-mid-gray">
          {t("conversation.voiceNote")}
        </p>
      </SettingsGroup>

      <SettingsGroup title={t("conversation.test.title")}>
        <div className="px-4 py-2 space-y-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("conversation.test.placeholder")}
            rows={2}
            className="w-full text-sm rounded-lg border border-mid-gray/20 bg-background-ui px-3 py-2 focus:outline-none focus:ring-2 focus:ring-logo-primary resize-none"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={ask}
              disabled={busy || !question.trim()}
              className="text-sm font-medium rounded-lg px-3 py-1 bg-logo-primary/80 hover:bg-logo-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? t("conversation.test.thinking") : t("conversation.test.ask")}
            </button>
            <button
              type="button"
              onClick={stop}
              className="text-sm font-medium rounded-lg px-3 py-1 border border-mid-gray/20 hover:bg-mid-gray/20 transition-colors"
            >
              {t("conversation.test.stop")}
            </button>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {answer && (
            <p className="text-sm bg-mid-gray/10 rounded-lg px-3 py-2">{answer}</p>
          )}
        </div>
      </SettingsGroup>
    </div>
  );
};
