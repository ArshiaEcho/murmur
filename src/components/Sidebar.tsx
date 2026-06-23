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
  Bot,
} from "lucide-react";
import HandyTextLogo from "./icons/HandyTextLogo";
import StratosMark from "./icons/StratosMark";
import { Overview } from "./settings/overview/Overview";
import { ConversationSettings } from "./settings/conversation/ConversationSettings";
import { AgentsSettings } from "./settings/agents/AgentsSettings";
import stratLogo from "../assets/strat-logo.png";
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
    icon: StratosMark,
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
  conversation: {
    labelKey: "sidebar.conversation",
    icon: MessageSquare,
    component: ConversationSettings,
    enabled: () => true,
  },
  agents: {
    labelKey: "sidebar.agents",
    icon: Bot,
    component: AgentsSettings,
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
    <div className="flex flex-col w-40 h-full border-e border-mid-gray/20 items-center px-2">
      <div className="flex flex-row items-center justify-center gap-2 mt-4 mb-2">
        <img
          src={stratLogo}
          alt="Strat"
          draggable={false}
          className="w-9 h-9 select-none shrink-0"
        />
        <HandyTextLogo width={72} className="shrink-0" />
      </div>
      <div className="flex flex-col w-full items-center gap-1 pt-2 border-t border-mid-gray/20">
        {availableSections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <div
              key={section.id}
              className={`flex gap-2 items-center p-2 w-full rounded-lg cursor-pointer transition-all duration-150 ${
                isActive
                  ? "bg-logo-primary/15 text-logo-primary font-medium"
                  : "text-text/80 hover:text-text hover:bg-mid-gray/15"
              }`}
              onClick={() => onSectionChange(section.id)}
            >
              <Icon width={24} height={24} className="shrink-0" />
              <p
                className="text-sm font-medium truncate"
                title={t(section.labelKey)}
              >
                {t(section.labelKey)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
