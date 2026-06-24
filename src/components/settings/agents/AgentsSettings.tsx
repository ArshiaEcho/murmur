import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bot, Play, Check, Trash2, GitBranch } from "lucide-react";
import { commands } from "@/bindings";
import type { AgentRun } from "@/bindings";
import { useAgentsStore } from "../../../stores/agentsStore";
import { SettingsGroup } from "../../ui/SettingsGroup";

const AgentCard: React.FC<{ run: AgentRun }> = ({ run }) => {
  const { t } = useTranslation();
  const statusCls =
    run.status === "playing"
      ? "bg-amber-400 animate-pulse"
      : run.status === "ready"
        ? "bg-logo-primary"
        : "bg-mid-gray/40";
  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${statusCls}`} />
        <span className="font-medium truncate flex-1" title={run.title ?? ""}>
          {run.title ?? t("agents.untitled")}
        </span>
        {run.git_branch && (
          <span className="flex items-center gap-1 text-xs text-mid-gray">
            <GitBranch size={12} />
            {run.git_branch}
          </span>
        )}
      </div>
      {run.summary && (
        <p className="text-sm text-mid-gray line-clamp-3">{run.summary}</p>
      )}
      {(run.next_steps ?? []).length > 0 && (
        <ul className="text-xs text-mid-gray list-disc ms-5">
          {(run.next_steps ?? []).slice(0, 3).map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          className="flex items-center gap-1 text-sm rounded-lg px-3 py-1 bg-logo-primary/80 hover:bg-logo-primary transition-colors"
          onClick={() => commands.playAgentRun(run.id)}
        >
          <Play size={14} /> {t("agents.play")}
        </button>
        <button
          type="button"
          className="flex items-center gap-1 text-sm rounded-lg px-3 py-1 border border-mid-gray/20 hover:bg-mid-gray/20 transition-colors"
          onClick={() => commands.dismissAgentRun(run.id)}
        >
          <Check size={14} /> {t("agents.markReviewed")}
        </button>
        <button
          type="button"
          className="flex items-center gap-1 text-sm rounded-lg px-3 py-1 border border-mid-gray/20 hover:bg-mid-gray/20 transition-colors"
          onClick={() => commands.deleteAgentRun(run.id)}
          aria-label={t("agents.delete")}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export const AgentsSettings: React.FC = () => {
  const { t } = useTranslation();
  const runs = useAgentsStore((s) => s.runs);
  const init = useAgentsStore((s) => s.init);
  const [repoPath, setRepoPath] = useState("");
  const [installMsg, setInstallMsg] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const install = async () => {
    const p = repoPath.trim();
    if (!p) return;
    const r = await commands.installStratReporter(p);
    setInstallMsg(r.status === "ok" ? r.data : r.error);
  };

  const byRepo = runs.reduce<Record<string, AgentRun[]>>((acc, r) => {
    const k = r.repo ?? "session";
    (acc[k] ??= []).push(r);
    return acc;
  }, {});
  const ready = runs.filter((r) => r.status === "ready").length;

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-logo-primary/20 bg-gradient-to-br from-logo-primary/10 to-transparent p-5">
        <div className="flex items-center gap-3">
          <Bot size={28} className="text-logo-primary" />
          <div>
            <h2 className="font-semibold">{t("agents.title")}</h2>
            <p className="text-sm text-mid-gray">{t("agents.subtitle")}</p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-logo-primary/15 text-logo-primary text-sm font-semibold">
          {t("agents.readyCount", { count: ready })}
        </span>
      </div>

      <SettingsGroup title={t("agents.connect.title")}>
        <div className="px-4 py-2 space-y-2">
          <p className="text-sm text-mid-gray">{t("agents.connect.description")}</p>
          <div className="flex items-center gap-2">
            <input
              value={repoPath}
              onChange={(e) => setRepoPath(e.target.value)}
              placeholder="/Users/you/Dev/your-repo"
              className="flex-1 text-sm rounded-lg border border-mid-gray/20 bg-background px-3 py-1 focus:outline-none focus:ring-2 focus:ring-logo-primary"
            />
            <button
              type="button"
              onClick={install}
              disabled={!repoPath.trim()}
              className="text-sm font-medium rounded-lg px-3 py-1 bg-logo-primary/80 hover:bg-logo-primary transition-colors disabled:opacity-50"
            >
              {t("agents.connect.enable")}
            </button>
          </div>
          {installMsg && <p className="text-sm text-mid-gray">{installMsg}</p>}
        </div>
      </SettingsGroup>

      {runs.length === 0 && (
        <p className="text-sm text-mid-gray px-1">{t("agents.empty")}</p>
      )}

      {Object.entries(byRepo).map(([repo, items]) => (
        <SettingsGroup key={repo} title={repo}>
          {items
            .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
            .map((r) => (
              <AgentCard key={r.id} run={r} />
            ))}
        </SettingsGroup>
      ))}
    </div>
  );
};
