import React from "react";
import SelectComponent from "react-select";
import CreatableSelect from "react-select/creatable";
import type {
  ActionMeta,
  Props as ReactSelectProps,
  SingleValue,
  StylesConfig,
} from "react-select";

export type SelectOption = {
  value: string;
  label: string;
  isDisabled?: boolean;
};

type BaseProps = {
  value: string | null;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  isClearable?: boolean;
  onChange: (value: string | null, action: ActionMeta<SelectOption>) => void;
  onBlur?: () => void;
  className?: string;
  formatCreateLabel?: (input: string) => string;
};

type CreatableProps = {
  isCreatable: true;
  onCreateOption: (value: string) => void;
};

type NonCreatableProps = {
  isCreatable?: false;
  onCreateOption?: never;
};

export type SelectProps = BaseProps & (CreatableProps | NonCreatableProps);

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base, state) => ({
    ...base,
    minHeight: 40,
    borderRadius: 12,
    borderColor: state.isFocused ? "var(--signal)" : "var(--line-2)",
    boxShadow: state.isFocused ? "0 0 0 2px var(--signal)" : "none",
    backgroundColor: "var(--card-2)",
    fontSize: "0.875rem",
    color: "var(--text)",
    transition:
      "border-color 150ms cubic-bezier(0.22,1,0.36,1), box-shadow 150ms cubic-bezier(0.22,1,0.36,1)",
    ":hover": {
      borderColor: "var(--signal)",
    },
  }),
  valueContainer: (base) => ({
    ...base,
    paddingInline: 12,
    paddingBlock: 6,
  }),
  input: (base) => ({
    ...base,
    color: "var(--text)",
  }),
  singleValue: (base) => ({
    ...base,
    color: "var(--text)",
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: "var(--line-2)",
  }),
  dropdownIndicator: (base, state) => ({
    ...base,
    color: state.isFocused ? "var(--signal-ink)" : "var(--text-3)",
    ":hover": {
      color: "var(--signal-ink)",
    },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: "var(--text-3)",
    ":hover": {
      color: "var(--signal-ink)",
    },
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 30,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "var(--card-2)",
    color: "var(--text)",
    border: "1px solid var(--line-2)",
    boxShadow: "var(--shadow)",
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "var(--signal-soft)"
      : state.isFocused
        ? "var(--card-hover)"
        : "transparent",
    color: state.isSelected ? "var(--signal-ink)" : "var(--text)",
    fontWeight: state.isSelected ? 600 : 400,
    cursor: state.isDisabled ? "not-allowed" : base.cursor,
    opacity: state.isDisabled ? 0.5 : 1,
    ":active": {
      backgroundColor: "var(--card-hover)",
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: "var(--text-3)",
  }),
};

export const Select: React.FC<SelectProps> = React.memo(
  ({
    value,
    options,
    placeholder,
    disabled,
    isLoading,
    isClearable = true,
    onChange,
    onBlur,
    className = "",
    isCreatable,
    formatCreateLabel,
    onCreateOption,
  }) => {
    const selectValue = React.useMemo(() => {
      if (!value) return null;
      const existing = options.find((option) => option.value === value);
      if (existing) return existing;
      return { value, label: value, isDisabled: false };
    }, [value, options]);

    const handleChange = (
      option: SingleValue<SelectOption>,
      action: ActionMeta<SelectOption>,
    ) => {
      onChange(option?.value ?? null, action);
    };

    const sharedProps: Partial<ReactSelectProps<SelectOption, false>> = {
      className,
      classNamePrefix: "app-select",
      value: selectValue,
      options,
      onChange: handleChange,
      placeholder,
      isDisabled: disabled,
      isLoading,
      onBlur,
      isClearable,
      styles: selectStyles,
    };

    if (isCreatable) {
      return (
        <CreatableSelect<SelectOption, false>
          {...sharedProps}
          onCreateOption={onCreateOption}
          formatCreateLabel={formatCreateLabel}
        />
      );
    }

    return <SelectComponent<SelectOption, false> {...sharedProps} />;
  },
);

Select.displayName = "Select";
