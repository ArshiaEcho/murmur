import React from "react";
import ResetIcon from "../icons/ResetIcon";

interface ResetButtonProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  children?: React.ReactNode;
}

export const ResetButton: React.FC<ResetButtonProps> = React.memo(
  ({ onClick, disabled = false, className = "", ariaLabel, children }) => (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`p-1 rounded-lg border border-transparent transition-[background-color,border-color,color,transform] duration-150 ease-[var(--ease-out-quint)] focus:outline-none focus-visible:ring-2 focus-visible:ring-signal ${
        disabled
          ? "opacity-50 cursor-not-allowed text-text-3"
          : "text-text-2 hover:cursor-pointer hover:bg-card-hover hover:border-line-2 hover:text-signal-ink active:translate-y-[1px]"
      } ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children ?? <ResetIcon />}
    </button>
  ),
);
