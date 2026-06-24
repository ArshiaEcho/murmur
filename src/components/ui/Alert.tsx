import React from "react";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";

type AlertVariant = "error" | "warning" | "info" | "success";

interface AlertProps {
  variant?: AlertVariant;
  /** When true, removes rounded corners for use inside containers */
  contained?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  { container: string; icon: string; text: string }
> = {
  error: {
    container: "bg-danger-soft",
    icon: "text-danger",
    text: "text-danger",
  },
  warning: {
    container: "bg-warn-soft",
    icon: "text-warn",
    text: "text-warn",
  },
  info: {
    container: "bg-signal-soft",
    icon: "text-signal",
    text: "text-signal",
  },
  success: {
    container: "bg-ok-soft",
    icon: "text-ok",
    text: "text-ok",
  },
};

const variantIcons: Record<AlertVariant, React.ElementType> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

export const Alert: React.FC<AlertProps> = ({
  variant = "error",
  contained = false,
  children,
  className = "",
}) => {
  const styles = variantStyles[variant];
  const Icon = variantIcons[variant];

  return (
    <div
      className={`flex items-start gap-3 p-4 ${styles.container} ${contained ? "" : "rounded-xl"} ${className}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`} />
      <p className={`text-sm leading-relaxed ${styles.text}`}>{children}</p>
    </div>
  );
};
