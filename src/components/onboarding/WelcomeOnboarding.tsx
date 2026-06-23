import React from "react";
import { Mic, Volume2, Radio, ArrowRight } from "lucide-react";
import HandyTextLogo from "../icons/HandyTextLogo";
import stratLogo from "../../assets/strat-logo.png";

interface WelcomeOnboardingProps {
  onContinue: () => void;
}

const VALUE = [
  {
    icon: Mic,
    title: "Dictate anywhere",
    body: "Talk instead of type. A hotkey turns your voice into clean text in any app — including Claude Code.",
  },
  {
    icon: Volume2,
    title: "Hear it back",
    body: "Read Aloud speaks any selection in a natural voice (Monoli) — proofread with your ears.",
  },
  {
    icon: Radio,
    title: "Run your sessions",
    body: "See every live Claude Code session at a glance, ask any of them what's going on, and get told when one needs you.",
  },
];

/** First-run welcome: the Murmur brand + what it does, before model + permissions. */
const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({ onContinue }) => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-8 gap-8 bg-gradient-to-br from-logo-primary/10 via-transparent to-transparent">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src={stratLogo} alt="Murmur" draggable={false} className="w-20 h-20 select-none" />
        <HandyTextLogo width={210} />
        <p className="text-text/70 max-w-md font-medium">
          Your voice layer for Claude Code.
          <span className="block text-sm text-mid-gray mt-1">a Stratos House product</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full">
        {VALUE.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex flex-col gap-2 rounded-2xl border border-mid-gray/15 bg-background/60 p-4"
          >
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-logo-primary/15 text-logo-primary">
              <Icon size={20} />
            </div>
            <h3 className="font-semibold text-sm">{title}</h3>
            <p className="text-xs text-mid-gray leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="flex items-center gap-2 rounded-xl px-6 py-2.5 bg-logo-primary text-white font-medium hover:bg-logo-primary/90 transition-colors"
      >
        Get started <ArrowRight size={18} />
      </button>
    </div>
  );
};

export default WelcomeOnboarding;
