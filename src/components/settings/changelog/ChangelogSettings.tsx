import React from "react";
import { useTranslation } from "react-i18next";

type ChangeKind = "added" | "fixed" | "changed";

interface Release {
  version: string;
  date: string;
  title?: string;
  changes: { kind: ChangeKind; text: string }[];
}

// Kept in sync with the repo CHANGELOG.md (used for GitHub releases + landing).
const RELEASES: Release[] = [
  {
    version: "1.0.0",
    date: "2026-06-24",
    title: "First public release",
    changes: [
      { kind: "added", text: "Redesigned interface: clean surfaces, a single warm gold accent, teal for live sessions." },
      { kind: "added", text: "Light and dark themes with a persisted toggle (default light)." },
      { kind: "added", text: "Collapsible and lockable sidebar: pinned wide, pinned narrow, or hover-to-peek." },
      { kind: "added", text: "Read-Aloud neural voices: Edge TTS (free), Kokoro (offline), ElevenLabs (advanced)." },
      { kind: "added", text: "Live Sessions observatory with a chat drawer and push-to-talk voice." },
      { kind: "added", text: "Real Stratos House branding, including the app icon." },
      { kind: "fixed", text: "App icon showed a generic placeholder on some systems." },
      { kind: "fixed", text: "Sessions view left a dead band at the bottom and clipped rows." },
    ],
  },
  {
    version: "0.9.0",
    date: "2026-06-23",
    changes: [
      { kind: "added", text: "Sentence-chunked Read-Aloud so the first sentence plays in ~1–2s." },
      { kind: "added", text: "Multi-engine voice stack with graceful fallback." },
      { kind: "added", text: "Sessions observatory groundwork and onboarding." },
    ],
  },
];

const KIND_CLASS: Record<ChangeKind, string> = {
  added: "bg-ok-soft text-ok",
  fixed: "bg-signal-soft text-signal-ink",
  changed: "bg-live-soft text-live-ink",
};

export const ChangelogSettings: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <div className="px-1">
        <h1 className="text-[22px] font-semibold tracking-[-0.3px] text-text">
          {t("changelog.title")}
        </h1>
        <p className="mt-1 text-sm text-text-3">{t("changelog.subtitle")}</p>
      </div>

      <div className="space-y-4">
        {RELEASES.map((rel) => (
          <div
            key={rel.version}
            className="rounded-2xl border border-line bg-card overflow-hidden"
          >
            <div className="flex items-baseline gap-3 px-5 pt-4 pb-3 border-b border-line">
              <span className="text-[15px] font-semibold text-text tnum">
                {`v${rel.version}`}
              </span>
              {rel.title && (
                <span className="text-[13px] text-text-2">{rel.title}</span>
              )}
              <span className="ms-auto font-mono tnum text-[11px] text-text-3">
                {rel.date}
              </span>
            </div>
            <ul className="px-5 py-4 space-y-2.5">
              {rel.changes.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className={`mt-[1px] shrink-0 inline-flex items-center px-2 py-[2px] rounded-full text-[10px] font-semibold uppercase tracking-[0.4px] ${KIND_CLASS[c.kind]}`}
                  >
                    {t(`changelog.kind.${c.kind}`)}
                  </span>
                  <span className="text-[13.5px] leading-[1.55] text-text-2">
                    {c.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
