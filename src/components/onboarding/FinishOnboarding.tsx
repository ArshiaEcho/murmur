import React from "react";
import { Check, Mic, Volume2, Radio } from "lucide-react";
import HandyTextLogo from "../icons/HandyTextLogo";
import stratLogo from "../../assets/strat-logo.png";

interface FinishOnboardingProps {
  onDone: () => void;
}

const TIPS = [
  {
    icon: Mic,
    title: "Dictate",
    body: "Press your dictation hotkey, speak, and the text lands in whatever's focused.",
  },
  {
    icon: Volume2,
    title: "Read Aloud",
    body: "Select text and press ⌥⌃R to hear it in the Monoli voice.",
  },
  {
    icon: Radio,
    title: "Sessions",
    body: "Open the Sessions tab to see every live Claude Code session, color-coded by project — click one to chat or ask by voice.",
  },
];

/** Final onboarding screen after model + permissions: quick tips + enter the app. */
const FinishOnboarding: React.FC<FinishOnboardingProps> = ({ onDone }) => {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center p-8 gap-7 bg-gradient-to-br from-logo-primary/10 via-transparent to-transparent">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <img src={stratLogo} alt="Murmur" draggable={false} className="w-20 h-20 select-none" />
          <span className="absolute -bottom-1 -right-1 flex items-center justify-center h-7 w-7 rounded-full bg-emerald-500 text-white ring-2 ring-background">
            <Check size={16} />
          </span>
        </div>
        <HandyTextLogo width={200} />
        <h2 className="text-xl font-semibold">You're all set</h2>
        <p className="text-sm text-mid-gray max-w-md">
          Murmur is listening. Here's how to get the most out of it.
        </p>
      </div>

      <div className="flex flex-col gap-2.5 max-w-md w-full">
        {TIPS.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="flex items-start gap-3 rounded-xl border border-mid-gray/15 bg-background/60 p-3"
          >
            <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-logo-primary/15 text-logo-primary shrink-0">
              <Icon size={18} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-mid-gray leading-relaxed">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onDone}
        className="rounded-xl px-6 py-2.5 bg-logo-primary text-white font-medium hover:bg-logo-primary/90 transition-colors"
      >
        Open Murmur
      </button>
    </div>
  );
};

export default FinishOnboarding;
