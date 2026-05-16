/**
 * FindX Design System — FormBuilder Component
 * 
 * A dynamic form builder that generates forms from configuration.
 * Supports validation, conditional fields, and complex layouts.
 * 
 * Design Tokens Used:
 * - --findx-text-primary (labels, text)
 * - --findx-text-secondary (descriptions)
 * - --findx-text-muted (placeholders, hints)
 * - --findx-feedback-danger (errors)
 * - --findx-feedback-success (success states)
 * - --findx-border-default (borders)
 * - --findx-border-focus (focus states)
 * - --findx-radius-md (border radius)
 * - --findx-space-2/3/4 (spacing)
 * - --findx-duration-fast (transitions)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { z, type ZodSchema, type ZodError } from "zod";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "url"
  | "search"
  | "textarea"
  | "select"
  | "multiselect"
  | "checkbox"
  | "switch"
  | "radio"
  | "date"
  | "datetime"
  | "time"
  | "file"
  | "color"
  | "range"
  | "hidden";

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
  group?: string;
}

export interface FieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  patternMessage?: string;
  custom?: (value: any, allValues: Record<string, any>) => string | null;
  schema?: ZodSchema;
}

export interface FieldCondition {
  field: string;
  operator: "equals" | "notEquals" | "contains" | "notContains" | "greaterThan" | "lessThan" | "isEmpty" | "isNotEmpty";
  value?: any;
}

export interface FormField {
  /** Unique field identifier */
  id: string;
  /** Field type */
  type: FieldType;
  /** Field label */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Help text below field */
  helpText?: string;
  /** Default value */
  defaultValue?: any;
  /** Placeholder in form layout */
  width?: "full" | "1/2" | "1/3" | "2/3" | "1/4" | "3/4";
  /** Validation rules */
  validation?: FieldValidation;
  /** Conditional visibility */
  showWhen?: FieldCondition;
  /** Select options (for select, multiselect, radio) */
  options?: SelectOption[];
  /** File upload configuration */
  accept?: string;
  maxFileSize?: number; // in bytes
  multiple?: boolean;
  /** Range slider configuration */
  min?: number;
  max?: number;
  step?: number;
  /** Custom CSS class */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Readonly state */
  readOnly?: boolean;
  /** Autocomplete attribute */
  autoComplete?: string;
  /** Input mode */
  inputMode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
}

export interface FormSection {
  /** Section identifier */
  id: string;
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Section icon */
  icon?: React.ReactNode;
  /** Fields in this section */
  fields: FormField[];
  /** Section layout */
  layout?: "stack" | "grid" | "inline";
  /** Collapsible section */
  collapsible?: boolean;
  /** Default collapsed */
  defaultCollapsed?: boolean;
  /** Conditional visibility */
  showWhen?: FieldCondition;
}

export interface FormBuilderProps {
  /** Form configuration */
  sections: FormSection[];
  /** Initial values */
  initialValues?: Record<string, any>;
  /** Zod schema for validation */
  schema?: ZodSchema;
  /** Submit handler */
  onSubmit?: (values: Record<string, any>, helpers: FormHelpers) => Promise<void> | void;
  /** Change handler (debounced) */
  onChange?: (values: Record<string, any>, errors: Record<string, string>) => void;
  /** Reset handler */
  onReset?: () => void;
  /** Submit button text */
  submitText?: string;
  /** Reset button text */
  resetText?: string;
  /** Show reset button */
  showReset?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Layout direction */
  direction?: "vertical" | "horizontal";
  /** Gap between fields */
  gap?: "none" | "sm" | "md" | "lg";
  /** Form class */
  className?: string;
}

export interface FormHelpers {
  setValue: (field: string, value: any) => void;
  getValue: (field: string) => any;
  setError: (field: string, message: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;
  reset: (values?: Record<string, any>) => void;
  validate: () => Promise<boolean>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const getFieldValue = (field: FormField, values: Record<string, any>): any => {
  return values[field.id] ?? field.defaultValue ?? "";
};

const isFieldVisible = (field: FormField, values: Record<string, any>): boolean => {
  if (!field.showWhen) return true;
  const { field: targetField, operator, value } = field.showWhen;
  const fieldValue = values[targetField];

  switch (operator) {
    case "equals": return fieldValue === value;
    case "notEquals": return fieldValue !== value;
    case "contains": return String(fieldValue).includes(String(value));
    case "notContains": return !String(fieldValue).includes(String(value));
    case "greaterThan": return Number(fieldValue) > Number(value);
    case "lessThan": return Number(fieldValue) < Number(value);
    case "isEmpty": return !fieldValue || fieldValue === "";
    case "isNotEmpty": return !!fieldValue && fieldValue !== "";
    default: return true;
  }
};

const validateField = (field: FormField, value: any, allValues: Record<string, any>): string | null => {
  const { validation } = field;
  if (!validation) return null;

  // Required check
  if (validation.required && (!value || (typeof value === "string" && !value.trim()))) {
    return `${field.label || field.id} is required`;
  }

  // Skip other validations if empty and not required
  if (!value || (typeof value === "string" && !value.trim())) return null;

  // String validations
  if (typeof value === "string") {
    if (validation.minLength && value.length < validation.minLength) {
      return `${field.label || field.id} must be at least ${validation.minLength} characters`;
    }
    if (validation.maxLength && value.length > validation.maxLength) {
      return `${field.label || field.id} must be at most ${validation.maxLength} characters`;
    }
    if (validation.pattern && !validation.pattern.test(value)) {
      return validation.patternMessage || `${field.label || field.id} format is invalid`;
    }
  }

  // Number validations
  if (typeof value === "number" || !isNaN(Number(value))) {
    const numValue = Number(value);
    if (validation.min !== undefined && numValue < validation.min) {
      return `${field.label || field.id} must be at least ${validation.min}`;
    }
    if (validation.max !== undefined && numValue > validation.max) {
      return `${field.label || field.id} must be at most ${validation.max}`;
    }
  }

  // Custom validation
  if (validation.custom) {
    return validation.custom(value, allValues);
  }

  return null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORM INPUT COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

interface InputFieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

const TextInput: React.FC<InputFieldProps> = ({ field, value, onChange, error, disabled }) => {
  const baseClasses = cn(
    "w-full h-[var(--findx-space-9)] px-[var(--findx-space-3)]",
    "bg-[var(--findx-bg-subtle)] border rounded-[var(--findx-radius-md)]",
    "text-sm text-[var(--findx-text-primary)]",
    "placeholder:text-[var(--findx-text-muted)]",
    "transition-colors duration-[var(--findx-duration-fast)]",
    "focus:outline-none",
    error
      ? "border-[var(--findx-feedback-danger)] focus:ring-2 focus:ring-[var(--findx-feedback-danger-bg)]"
      : "border-[var(--findx-border-default)] focus:border-[var(--findx-border-focus)] focus:ring-2 focus:ring-[var(--findx-accent-subtle)]",
    disabled && "opacity-50 cursor-not-allowed"
  );

  if (field.type === "textarea") {
    return (
      <textarea
        id={field.id}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        disabled={disabled || field.disabled}
        rows={4}
        className={cn(baseClasses, "h-auto min-h-[var(--findx-space-20)] py-[var(--findx-space-3)] resize-y")}
        aria-invalid={!!error}
        aria-describedby={error ? `${field.id}-error` : undefined}
      />
    );
  }

  return (
    <input
      id={field.id}
      type={field.type}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled || field.disabled}
      readOnly={field.readOnly}
      autoComplete={field.autoComplete}
      inputMode={field.inputMode}
      min={field.min}
      max={field.max}
      step={field.step}
      className={baseClasses}
      aria-invalid={!!error}
      aria-describedby={error ? `${field.id}-error` : undefined}
    />
  );
};

const SelectInput: React.FC<InputFieldProps> = ({ field, value, onChange, error, disabled }) => {
  const isMulti = field.type === "multiselect";

  return (
    <select
      id={field.id}
      multiple={isMulti}
      value={value || (isMulti ? [] : "")}
      onChange={(e) => {
        if (isMulti) {
          const selected = Array.from(e.target.selectedOptions).map((opt) => opt.value);
          onChange(selected);
        } else {
          onChange(e.target.value);
        }
      }}
      disabled={disabled || field.disabled}
      className={cn(
        "w-full min-h-[var(--findx-space-9)] px-[var(--findx-space-3)]",
        "bg-[var(--findx-bg-subtle)] border rounded-[var(--findx-radius-md)]",
        "text-sm text-[var(--findx-text-primary)]",
        "transition-colors duration-[var(--findx-duration-fast)]",
        "focus:outline-none",
        error
          ? "border-[var(--findx-feedback-danger)]"
          : "border-[var(--findx-border-default)] focus:border-[var(--findx-border-focus)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      aria-invalid={!!error}
    >
      {!isMulti && <option value="">{field.placeholder || "Select..."}</option>}
      {field.options?.map((opt) => (
        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};

const CheckboxInput: React.FC<InputFieldProps> = ({ field, value, onChange, error, disabled }) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        id={field.id}
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled || field.disabled}
        className={cn(
          "w-[18px] h-[18px] rounded-[var(--findx-radius-sm)]",
          "border transition-all duration-[var(--findx-duration-fast)]",
          "flex items-center justify-center",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--findx-accent)]",
          value
            ? "bg-[var(--findx-accent)] border-[var(--findx-accent)] text-[var(--findx-accent-foreground)]"
            : "bg-[var(--findx-bg-subtle)] border-[var(--findx-border-default)] group-hover:border-[var(--findx-border-strong)]",
          (disabled || field.disabled) && "opacity-50 cursor-not-allowed"
        )}
      />
      {field.label && (
        <span className="text-sm text-[var(--findx-text-primary)]">{field.label}</span>
      )}
    </label>
  );
};

const SwitchInput: React.FC<InputFieldProps> = ({ field, value, onChange, error, disabled }) => {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={!!value}
        id={field.id}
        disabled={disabled || field.disabled}
        onClick={() => onChange(!value)}
        className={cn(
          "relative w-11 h-6 rounded-full transition-colors duration-[var(--findx-duration-fast)]",
          value
            ? "bg-[var(--findx-accent)]"
            : "bg-[var(--findx-border-default)]",
          (disabled || field.disabled) && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-[var(--findx-shadow-sm)]",
            "transition-transform duration-[var(--findx-duration-fast)]",
            value && "translate-x-5"
          )}
        />
      </button>
      {field.label && (
        <label htmlFor={field.id} className="text-sm text-[var(--findx-text-primary)] cursor-pointer">
          {field.label}
        </label>
      )}
    </div>
  );
};

const RadioInput: React.FC<InputFieldProps> = ({ field, value, onChange, disabled }) => {
  return (
    <div className="space-y-2">
      {field.options?.map((opt) => (
        <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
          <input
            type="radio"
            id={`${field.id}-${opt.value}`}
            name={field.id}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            disabled={disabled || field.disabled || opt.disabled}
            className={cn(
              "w-[18px] h-[18px] rounded-full",
              "border transition-all duration-[var(--findx-duration-fast)]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--findx-accent)]",
              value === opt.value
                ? "border-[var(--findx-accent)] bg-[var(--findx-accent)]"
                : "border-[var(--findx-border-default)] group-hover:border-[var(--findx-border-strong)]",
              (disabled || field.disabled) && "opacity-50 cursor-not-allowed"
            )}
          />
          <span className="text-sm text-[var(--findx-text-primary)]">{opt.label}</span>
        </label>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD RENDERER
// ═══════════════════════════════════════════════════════════════════════════════

interface FieldRendererProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

const FieldRenderer: React.FC<FieldRendererProps> = ({ field, value, onChange, error, disabled }) => {
  const props = { field, value, onChange, error, disabled };

  switch (field.type) {
    case "select":
    case "multiselect":
      return <SelectInput {...props} />;
    case "checkbox":
      return <CheckboxInput {...props} />;
    case "switch":
      return <SwitchInput {...props} />;
    case "radio":
      return <RadioInput {...props} />;
    case "textarea":
    case "text":
    case "email":
    case "password":
    case "number":
    case "tel":
    case "url":
    case "search":
    case "date":
    case "datetime":
    case "time":
    case "color":
    case "range":
      return <TextInput {...props} />;
    default:
      return null;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FORM BUILDER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const FormBuilder: React.FC<FormBuilderProps> = ({
  sections,
  initialValues = {},
  schema,
  onSubmit,
  onChange,
  onReset,
  submitText = "Submit",
  resetText = "Reset",
  showReset = true,
  loading = false,
  disabled = false,
  direction = "vertical",
  gap = "md",
  className,
}) => {
  // Form state
  const [values, setValues] = React.useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = React.useState(false);

  // Helpers
  const helpers: FormHelpers = {
    setValue: (field, value) => {
      setValues((prev) => {
        const newValues = { ...prev, [field]: value };
        onChange?.(newValues, errors);
        return newValues;
      });
    },
    getValue: (field) => values[field],
    setError: (field, message) => setErrors((prev) => ({ ...prev, [field]: message })),
    clearError: (field) => setErrors((prev) => {
      const { [field]: _, ...rest } = prev;
      return rest;
    }),
    clearAllErrors: () => setErrors({}),
    reset: (newValues) => {
      setValues(newValues ?? initialValues);
      setErrors({});
      setTouched({});
      onReset?.();
    },
    validate: async () => {
      const newErrors: Record<string, string> = {};
      for (const section of sections) {
        for (const field of section.fields) {
          if (isFieldVisible(field, values)) {
            const error = validateField(field, values[field.id], values);
            if (error) newErrors[field.id] = error;
          }
        }
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
  };

  // Handle field change
  const handleChange = (fieldId: string, value: any) => {
    setValues((prev) => {
      const newValues = { ...prev, [fieldId]: value };
      
      // Clear error when field is modified
      if (errors[fieldId]) {
        setErrors((prevErrors) => {
          const { [fieldId]: _, ...rest } = prevErrors;
          return rest;
        });
      }
      
      onChange?.(newValues, errors);
      return newValues;
    });
  };

  // Handle field blur
  const handleBlur = (fieldId: string) => {
    setTouched((prev) => ({ ...prev, [fieldId]: true }));
    
    // Validate on blur
    const section = sections.find((s) => s.fields.some((f) => f.id === fieldId));
    const field = section?.fields.find((f) => f.id === fieldId);
    if (field) {
      const error = validateField(field, values[fieldId], values);
      if (error) {
        setErrors((prev) => ({ ...prev, [fieldId]: error }));
      }
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const isValid = await helpers.validate();
    if (!isValid) return;

    setSubmitting(true);
    try {
      await onSubmit?.(values, helpers);
    } finally {
      setSubmitting(false);
    }
  };

  // Gap value
  const gapValue = gap === "none" ? "0" : gap === "sm" ? "var(--findx-space-2)" : gap === "lg" ? "var(--findx-space-6)" : "var(--findx-space-4)";

  // Width class based on field width
  const getWidthClass = (width?: string) => {
    switch (width) {
      case "1/2": return "w-1/2";
      case "1/3": return "w-1/3";
      case "2/3": return "w-2/3";
      case "1/4": return "w-1/4";
      case "3/4": return "w-3/4";
      default: return "w-full";
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-6", className)}
      noValidate
    >
      {sections.map((section) => {
        // Check section visibility
        if (section.showWhen && !isFieldVisible({ showWhen: section.showWhen } as FormField, values)) {
          return null;
        }

        return (
          <div key={section.id} className="space-y-4">
            {/* Section Header */}
            {section.title && (
              <div className="flex items-center gap-3">
                {section.icon && <span className="text-[var(--findx-text-muted)]">{section.icon}</span>}
                <h3 className="text-base font-semibold text-[var(--findx-text-primary)]">
                  {section.title}
                </h3>
                {section.description && (
                  <p className="text-sm text-[var(--findx-text-secondary)]">{section.description}</p>
                )}
              </div>
            )}

            {/* Section Fields */}
            <div
              className={cn(
                direction === "horizontal" ? "flex flex-wrap" : "flex flex-col",
                section.layout === "grid" && "grid grid-cols-2 gap-x-6",
                section.layout === "inline" && "flex flex-row flex-wrap items-end"
              )}
              style={{ gap: gapValue }}
            >
              {section.fields.map((field) => {
                // Check field visibility
                if (!isFieldVisible(field, values)) return null;

                const value = getFieldValue(field, values);
                const error = touched[field.id] ? errors[field.id] : undefined;
                const showError = !!error;

                return (
                  <div
                    key={field.id}
                    className={cn(
                      "flex flex-col gap-1.5",
                      getWidthClass(field.width),
                      section.layout === "inline" && field.type !== "checkbox" && field.type !== "switch"
                    )}
                  >
                    {/* Label (for non-checkbox/switch types) */}
                    {field.label && field.type !== "checkbox" && field.type !== "switch" && (
                      <label
                        htmlFor={field.id}
                        className={cn(
                          "text-sm font-medium",
                          showError ? "text-[var(--findx-feedback-danger)]" : "text-[var(--findx-text-primary)]"
                        )}
                      >
                        {field.label}
                        {field.validation?.required && (
                          <span className="text-[var(--findx-feedback-danger)] ml-1" aria-hidden="true">*</span>
                        )}
                      </label>
                    )}

                    {/* Input */}
                    <FieldRenderer
                      field={field}
                      value={value}
                      onChange={(newValue) => handleChange(field.id, newValue)}
                      error={showError ? error : undefined}
                      disabled={disabled || loading}
                    />
                    {field.id && (
                      <div
                        onBlur={() => handleBlur(field.id)}
                      />
                    )}

                    {/* Error message */}
                    {showError && (
                      <p id={`${field.id}-error`} className="text-xs text-[var(--findx-feedback-danger)]">
                        {error}
                      </p>
                    )}

                    {/* Help text */}
                    {field.helpText && !showError && (
                      <p className="text-xs text-[var(--findx-text-muted)]">{field.helpText}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Form Actions */}
      <div className="flex items-center gap-3 pt-4 border-t border-[var(--findx-border-default)]">
        <button
          type="submit"
          disabled={loading || submitting || disabled}
          className={cn(
            "h-[var(--findx-space-9)] px-[var(--findx-space-4)]",
            "bg-[var(--findx-accent)] text-[var(--findx-accent-foreground)]",
            "rounded-[var(--findx-radius-md)] font-medium text-sm",
            "transition-colors duration-[var(--findx-duration-fast)]",
            "hover:bg-[var(--findx-accent-hover)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--findx-accent)]",
            (loading || submitting) && "cursor-wait"
          )}
        >
          {(loading || submitting) ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
              </svg>
              {submitText}...
            </span>
          ) : (
            submitText
          )}
        </button>

        {showReset && (
          <button
            type="button"
            onClick={() => helpers.reset()}
            disabled={loading || submitting || disabled}
            className={cn(
              "h-[var(--findx-space-9)] px-[var(--findx-space-4)]",
              "bg-[var(--findx-bg-subtle)] text-[var(--findx-text-secondary)]",
              "border border-[var(--findx-border-default)] rounded-[var(--findx-radius-md)] font-medium text-sm",
              "transition-colors duration-[var(--findx-duration-fast)]",
              "hover:bg-[var(--findx-bg-inset)] hover:border-[var(--findx-border-strong)]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {resetText}
          </button>
        )}
      </div>
    </form>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { FormBuilder };
export type {
  FormBuilderProps,
  FormHelpers,
  FormField,
  FormSection,
  FieldType,
  FieldValidation,
  FieldCondition,
  SelectOption,
};