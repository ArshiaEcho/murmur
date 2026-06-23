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
    className="group w-full text-left p-4 rounded-xl border border-mid-gray/20 bg-background hover:bg-mid-gray/10 hover:border-logo-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-logo-primary"
  >
    <div className="flex items-center gap-2 mb-2">
      <Icon width={18} height={18} className="shrink-0 text-logo-primary" />
      <span className="font-semibold text-sm flex-1 truncate">{title}</span>
      {status && <StatusDot state={status} />}
      <ChevronRight className="h-4 w-4 text-mid-gray opacity-60 group-hover:translate-x-0.5 transition-transform" />
    </div>
    <div className="space-y-1">{children}</div>
  </button>
);
