import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "compact";
}

export const Input: React.FC<InputProps> = ({
  className = "",
  variant = "default",
  disabled,
  ...props
}) => {
  const baseClasses =
    "text-sm font-medium text-text bg-card-2 border border-line-2 rounded-xl text-start transition-[background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out-quint)] placeholder:text-text-3";

  const interactiveClasses = disabled
    ? "opacity-60 cursor-not-allowed border-line"
    : "hover:border-signal focus:outline-none focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal";

  const variantClasses = {
    default: "px-3 py-2",
    compact: "px-2 py-1",
  } as const;

  return (
    <input
      className={`${baseClasses} ${variantClasses[variant]} ${interactiveClasses} ${className}`}
      disabled={disabled}
      {...props}
    />
  );
};
