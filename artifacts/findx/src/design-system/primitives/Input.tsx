/**
 * FindX Design System — Input Components
 * 
 * A comprehensive input system including Input, Textarea, Label, and Form Field.
 * Built with accessibility and semantic design tokens.
 * 
 * Design Tokens Used:
 * - --findx-text-primary (text color)
 * - --findx-text-secondary (placeholder)
 * - --findx-text-muted (disabled text)
 * - --findx-bg-base (background)
 * - --findx-bg-subtle (input background)
 * - --findx-bg-inset (hover background)
 * - --findx-border-default (border color)
 * - --findx-border-strong (focus/hover border)
 * - --findx-border-focus (focus ring)
 * - --findx-radius-md (border radius)
 * - --findx-shadow-sm (focus shadow)
 * - --findx-space-9 (height)
 * - --findx-duration-fast (transition)
 * 
 * @example
 * <Input placeholder="Enter your email" />
 * <Input label="Email" error="Invalid email format" />
 * <FormField label="Password" hint="Minimum 8 characters">
 *   <Input type="password" />
 * </FormField>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error state — shows red border and error message */
  error?: string;
  /** Warning state — shows yellow border */
  warning?: string;
  /** Success state — shows green border and checkmark */
  success?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Full width */
  fullWidth?: boolean;
  /** Left icon */
  leftIcon?: React.ReactElement;
  /** Right icon */
  rightIcon?: React.ReactElement;
  /** Loading state */
  isLoading?: boolean;
  /** Clearable — shows X button to clear value */
  clearable?: boolean;
  /** onClear callback for clearable inputs */
  onClear?: () => void;
}

// Size configurations using design tokens
const inputSizes = {
  sm: {
    height: "var(--findx-space-8)",      // 32px
    paddingX: "var(--findx-space-2.5)",  // 10px
    fontSize: "var(--findx-text-xs)",
    iconSize: "size-4",
  },
  md: {
    height: "var(--findx-space-9)",       // 36px (default)
    paddingX: "var(--findx-space-3)",     // 12px
    fontSize: "var(--findx-text-sm)",
    iconSize: "size-4",
  },
  lg: {
    height: "var(--findx-space-11)",      // 44px
    paddingX: "var(--findx-space-4)",     // 16px
    fontSize: "var(--findx-text-base)",
    iconSize: "size-5",
  },
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      error,
      warning,
      success,
      size = "md",
      fullWidth = true,
      leftIcon,
      rightIcon,
      isLoading,
      clearable,
      onClear,
      disabled,
      ...props
    },
    ref
  ) => {
    const sizeConfig = inputSizes[size];
    const inputId = props.id || React.useId();
    
    // Determine border color based on state
    const getBorderColor = () => {
      if (error) return "var(--findx-feedback-danger)";
      if (warning) return "var(--findx-feedback-warning)";
      if (success) return "var(--findx-feedback-success)";
      return "var(--findx-border-default)";
    };
    
    const getFocusRing = () => {
      if (error) return "0 0 0 2px var(--findx-feedback-danger-bg)";
      if (warning) return "0 0 0 2px var(--findx-feedback-warning-bg)";
      if (success) return "0 0 0 2px var(--findx-feedback-success-bg)";
      return "0 0 0 2px var(--findx-accent-subtle)";
    };

    return (
      <div className={cn("relative", fullWidth && "w-full")}>
        {/* Left Icon */}
        {leftIcon && (
          <div
            className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2",
              "text-[var(--findx-text-muted)]",
              "pointer-events-none",
              sizeConfig.iconSize
            )}
            aria-hidden="true"
          >
            {leftIcon}
          </div>
        )}

        {/* Input */}
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled || isLoading}
          className={cn(
            // Base styles using design tokens
            [
              "flex w-full rounded-[var(--findx-radius-md)]",
              "font-[var(--findx-font-body)]",
              // Typography
              sizeConfig.fontSize,
              // Spacing
              `[height:${sizeConfig.height}]`,
              `[padding-inline-start:${leftIcon ? "var(--findx-space-10)" : sizeConfig.paddingX}]`,
              `[padding-inline-end:${rightIcon || clearable || isLoading ? "var(--findx-space-10)" : sizeConfig.paddingX}]`,
              // Colors
              "bg-[var(--findx-bg-subtle)]",
              "text-[var(--findx-text-primary)]",
              "placeholder:text-[var(--findx-text-muted)]",
              // Border
              "border",
              `[border-color:${getBorderColor()}]`,
              // States
              "transition-all duration-[var(--findx-duration-fast)]",
              "hover:border-[var(--findx-border-strong)]",
              "focus:outline-none",
              `[box-shadow:${getFocusRing()}]`,
              "focus:border-[var(--findx-border-focus)]",
              "disabled:cursor-not-allowed",
              "disabled:opacity-50",
              "disabled:bg-[var(--findx-interactive-disabled)]",
              // RTL support
              "text-start",
              // Loading cursor
              isLoading && "cursor-wait",
            ].join(" "),
            // Error/warning/success styles
            error && "animate-shake",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />

        {/* Right Icons (Loading, Clear, Custom) */}
        {(rightIcon || clearable || isLoading) && (
          <div
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2",
              "flex items-center gap-2",
              sizeConfig.iconSize
            )}
          >
            {isLoading && (
              <div
                className="animate-spin"
                style={{ color: "var(--findx-text-muted)" }}
              >
                {/* Simple spinner */}
                <svg viewBox="0 0 24 24" fill="none" className="size-4">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeOpacity="0.25"
                  />
                  <path
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    opacity="0.75"
                  />
                </svg>
              </div>
            )}
            {rightIcon && !isLoading && (
              <div
                className="text-[var(--findx-text-muted)]"
                aria-hidden="true"
              >
                {rightIcon}
              </div>
            )}
            {clearable && props.value && !isLoading && (
              <button
                type="button"
                onClick={onClear}
                className={cn(
                  "p-1 rounded-[var(--findx-radius-sm)]",
                  "text-[var(--findx-text-muted)]",
                  "hover:bg-[var(--findx-interactive-hover)]",
                  "hover:text-[var(--findx-text-primary)]",
                  "focus:outline-none focus-visible:ring-2",
                  "focus-visible:ring-[var(--findx-border-focus)]"
                )}
                aria-label="Clear input"
                tabIndex={-1}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

// ═══════════════════════════════════════════════════════════════════════════════
// TEXTAREA COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  warning?: string;
  success?: boolean;
  label?: string;
  hint?: string;
  fullWidth?: boolean;
  /** Auto-resize based on content */
  autoResize?: boolean;
  /** Maximum rows before scroll */
  maxRows?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      error,
      warning,
      success,
      label,
      hint,
      fullWidth = true,
      autoResize = false,
      maxRows = 10,
      ...props
    },
    ref
  ) => {
    const textareaId = props.id || React.useId();
    const internalRef = React.useRef<HTMLTextAreaElement>(null);
    const combinedRef = (node: HTMLTextAreaElement | null) => {
      internalRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    // Auto-resize logic
    React.useEffect(() => {
      if (autoResize && internalRef.current) {
        const textarea = internalRef.current;
        textarea.style.height = "auto";
        const lineHeight = 24;
        const minHeight = 80;
        const maxHeight = lineHeight * maxRows;
        const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
        textarea.style.height = `${newHeight}px`;
      }
    }, [autoResize, maxRows, props.value, props.defaultValue]);

    const getBorderColor = () => {
      if (error) return "var(--findx-feedback-danger)";
      if (warning) return "var(--findx-feedback-warning)";
      if (success) return "var(--findx-feedback-success)";
      return "var(--findx-border-default)";
    };

    return (
      <div className={cn("flex flex-col gap-1.5", fullWidth && "w-full")}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-sm font-medium text-[var(--findx-text-primary)]"
          >
            {label}
          </label>
        )}
        <textarea
          ref={combinedRef}
          id={textareaId}
          className={cn(
            [
              "flex rounded-[var(--findx-radius-md)]",
              "p-[var(--findx-space-3)]",
              "min-h-[var(--findx-space-20)]",
              "bg-[var(--findx-bg-subtle)]",
              "text-[var(--findx-text-primary)]",
              "text-sm font-[var(--findx-font-body)]",
              "placeholder:text-[var(--findx-text-muted)]",
              "border",
              `[border-color:${getBorderColor()}]`,
              "transition-all duration-[var(--findx-duration-fast)]",
              "hover:border-[var(--findx-border-strong)]",
              "focus:outline-none",
              "focus:border-[var(--findx-border-focus)]",
              "focus:ring-2 focus:ring-[var(--findx-accent-subtle)]",
              "focus:shadow-[var(--findx-shadow-sm)]",
              "disabled:cursor-not-allowed",
              "disabled:opacity-50",
              "disabled:bg-[var(--findx-interactive-disabled)]",
              "resize-y",
              "text-start",
            ].join(" "),
            error && "animate-shake",
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-xs text-[var(--findx-text-muted)]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

// ═══════════════════════════════════════════════════════════════════════════════
// LABEL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
  hint?: string;
  error?: string;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, hint, error, children, ...props }, ref) => {
    const labelId = props.id || React.useId();

    return (
      <div className="flex flex-col gap-1">
        <label
          ref={ref}
          id={labelId}
          className={cn(
            "flex items-center gap-1",
            "text-sm font-medium text-[var(--findx-text-primary)]",
            error && "text-[var(--findx-feedback-danger)]",
            className
          )}
          {...props}
        >
          {children}
          {required && (
            <span className="text-[var(--findx-feedback-danger)]" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {hint && !error && (
          <p className="text-xs text-[var(--findx-text-muted)]">{hint}</p>
        )}
        {error && (
          <p id={`${labelId}-error`} className="text-xs text-[var(--findx-feedback-danger)]">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Label.displayName = "Label";

// ═══════════════════════════════════════════════════════════════════════════════
// FORM FIELD — Wrapper component
// ═══════════════════════════════════════════════════════════════════════════════

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  hint?: string;
  error?: string;
  warning?: string;
  success?: boolean;
  required?: boolean;
  disabled?: boolean;
  /** Layout direction */
  layout?: "vertical" | "horizontal";
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      className,
      label,
      hint,
      error,
      warning,
      success,
      required,
      disabled,
      layout = "vertical",
      children,
      ...props
    },
    ref
  ) => {
    const inputId = props.id || React.useId();

    return (
      <div
        ref={ref}
        className={cn(
          "flex",
          layout === "horizontal" && "items-center gap-4",
          layout === "vertical" && "flex-col gap-1.5",
          disabled && "opacity-50",
          className
        )}
        {...props}
      >
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "flex items-center gap-1 shrink-0",
              "text-sm font-medium",
              error && "text-[var(--findx-feedback-danger)]",
              warning && "text-[var(--findx-feedback-warning)]",
              success && "text-[var(--findx-feedback-success)]",
              !error && !warning && !success && "text-[var(--findx-text-primary)]"
            )}
          >
            {label}
            {required && (
              <span className="text-[var(--findx-feedback-danger)]" aria-hidden="true">*</span>
            )}
          </label>
        )}
        <div className="flex-1 relative">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<InputProps>, {
                id: inputId,
                error,
                warning,
                success,
                disabled,
              });
            }
            return child;
          })}
        </div>
        {(hint || error) && layout === "vertical" && (
          <p
            className={cn(
              "text-xs",
              error && "text-[var(--findx-feedback-danger)]",
              !error && hint && "text-[var(--findx-text-muted)]"
            )}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { Input, Textarea, Label, FormField };
export type { InputProps, TextareaProps, LabelProps, FormFieldProps };