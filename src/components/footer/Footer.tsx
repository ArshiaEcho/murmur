import React, { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";

import ModelSelector from "../model-selector";
import UpdateChecker from "../update-checker";

const Footer: React.FC = () => {
  const [version, setVersion] = useState("");

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const appVersion = await getVersion();
        setVersion(appVersion);
      } catch (error) {
        console.error("Failed to get app version:", error);
        setVersion("0.1.2");
      }
    };

    fetchVersion();
  }, []);

  return (
    <footer className="w-full flex items-center gap-3 border-t border-line bg-bg-2 px-4 py-2">
      {/* Model selector (live model store + dropdown) on the left */}
      <div className="flex items-center gap-2 min-w-0">
        <ModelSelector />
      </div>

      {/* Update status + version, right-aligned mono */}
      <div className="ms-auto flex items-center gap-2 font-mono text-[11px] text-text-3">
        <UpdateChecker />
        <span aria-hidden="true">·</span>
        {/* eslint-disable-next-line i18next/no-literal-string */}
        <span className="tabular-nums">v{version}</span>
      </div>
    </footer>
  );
};

export default Footer;
