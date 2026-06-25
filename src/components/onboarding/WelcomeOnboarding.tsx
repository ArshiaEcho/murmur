import React from "react";
import { useTranslation } from "react-i18next";
import { Mic, Volume2, Radio, ArrowRight } from "lucide-react";
import OnboardingShell from "./OnboardingShell";

interface WelcomeOnboardingProps {
  onContinue: () => void;
}

/** First-run welcome: the Murmur brand + what it does, before model + permissions. */
const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({ onContinue }) => {
  const { t } = useTranslation();
  const VALUE = [
    {
      icon: Mic,
      title: t("onboarding.welcome.dictate.title"),
      body: t("onboarding.welcome.dictate.body"),
    },
    {
      icon: Volume2,
      title: t("onboarding.welcome.hearItBack.title"),
      body: t("onboarding.welcome.hearItBack.body"),
    },
    {
      icon: Radio,
      title: t("onboarding.welcome.runSessions.title"),
      body: t("onboarding.welcome.runSessions.body"),
    },
  ];
  return (
    <OnboardingShell
      subtitle={t("onboarding.welcome.subtitle")}
      footnote={t("onboarding.welcome.footnote")}
    >
      <div
        className="relative mt-8 grid w-full gap-3.5"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(178px, 1fr))",
          maxWidth: 620,
        }}
      >
        {VALUE.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex flex-col gap-[11px] rounded-2xl border border-line bg-card p-[18px]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-signal-soft text-signal-ink">
              <Icon size={20} strokeWidth={1.9} />
            </span>
            <h3 className="text-sm font-semibold text-text">{title}</h3>
            <p className="text-xs leading-relaxed text-text-3">{body}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="relative mt-8 flex items-center gap-2.5 rounded-full border border-signal bg-signal px-6 py-3 text-sm font-semibold text-on-signal transition-[filter] duration-150 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      >
        {t("onboarding.welcome.getStarted")}
        <ArrowRight size={16} strokeWidth={2.2} />
      </button>
    </OnboardingShell>
  );
};

export default WelcomeOnboarding;
