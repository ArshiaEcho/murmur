import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "primary-soft"
    | "secondary"
    | "live"
    | "danger"
    | "danger-ghost"
    | "ghost";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = "",
  variant = "primary",
  size = "md",
  ...props
}) => {
  // VoiceBox shape: pill buttons (rounded-full). Gold = the single CTA accent.
  const baseClasses =
    "inline-flex items-center justify-center gap-2 font-medium rounded-full border cursor-pointer whitespace-nowrap transition-[background-color,border-color,color,transform,filter] duration-150 ease-[var(--ease-out-quint)] focus:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-50 disabled:cursor-not-allowed";

  const variantClasses = {
    primary:
      "text-on-signal bg-signal border-signal hover:brightness-[1.08] active:brightness-95",
    "primary-soft":
      "text-signal-ink bg-signal-soft border-transparent hover:bg-signal hover:text-on-signal",
    secondary:
      "text-text-2 bg-card border-line-2 hover:text-text hover:border-signal",
    // teal "live" CTA — start session / record (the Murmur touch)
    live: "text-on-live bg-live border-live hover:brightness-[1.08] active:brightness-95",
    danger:
      "text-white bg-danger border-danger hover:brightness-[1.08] active:brightness-95",
    "danger-ghost":
      "text-danger border-transparent hover:bg-danger-soft",
    ghost:
      "text-text-2 border-transparent hover:text-text hover:bg-card-hover",
  };

  const sizeClasses = {
    sm: "px-3 py-1 text-xs",
    md: "px-4 py-[5px] text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
