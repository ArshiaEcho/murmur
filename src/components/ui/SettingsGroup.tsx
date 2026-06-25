import React from "react";

interface SettingsGroupProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className="space-y-2.5">
      {title && (
        <div className="px-1">
          <h2 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-text-3">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs text-text-3">{description}</p>
          )}
        </div>
      )}
      <div className="overflow-visible rounded-2xl border border-line bg-card">
        <div className="divide-y divide-line">{children}</div>
      </div>
    </div>
  );
};
