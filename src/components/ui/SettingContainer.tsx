import React, { useEffect, useRef, useState } from "react";
import { Tooltip } from "./Tooltip";

interface SettingContainerProps {
  title: string;
  description: string;
  children: React.ReactNode;
  descriptionMode?: "inline" | "tooltip";
  grouped?: boolean;
  layout?: "horizontal" | "stacked";
  disabled?: boolean;
  tooltipPosition?: "top" | "bottom";
}

export const SettingContainer: React.FC<SettingContainerProps> = ({
  title,
  description,
  children,
  descriptionMode = "tooltip",
  grouped = false,
  layout = "horizontal",
  disabled = false,
  tooltipPosition = "top",
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close tooltip
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node)
      ) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showTooltip]);

  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };

  const titleClasses = `text-[13.5px] font-medium leading-snug text-text ${
    disabled ? "opacity-50" : ""
  }`;

  const infoIcon = (
    <div
      ref={tooltipRef}
      className="relative flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={toggleTooltip}
    >
      <svg
        className="h-3.5 w-3.5 cursor-help text-text-3 transition-colors duration-150 hover:text-signal focus-visible:outline-none focus-visible:text-signal select-none"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-label="More information"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleTooltip();
          }
        }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {showTooltip && (
        <Tooltip targetRef={tooltipRef} position={tooltipPosition}>
          <p className="text-sm text-center leading-relaxed">{description}</p>
        </Tooltip>
      )}
    </div>
  );

  const containerClasses = grouped
    ? "px-[17px] py-[14px]"
    : "px-[17px] py-[14px] rounded-2xl border border-line bg-card";

  if (layout === "stacked") {
    if (descriptionMode === "tooltip") {
      return (
        <div className={containerClasses}>
          <div className="mb-2.5 flex items-center gap-2">
            <h3 className={titleClasses}>{title}</h3>
            {infoIcon}
          </div>
          <div className="w-full">{children}</div>
        </div>
      );
    }

    return (
      <div className={containerClasses}>
        <div className="mb-2.5">
          <h3 className={titleClasses}>{title}</h3>
          <p
            className={`mt-0.5 text-xs leading-relaxed text-text-3 ${
              disabled ? "opacity-50" : ""
            }`}
          >
            {description}
          </p>
        </div>
        <div className="w-full">{children}</div>
      </div>
    );
  }

  // Horizontal layout (default)
  const horizontalContainerClasses = grouped
    ? "flex items-center justify-between gap-4 px-[17px] py-[14px]"
    : "flex items-center justify-between gap-4 px-[17px] py-[14px] rounded-2xl border border-line bg-card";

  if (descriptionMode === "tooltip") {
    return (
      <div className={horizontalContainerClasses}>
        <div className="min-w-0 max-w-2/3">
          <div className="flex items-center gap-2">
            <h3 className={titleClasses}>{title}</h3>
            {infoIcon}
          </div>
        </div>
        <div className="relative flex-none">{children}</div>
      </div>
    );
  }

  return (
    <div className={horizontalContainerClasses}>
      <div className="min-w-0 max-w-2/3">
        <h3 className={titleClasses}>{title}</h3>
        <p
          className={`mt-0.5 text-xs leading-relaxed text-text-3 ${
            disabled ? "opacity-50" : ""
          }`}
        >
          {description}
        </p>
      </div>
      <div className="relative flex-none">{children}</div>
    </div>
  );
};
