import React from "react";
import { ChevronRight } from "lucide-react";
import { StatusDot, type ChipState } from "./fields";

interface SummaryCardProps {
  icon: React.ComponentType<any>;
  title: string;
  onOpen: () => void;
  status?: ChipState;
  children?: React.ReactNode;
}

// A read-only, fully-clickable summary card for the Overview home. The whole
// card deep-links into the matching settings section.
export const SummaryCard: React.FC<SummaryCardProps> = ({
  icon: Icon,
  title,
  onOpen,
  status,
  children,
}) => (
  <button
    type="button"
    onClick={onOpen}
    aria-label={title}
    className="group flex min-h-[112px] w-full flex-col gap-3 rounded-2xl border border-line bg-card p-[17px] text-left transition-colors duration-150 [transition-timing-function:var(--ease-out-quint)] hover:bg-card-hover hover:border-line-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
  >
    <div className="flex items-center gap-2.5">
      <Icon width={18} height={18} className="shrink-0 text-text-2" />
      <span className="text-sm font-semibold text-text truncate">{title}</span>
      <span className="ml-auto flex items-center gap-2">
        {status && <StatusDot state={status} />}
        <ChevronRight className="h-[15px] w-[15px] text-text-3 transition-transform duration-150 [transition-timing-function:var(--ease-out-quint)] motion-safe:group-hover:translate-x-0.5" />
      </span>
    </div>
    <div className="mt-auto flex flex-col gap-1.5">{children}</div>
  </button>
);
