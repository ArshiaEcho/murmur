import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingContainer } from "../ui/SettingContainer";
import { useThemeStore, type Theme } from "../../stores/themeStore";

interface ThemeSettingProps {
  grouped?: boolean;
}

/**
 * Appearance row: a Light/Dark segmented control bound to the frontend theme
 * store (localStorage-persisted, flips the `.dark` class on <html>). Active
 * segment is neutral-raised, not gold — gold stays reserved for the CTA.
 */
export const ThemeSetting: React.FC<ThemeSettingProps> = ({
  grouped = true,
}) => {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  const options: { value: Theme; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: t("theme.light"), Icon: Sun },
    { value: "dark", label: t("theme.dark"), Icon: Moon },
  ];

  return (
    <SettingContainer
      title={t("theme.title")}
      description={t("theme.description")}
      descriptionMode="tooltip"
      grouped={grouped}
    >
      <div className="inline-flex items-center gap-1 rounded-full border border-line bg-bg-2 p-1">
        {options.map(({ value, label, Icon }) => {
          const active = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-signal ${
                active
                  ? "bg-card-2 text-text shadow-[var(--elev-1)]"
                  : "text-text-2 hover:text-text"
              }`}
            >
              <Icon width={14} height={14} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </SettingContainer>
  );
};
