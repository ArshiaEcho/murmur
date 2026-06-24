import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Cog,
  FlaskConical,
  History,
  Info,
  Sparkles,
  Cpu,
  Volume2,
  LayoutGrid,
  MessageSquare,
  ScrollText,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  PinOff,
} from "lucide-react";
import StratLogo from "./icons/StratLogo";
import { ThemeToggle } from "./ui/ThemeToggle";
import { useSidebarStore } from "../stores/sidebarStore";
import { Overview } from "./settings/overview/Overview";
import { SessionsView } from "./settings/sessions/SessionsView";
import { useSettings } from "../hooks/useSettings";
import {
  GeneralSettings,
  AdvancedSettings,
  HistorySettings,
  DebugSettings,
  AboutSettings,
  PostProcessingSettings,
  ModelsSettings,
  ReadAloudSettings,
  ChangelogSettings,
} from "./settings";

export type SidebarSection = keyof typeof SECTIONS_CONFIG;

interface IconProps {
  width?: number | string;
  height?: number | string;
  size?: number | string;
  className?: string;
  [key: string]: any;
}

interface SectionConfig {
  labelKey: string;
  icon: React.ComponentType<IconProps>;
  component: React.ComponentType;
  enabled: (settings: any) => boolean;
}

export const SECTIONS_CONFIG = {
  overview: {
    labelKey: "sidebar.overview",
    icon: LayoutGrid,
    component: Overview,
    enabled: () => true,
  },
  general: {
    labelKey: "sidebar.general",
    icon: StratLogo,
    component: GeneralSettings,
    enabled: () => true,
  },
  models: {
    labelKey: "sidebar.models",
    icon: Cpu,
    component: ModelsSettings,
    enabled: () => true,
  },
  readAloud: {
    labelKey: "sidebar.readAloud",
    icon: Volume2,
    component: ReadAloudSettings,
    enabled: () => true,
  },
  sessions: {
    labelKey: "sidebar.sessions",
    icon: MessageSquare,
    component: SessionsView,
    enabled: () => true,
  },
  advanced: {
    labelKey: "sidebar.advanced",
    icon: Cog,
    component: AdvancedSettings,
    enabled: () => true,
  },
  history: {
    labelKey: "sidebar.history",
    icon: History,
    component: HistorySettings,
    enabled: () => true,
  },
  postprocessing: {
    labelKey: "sidebar.postProcessing",
    icon: Sparkles,
    component: PostProcessingSettings,
    enabled: (settings) => settings?.post_process_enabled ?? false,
  },
  debug: {
    labelKey: "sidebar.debug",
    icon: FlaskConical,
    component: DebugSettings,
    enabled: (settings) => settings?.debug_mode ?? false,
  },
  changelog: {
    labelKey: "sidebar.changelog",
    icon: ScrollText,
    component: ChangelogSettings,
    enabled: () => true,
  },
  about: {
    labelKey: "sidebar.about",
    icon: Info,
    component: AboutSettings,
    enabled: () => true,
  },
} as const satisfies Record<string, SectionConfig>;

interface SidebarProps {
  activeSection: SidebarSection;
  onSectionChange: (section: SidebarSection) => void;
}

const RAIL_NARROW = 60;
const RAIL_WIDE = 212;

/**
 * Collapsible + lockable navigation rail.
 *  - Pinned (locked) + expanded: full-width icons + text, in-flow (content shifts).
 *  - Pinned + collapsed: the narrow icon rail, in-flow.
 *  - Unlocked: narrow rail that expands as a hover overlay (content does not jump).
 * State persists via sidebarStore (localStorage). Uses the real Stratos House logo.
 */
export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const expanded = useSidebarStore((s) => s.expanded);
  const locked = useSidebarStore((s) => s.locked);
  const toggleExpanded = useSidebarStore((s) => s.toggleExpanded);
  const toggleLocked = useSidebarStore((s) => s.toggleLocked);
  const [hovering, setHovering] = useState(false);

  // Visual width vs the in-flow footprint. When unlocked, the rail keeps a narrow
  // footprint and the expanded panel floats over the content on hover.
  const wide = locked ? expanded : hovering;
  const footprint = locked && expanded ? RAIL_WIDE : RAIL_NARROW;
  const overlay = wide && footprint === RAIL_NARROW;

  const availableSections = Object.entries(SECTIONS_CONFIG)
    .filter(([_, config]) => config.enabled(settings))
    .map(([id, config]) => ({ id: id as SidebarSection, ...config }));

  const railBtn =
    "flex items-center justify-center w-9 h-9 rounded-full border border-line text-text-2 transition-colors duration-150 outline-none hover:text-signal hover:border-signal hover:bg-signal-soft focus-visible:ring-2 focus-visible:ring-signal";

  return (
    <div
      className="relative shrink-0 h-full transition-[width] duration-200 ease-[var(--ease-out-quint)]"
      style={{ width: footprint }}
      onMouseEnter={() => !locked && setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <aside
        data-tauri-drag-region
        style={{ width: wide ? RAIL_WIDE : RAIL_NARROW }}
        className={`absolute inset-y-0 start-0 z-30 flex flex-col bg-bg-2 border-e border-line pt-[42px] pb-3 transition-[width] duration-200 ease-[var(--ease-out-quint)] ${
          overlay ? "shadow-[var(--elev-3)]" : ""
        }`}
      >
        {/* Brand — the real Stratos House logo (glows gold in dark via .sidebar-logo) */}
        <div
          className={`flex items-center mb-4 ${
            wide ? "px-[18px] gap-2.5" : "justify-center"
          }`}
        >
          <button
            type="button"
            onClick={() => onSectionChange("overview")}
            title="Murmur"
            aria-label={t("sidebar.overview")}
            className="sidebar-logo shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            <StratLogo size={30} />
          </button>
          {wide && (
            <span
              className="font-semibold text-[14px] text-text whitespace-nowrap"
              style={{ letterSpacing: "2.5px" }}
            >
              MURMUR
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav
          className={`flex flex-col gap-1 flex-1 overflow-y-auto overflow-x-hidden ${
            wide ? "px-3" : "items-center px-2"
          }`}
        >
          {availableSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            const label = t(section.labelKey);

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSectionChange(section.id)}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
                title={wide ? undefined : label}
                className={`relative flex items-center rounded-[10px] transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-signal ${
                  wide
                    ? "gap-3 px-2.5 py-2 w-full text-left text-[13px] font-medium"
                    : "justify-center w-10 h-10"
                } ${
                  isActive
                    ? `bg-signal-soft text-signal${wide ? " font-semibold" : ""}`
                    : "text-text-2 hover:text-text hover:bg-card-hover"
                }`}
              >
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute start-0 top-1/2 -translate-y-1/2 h-5 w-[2.5px] rounded-full bg-signal"
                  />
                )}
                <Icon width={19} height={19} className="shrink-0" />
                {wide && <span className="truncate">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Controls: theme · collapse (when pinned) · lock */}
        <div
          className={`mt-2 shrink-0 flex ${
            wide ? "px-3 items-center gap-1" : "flex-col items-center gap-1"
          }`}
        >
          <ThemeToggle variant="icon" />
          {locked && (
            <button
              type="button"
              onClick={toggleExpanded}
              title={expanded ? t("sidebar.collapse") : t("sidebar.expand")}
              aria-label={expanded ? t("sidebar.collapse") : t("sidebar.expand")}
              className={`${railBtn} ${wide ? "ms-auto" : ""}`}
            >
              {expanded ? (
                <PanelLeftClose width={16} height={16} />
              ) : (
                <PanelLeftOpen width={16} height={16} />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={toggleLocked}
            title={locked ? t("sidebar.unpin") : t("sidebar.pin")}
            aria-label={locked ? t("sidebar.unpin") : t("sidebar.pin")}
            aria-pressed={locked}
            className={railBtn}
          >
            {locked ? <Pin width={16} height={16} /> : <PinOff width={16} height={16} />}
          </button>
        </div>
      </aside>
    </div>
  );
};
