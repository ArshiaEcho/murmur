import React from "react";

/**
 * The nested-diamond Murmur mark from the design handoff: two signal-stroke
 * facets over a solid lower facet washed with a gold gradient, plus a soft
 * breathing gold glow behind it. Honors reduced-motion via the media query
 * inside App.css's keyframe usage (the glow simply holds still).
 */
export const MurmurMark: React.FC<{ size?: number }> = ({ size = 74 }) => {
  const gradId = React.useId();
  return (
    <div
      className="relative"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* breathing gold glow */}
      <span
        className="absolute left-1/2 -translate-x-1/2 rounded-full motion-safe:animate-[mur-breathe_3.2s_var(--ease-io)_infinite]"
        style={{
          top: "60%",
          width: size * 0.73,
          height: size * 0.38,
          background: "var(--gold)",
          filter: "blur(14px)",
          opacity: 0.6,
        }}
      />
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        className="relative"
      >
        <path
          d="M24 6 L40 17.5 L24 29 L8 17.5 Z"
          fill="none"
          stroke="var(--signal)"
          strokeOpacity="0.45"
          strokeWidth="2.2"
        />
        <path
          d="M24 12.5 L40 24 L24 35.5 L8 24 Z"
          fill="none"
          stroke="var(--signal)"
          strokeOpacity="0.72"
          strokeWidth="2.2"
        />
        <path
          d="M24 18.5 L34 26 L24 33.5 L14 26 Z"
          fill="var(--signal)"
          fillOpacity="0.95"
        />
        <path
          d="M24 18.5 L34 26 L24 33.5 L14 26 Z"
          fill={`url(#${gradId})`}
          fillOpacity="0.6"
        />
        <defs>
          <linearGradient id={gradId} x1="0" y1="0.4" x2="0" y2="1">
            <stop offset="0" stopColor="var(--signal)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

interface OnboardingShellProps {
  /** Show the diamond mark + MURMUR wordmark header. Defaults to true. */
  showHeader?: boolean;
  /** Optional subtitle under the wordmark (the design's "Your voice layer…"). */
  subtitle?: React.ReactNode;
  /** Optional footnote under the subtitle ("a Stratos House product"). */
  footnote?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Full-screen onboarding shell shared by every step: bg-bg with the radial
 * signal-soft glow, centered column, the breathing nested-diamond mark and
 * MURMUR wordmark. Keeps all four steps in one cohesive visual language.
 */
const OnboardingShell: React.FC<OnboardingShellProps> = ({
  showHeader = true,
  subtitle,
  footnote,
  children,
}) => {
  return (
    <div className="relative h-screen w-screen overflow-auto bg-bg text-text motion-safe:animate-[mur-reveal_0.25s_var(--ease-out-quint)]">
      {/* radial signal glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(85% 60% at 50% 16%, var(--signal-soft), transparent 60%)",
        }}
      />
      <div className="relative flex min-h-full flex-col items-center justify-center px-10 py-12">
        {showHeader && (
          <div className="flex flex-col items-center text-center">
            <MurmurMark />
            <div
              className="mt-2.5 text-text"
              style={{
                font: "600 34px var(--font)",
                letterSpacing: "4px",
              }}
            >
              MURMUR
            </div>
            {subtitle && (
              <div
                className="mt-3 text-text-2"
                style={{ font: "500 15px var(--font)" }}
              >
                {subtitle}
              </div>
            )}
            {footnote && (
              <div className="mt-1.5 font-mono text-xs font-medium text-text-3">
                {footnote}
              </div>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default OnboardingShell;
