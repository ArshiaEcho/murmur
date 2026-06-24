import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useThemeStore } from "../../stores/themeStore";

interface ThemeToggleProps {
  /** "icon" = compact square button (rail/header). "labeled" = icon + text row. */
  variant?: "icon" | "labeled";
  className?: string;
}

/**
 * Light/dark toggle. Defaults to the compact icon button used in the sidebar
 * rail and onboarding chrome. Uses the theme tokens so it recolors itself.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  variant = "icon",
  className = "",
}) => {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isDark = theme === "dark";
  const label = isDark ? t("theme.switchToLight") : t("theme.switchToDark");

  if (variant === "labeled") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        title={label}
        aria-label={label}
        className={`flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-left text-[13px] font-medium text-text-2 transition-colors duration-150 outline-none hover:text-text hover:bg-card-hover focus-visible:ring-2 focus-visible:ring-signal ${className}`}
      >
        {isDark ? (
          <Sun width={18} height={18} className="shrink-0" />
        ) : (
          <Moon width={18} height={18} className="shrink-0" />
        )}
        <span className="truncate">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={label}
      aria-label={label}
      className={`relative flex items-center justify-center w-9 h-9 rounded-full border border-line text-text-2 transition-colors duration-150 outline-none hover:text-signal hover:border-signal hover:bg-signal-soft focus-visible:ring-2 focus-visible:ring-signal ${className}`}
    >
      {isDark ? <Sun width={17} height={17} /> : <Moon width={17} height={17} />}
    </button>
  );
};

export default ThemeToggle;
