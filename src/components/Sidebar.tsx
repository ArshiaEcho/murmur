import React from "react";
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
} from "lucide-react";
import StratLogo from "./icons/StratLogo";
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

/**
 * The nested-diamond Murmur brand mark. Geometry is preserved from the design
 * handoff; strokes use the theme `--signal` token and the lower facet carries a
 * signal→gold vertical gradient so it recolors in light + dark.
 */
const BrandMark: React.FC<{ size?: number }> = ({ size = 28 }) => {
  const gradId = "murmur-mark-gold";
  return (
    <span
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* gold breathing glow behind the lower facet */}
      <span
        className="absolute left-1/2 -translate-x-1/2 rounded-full bg-gold"
        style={{
          top: "62%",
          width: size * 0.79,
          height: size * 0.43,
          filter: "blur(6px)",
          opacity: 0.55,
          animation: "mur-breathe 3.2s var(--ease-out-quint) infinite",
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
          fillOpacity="0.55"
        />
        <defs>
          <linearGradient id={gradId} x1="0" y1="0.4" x2="0" y2="1">
            <stop offset="0" stopColor="var(--signal)" stopOpacity="0" />
            <stop offset="1" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
      </svg>
    </span>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSectionChange,
}) => {
  const { t } = useTranslation();
  const { settings } = useSettings();

  const availableSections = Object.entries(SECTIONS_CONFIG)
    .filter(([_, config]) => config.enabled(settings))
    .map(([id, config]) => ({ id: id as SidebarSection, ...config }));

  return (
    <aside className="flex flex-col w-[212px] shrink-0 h-full bg-bg-2 border-e border-line">
      {/* Brand lockup */}
      <div className="flex items-center gap-2.5 px-[18px] pt-[46px] pb-[18px]">
        <BrandMark size={28} />
        <span
          className="font-semibold text-[14px] text-text"
          style={{ letterSpacing: "2.5px" }}
        >
          MURMUR
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-0.5 px-3 py-1 flex-1 overflow-auto">
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
              title={label}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-[10px] text-left text-[13px] font-medium transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-signal ${
                isActive
                  ? "bg-card text-signal font-semibold shadow-[inset_2.5px_0_0_var(--signal)]"
                  : "text-text-2 hover:text-text hover:bg-card-hover"
              }`}
            >
              <Icon width={18} height={18} className="shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
