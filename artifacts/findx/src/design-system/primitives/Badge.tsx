/**
 * FindX Design System — Badge & Status Components
 * 
 * Small status indicators and labels using semantic design tokens.
 * 
 * Design Tokens Used:
 * - --findx-accent (default badge)
 * - --findx-accent-subtle (default badge background)
 * - --findx-feedback-success/warning/danger/info (semantic colors)
 * - --findx-radius-full (pill shape)
 * - --findx-radius-md (rounded badge)
 * - --findx-text-xs (font size)
 * - --findx-text-sm (large badge)
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export type BadgeVariant = 
  | "default" 
  | "primary" 
  | "secondary" 
  | "success" 
  | "warning" 
  | "danger" 
  | "info"
  | "outline"
  | "ghost"
  | "gradient";

export type BadgeSize = "sm" | "md" | "lg";

const badgeVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5",
    "font-medium",
    "transition-colors duration-[var(--findx-duration-fast)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--findx-border-focus)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-[var(--findx-accent-subtle)]",
          "text-[var(--findx-accent)]",
        ].join(" "),
        primary: [
          "bg-[var(--findx-accent)]",
          "text-[var(--findx-accent-foreground)]",
        ].join(" "),
        secondary: [
          "bg-[var(--findx-bg-inset)]",
          "text-[var(--findx-text-secondary)]",
        ].join(" "),
        success: [
          "bg-[var(--findx-feedback-success-bg)]",
          "text-[var(--findx-feedback-success)]",
          "border border-[var(--findx-feedback-success-border)]",
        ].join(" "),
        warning: [
          "bg-[var(--findx-feedback-warning-bg)]",
          "text-[var(--findx-feedback-warning)]",
          "border border-[var(--findx-feedback-warning-border)]",
        ].join(" "),
        danger: [
          "bg-[var(--findx-feedback-danger-bg)]",
          "text-[var(--findx-feedback-danger)]",
          "border border-[var(--findx-feedback-danger-border)]",
        ].join(" "),
        info: [
          "bg-[var(--findx-feedback-info-bg)]",
          "text-[var(--findx-feedback-info)]",
          "border border-[var(--findx-feedback-info-border)]",
        ].join(" "),
        outline: [
          "bg-transparent",
          "text-[var(--findx-text-secondary)]",
          "border border-[var(--findx-border-default)]",
        ].join(" "),
        ghost: [
          "bg-transparent",
          "text-[var(--findx-text-muted)]",
        ].join(" "),
        gradient: [
          "gradient-brand",
          "text-[var(--findx-accent-foreground)]",
        ].join(" "),
      },
      size: {
        sm: [
          "h-[var(--findx-space-5)]",    // 20px
          "px-[var(--findx-space-2)]",   // 8px
          "text-[10px]",
          "[&_svg]:size-3",
        ].join(" "),
        md: [
          "h-[var(--findx-space-6)]",    // 24px
          "px-[var(--findx-space-2.5)]", // 10px
          "text-xs",
          "[&_svg]:size-3.5",
        ].join(" "),
        lg: [
          "h-[var(--findx-space-7)]",    // 28px
          "px-[var(--findx-space-3)]",   // 12px
          "text-sm",
          "[&_svg]:size-4",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

// Shape variants (border radius)
const shapeVariants = cva("", {
  variants: {
    shape: {
      default: "rounded-[var(--findx-radius-md)]",
      pill: "rounded-[var(--findx-radius-full)]",
      square: "rounded-[var(--findx-radius-sm)]",
    },
  },
  defaultVariants: {
    shape: "default",
  },
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Shape variant */
  shape?: "default" | "pill" | "square";
  /** Show dot indicator */
  dot?: boolean;
  /** Dot color (for custom colors) */
  dotColor?: string;
  /** Removable badge */
  removable?: boolean;
  /** onRemove callback */
  onRemove?: () => void;
  /** Loading state */
  loading?: boolean;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      shape = "default",
      dot = false,
      dotColor,
      removable = false,
      onRemove,
      loading = false,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          badgeVariants({ variant, size }),
          shapeVariants({ shape }),
          className
        )}
        {...props}
      >
        {/* Dot indicator */}
        {dot && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ 
              backgroundColor: dotColor || "currentColor",
              ...(dotColor === "success" && { backgroundColor: "var(--findx-feedback-success)" }),
              ...(dotColor === "warning" && { backgroundColor: "var(--findx-feedback-warning)" }),
              ...(dotColor === "danger" && { backgroundColor: "var(--findx-feedback-danger)" }),
              ...(dotColor === "info" && { backgroundColor: "var(--findx-feedback-info)" }),
            }}
            aria-hidden="true"
          />
        )}
        
        {/* Loading spinner */}
        {loading && (
          <svg
            className="animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            className="size-3"
            aria-hidden="true"
          >
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
        )}
        
        {/* Badge text */}
        <span>{children}</span>
        
        {/* Remove button */}
        {removable && !loading && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            className={cn(
              "ml-0.5 -mr-1 p-0.5 rounded-full",
              "hover:bg-black/10 dark:hover:bg-white/10",
              "focus:outline-none focus-visible:ring-1",
              "transition-colors"
            )}
            aria-label="Remove"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="size-3"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = "Badge";

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS DOT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export type StatusColor = "success" | "warning" | "danger" | "info" | "neutral" | "pending";

export interface StatusDotProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Status color */
  color?: StatusColor;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Pulsing animation (for live status) */
  pulse?: boolean;
  /** Label text (screen reader) */
  label?: string;
}

const statusDotSizes = {
  sm: "size-1.5",
  md: "size-2",
  lg: "size-2.5",
};

const statusDotColors: Record<StatusColor, string> = {
  success: "bg-[var(--findx-feedback-success)]",
  warning: "bg-[var(--findx-feedback-warning)]",
  danger:  "bg-[var(--findx-feedback-danger)]",
  info:    "bg-[var(--findx-feedback-info)]",
  neutral: "bg-[var(--findx-text-muted)]",
  pending: "bg-[var(--findx-accent)]",
};

const StatusDot = React.forwardRef<HTMLSpanElement, StatusDotProps>(
  ({ 
    className, 
    color = "neutral", 
    size = "md", 
    pulse = false,
    label,
    ...props 
  }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "relative inline-flex shrink-0 rounded-full",
          statusDotSizes[size],
          statusDotColors[color],
          pulse && "animate-pulse",
          className
        )}
        role="status"
        aria-label={label || color}
        {...props}
      />
    );
  }
);

StatusDot.displayName = "StatusDot";

// ═══════════════════════════════════════════════════════════════════════════════
// STATUS INDICATOR — Dot + Label
// ═══════════════════════════════════════════════════════════════════════════════

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Status color */
  color?: StatusColor;
  /** Size */
  size?: "sm" | "md" | "lg";
  /** Pulsing animation */
  pulse?: boolean;
  /** Label text */
  label: string;
  /** Hide dot */
  dotOnly?: boolean;
}

const StatusIndicator = React.forwardRef<HTMLDivElement, StatusIndicatorProps>(
  ({ className, color = "neutral", size = "md", pulse = false, label, dotOnly = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-2",
          "text-sm font-medium",
          className
        )}
        {...props}
      >
        <StatusDot color={color} size={size} pulse={pulse} label={label} />
        {!dotOnly && (
          <span 
            className="text-[var(--findx-text-secondary)]"
            style={{ fontSize: size === "sm" ? "var(--findx-text-xs)" : size === "lg" ? "var(--findx-text-base)" : "var(--findx-text-sm)" }}
          >
            {label}
          </span>
        )}
      </div>
    );
  }
);

StatusIndicator.displayName = "StatusIndicator";

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE INDICATOR — For real-time data
// ═══════════════════════════════════════════════════════════════════════════════

export interface LiveIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Label text */
  label?: string;
  /** Size */
  size?: "sm" | "md" | "lg";
}

const LiveIndicator = React.forwardRef<HTMLDivElement, LiveIndicatorProps>(
  ({ className, label = "Live", size = "sm", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center gap-1.5",
          "text-[var(--findx-feedback-success)]",
          "font-medium",
          className
        )}
        style={{ fontSize: size === "lg" ? "var(--findx-text-sm)" : "var(--findx-text-xs)" }}
        {...props}
      >
        <span
          className={cn(
            "relative rounded-full",
            "bg-[var(--findx-feedback-success)]",
            "animate-pulse",
            size === "lg" ? "size-2.5" : "size-2"
          )}
          aria-hidden="true"
        />
        <span>{label}</span>
      </div>
    );
  }
);

LiveIndicator.displayName = "LiveIndicator";

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { Badge, StatusDot, StatusIndicator, LiveIndicator };
export type { BadgeProps, BadgeVariant, BadgeSize, StatusDotProps, StatusColor, StatusIndicatorProps, LiveIndicatorProps };