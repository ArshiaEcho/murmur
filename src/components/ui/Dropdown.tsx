import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface DropdownProps {
  options: DropdownOption[];
  className?: string;
  selectedValue: string | null;
  onSelect: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  onRefresh?: () => void;
}

export const Dropdown: React.FC<DropdownProps> = ({
  options,
  selectedValue,
  onSelect,
  className = "",
  placeholder = "Select an option...",
  disabled = false,
  onRefresh,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(
    (option) => option.value === selectedValue,
  );

  const handleSelect = (value: string) => {
    onSelect(value);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && onRefresh) onRefresh();
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className={`grid w-full min-w-[200px] grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-line-2 bg-card-2 px-3 py-[7px] text-start text-sm font-medium text-text transition-[background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out-quint)] focus:outline-none focus-visible:border-signal focus-visible:ring-2 focus-visible:ring-signal ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:border-signal"
        }`}
        onClick={handleToggle}
        disabled={disabled}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <svg
          className={`h-3.5 w-3.5 text-text-3 transition-transform duration-200 ease-[var(--ease-out-quint)] ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-line-2 bg-card-2 p-1.5 shadow-[var(--shadow)] [animation:mur-reveal_.15s_var(--ease-out-quint)]">
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-text-3">
              {t("common.noOptionsFound")}
            </div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`w-full rounded-lg px-2.5 py-1.5 text-start text-sm transition-colors duration-150 hover:bg-card-hover ${
                  selectedValue === option.value
                    ? "bg-signal-soft font-semibold text-signal-ink"
                    : "text-text"
                } ${option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
                onClick={() => handleSelect(option.value)}
                disabled={option.disabled}
              >
                <span className="whitespace-normal break-words">
                  {option.label}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};
