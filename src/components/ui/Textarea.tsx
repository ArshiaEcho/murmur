import React from "react";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: "default" | "compact";
}

export const Textarea: React.FC<TextareaProps> = ({
  className = "",
  variant = "default",
  ...props
}) => {
  const baseClasses =
    "text-sm font-medium text-text bg-card-2 border border-line-2 rounded-xl text-start resize-y transition-[background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out-quint)] placeholder:text-text-3 hover:border-signal focus:outline-none focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal";

  const variantClasses = {
    default: "px-3 py-2 min-h-[100px]",
    compact: "px-2 py-1 min-h-[80px]",
  };

  return (
    <textarea
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
};
