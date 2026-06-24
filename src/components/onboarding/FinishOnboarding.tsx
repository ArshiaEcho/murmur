import React from "react";
import { useTranslation } from "react-i18next";
import { Mic, Volume2, Radio } from "lucide-react";
import OnboardingShell from "./OnboardingShell";

interface FinishOnboardingProps {
  onDone: () => void;
}

/** Final onboarding screen after model + permissions: quick tips + enter the app. */
const FinishOnboarding: React.FC<FinishOnboardingProps> = ({ onDone }) => {
  const { t } = useTranslation();
  const TIPS = [
    {
      icon: Mic,
      title: t("onboarding.finish.dictate.title"),
      body: t("onboarding.finish.dictate.body"),
    },
    {
      icon: Volume2,
      title: t("onboarding.finish.readAloud.title"),
      body: t("onboarding.finish.readAloud.body"),
    },
    {
      icon: Radio,
      title: t("onboarding.finish.sessions.title"),
      body: t("onboarding.finish.sessions.body"),
    },
  ];
  return (
    <OnboardingShell
      subtitle={t("onboarding.finish.subtitle")}
      footnote={t("onboarding.finish.footnote")}
    >
      <div className="mt-8 flex w-full max-w-md flex-col gap-2.5">
        {TIPS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-2xl border border-line bg-card p-4"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-signal-soft text-signal">
              <Icon size={18} strokeWidth={1.9} />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-text">{title}</h3>
              <p className="text-xs leading-relaxed text-text-3">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onDone}
        className="relative mt-8 rounded-full border border-signal bg-signal px-6 py-3 text-sm font-semibold text-on-signal transition-[filter] duration-150 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {t("onboarding.finish.start")}
      </button>
    </OnboardingShell>
  );
};

export default FinishOnboarding;
