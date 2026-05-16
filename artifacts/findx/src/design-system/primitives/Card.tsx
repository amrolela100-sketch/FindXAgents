/**
 * FindX Design System — Card Component
 * 
 * A versatile card system with multiple variants and states.
 * Supports glass morphism, elevation levels, and interactive states.
 * 
 * Design Tokens Used:
 * - --findx-surface-glass (background)
 * - --findx-surface-glass-raised (elevated background)
 * - --findx-surface-glass-overlay (overlay background)
 * - --findx-surface-border (border)
 * - --findx-surface-border-strong (strong border)
 * - --findx-surface-blur (backdrop blur)
 * - --findx-radius-lg (border radius)
 * - --findx-radius-xl (large border radius)
 * - --findx-shadow-sm to --findx-shadow-xl (elevation)
 * - --findx-duration-normal (transition)
 * - --findx-ease-out (easing)
 * - --findx-text-primary (heading text)
 * - --findx-text-secondary (body text)
 * - --findx-text-muted (muted text)
 * 
 * @example
 * <Card>Basic Card</Card>
 * <Card variant="glass" elevated>Glass Card</Card>
 * <Card variant="outlined" hoverable>Interactive Card</Card>
 * <Card variant="solid" padding="none">Card without padding</Card>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// CARD VARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

export type CardVariant = "default" | "glass" | "glass-raised" | "glass-overlay" | "outlined" | "solid" | "ghost";
export type CardPadding = "none" | "sm" | "md" | "lg" | "xl";
export type CardElevation = "none" | "sm" | "md" | "lg" | "xl" | "glow";

// Padding values from design tokens
const paddingValues: Record<CardPadding, string> = {
  none: "0",
  sm:   "var(--findx-space-3)",   // 12px
  md:   "var(--findx-space-4)",   // 16px (default)
  lg:   "var(--findx-space-6)",   // 24px
  xl:   "var(--findx-space-8)",   // 32px
};

// Shadow values from design tokens
const shadowValues: Record<CardElevation, string | null> = {
  none: null,
  sm:   "var(--findx-shadow-sm)",
  md:   "var(--findx-shadow-md)",
  lg:   "var(--findx-shadow-lg)",
  xl:   "var(--findx-shadow-xl)",
  glow: "var(--findx-shadow-glow-brand)",
};

// ═══════════════════════════════════════════════════════════════════════════════
// CARD PROPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant */
  variant?: CardVariant;
  /** Padding size */
  padding?: CardPadding;
  /** Shadow/elevation level */
  elevation?: CardElevation;
  /** Interactive state — adds hover effects */
  hoverable?: boolean;
  /** Clickable card — renders as button or link */
  asChild?: boolean;
  /** Loading skeleton state */
  loading?: boolean;
  /** Selected state */
  selected?: boolean;
  /** Focus visible for keyboard navigation */
  focusVisible?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant = "default",
      padding = "md",
      elevation = "none",
      hoverable = false,
      asChild,
      loading = false,
      selected = false,
      focusVisible = false,
      children,
      ...props
    },
    ref
  ) => {
    const paddingValue = paddingValues[padding];
    const shadowValue = shadowValues[elevation];
    
    // Variant-specific styles using design tokens
    const getVariantStyles = () => {
      switch (variant) {
        case "glass":
          return [
            "bg-[var(--findx-surface-glass)]",
            "backdrop-filter:[var(--findx-surface-blur)]",
            "-webkit-backdrop-filter:[var(--findx-surface-blur)]",
            "border border-[var(--findx-surface-border)]",
          ].join(" ");
        
        case "glass-raised":
          return [
            "bg-[var(--findx-surface-glass-raised)]",
            "backdrop-filter:[var(--findx-surface-blur)]",
            "-webkit-backdrop-filter:[var(--findx-surface-blur)]",
            "border border-[var(--findx-surface-border-strong)]",
          ].join(" ");
        
        case "glass-overlay":
          return [
            "bg-[var(--findx-surface-glass-overlay)]",
            "backdrop-filter:[var(--findx-surface-blur)]",
            "-webkit-backdrop-filter:[var(--findx-surface-blur)]",
            "border border-[var(--findx-surface-border)]",
          ].join(" ");
        
        case "outlined":
          return [
            "bg-transparent",
            "border border-[var(--findx-border-default)]",
          ].join(" ");
        
        case "solid":
          return [
            "bg-[var(--findx-bg-subtle)]",
            "border border-transparent",
          ].join(" ");
        
        case "ghost":
          return [
            "bg-transparent",
            "border border-transparent",
          ].join(" ");
        
        default:
          return [
            "bg-[var(--findx-surface-glass)]",
            "border border-[var(--findx-surface-border)]",
          ].join(" ");
      }
    };

    // Build class names
    const cardClasses = cn(
      // Base styles
      [
        "relative rounded-[var(--findx-radius-lg)]",
        "text-[var(--findx-text-primary)]",
        "transition-all duration-[var(--findx-duration-normal)]",
        // Variant styles
        getVariantStyles(),
        // Padding
        `[padding:${paddingValue}]`,
        // Shadow
        shadowValue && `[box-shadow:${shadowValue}]`,
        // Interactive states
        hoverable && [
          "cursor-pointer",
          "hover:border-[var(--findx-border-strong)]",
          "hover:[transform:translateY(-2px)]",
          "active:[transform:translateY(0)]",
          shadowValue 
            ? `hover:[box-shadow:var(--findx-shadow-lg)]`
            : "hover:[box-shadow:var(--findx-shadow-md)]",
        ].join(" "),
        // Selected state
        selected && [
          "ring-2 ring-[var(--findx-accent)]",
          "border-[var(--findx-accent)]",
        ].join(" "),
        // Focus state for accessibility
        focusVisible && [
          "outline-none",
          "ring-2 ring-[var(--findx-accent)]",
          "ring-offset-2",
          "ring-offset-[var(--findx-bg-base)]",
        ].join(" "),
        // Loading overlay
        loading && "opacity-60 pointer-events-none",
      ].filter(Boolean).join(" ")
    );

    // Loading skeleton overlay
    if (loading) {
      return (
        <div
          ref={ref}
          className={cn(cardClasses, className)}
          {...props}
        >
          <div className="animate-shimmer absolute inset-0 rounded-[inherit]" />
          {children}
        </div>
      );
    }

    // Render with asChild pattern (for button or link)
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(
        children as React.ReactElement<React.HTMLAttributes<HTMLDivElement>>,
        {
          className: cn(cardClasses, (children as React.ReactElement).props.className),
          ref,
          ...props,
        }
      );
    }

    return (
      <div
        ref={ref}
        className={cn(cardClasses, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// ═══════════════════════════════════════════════════════════════════════════════
// CARD HEADER
// ═══════════════════════════════════════════════════════════════════════════════

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Header actions (buttons, badges, etc.) */
  action?: React.ReactNode;
  /** Header layout */
  layout?: "stacked" | "horizontal";
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, description, action, layout = "stacked", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex gap-[var(--findx-space-4)]",
          layout === "horizontal" && "items-start justify-between",
          layout === "stacked" && "flex-col",
          className
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {title && (
            <h3
              className="text-lg font-semibold text-[var(--findx-text-primary)]"
              style={{ fontFamily: "var(--findx-font-display)" }}
            >
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-1 text-sm text-[var(--findx-text-secondary)]">
              {description}
            </p>
          )}
          {children}
        </div>
        {action && (
          <div className="flex items-center gap-[var(--findx-space-2)] shrink-0">
            {action}
          </div>
        )}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

// ═══════════════════════════════════════════════════════════════════════════════
// CARD CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Layout for children */
  layout?: "stack" | "grid" | "flex";
  /** Gap between children */
  gap?: "none" | "sm" | "md" | "lg";
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, layout = "stack", gap = "md", children, ...props }, ref) => {
    const gapValue = gap === "none" ? "0" : `var(--findx-space-${gap === "sm" ? "2" : gap === "lg" ? "6" : "4"})`;
    
    return (
      <div
        ref={ref}
        className={cn(
          layout === "stack" && "flex flex-col",
          layout === "grid" && "grid gap-[var(--findx-space-4)]",
          layout === "flex" && "flex items-center gap-4",
          className
        )}
        style={layout === "stack" || layout === "flex" ? { gap: gapValue } : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = "CardContent";

// ═══════════════════════════════════════════════════════════════════════════════
// CARD FOOTER
// ═══════════════════════════════════════════════════════════════════════════════

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Footer alignment */
  align?: "start" | "center" | "end" | "between";
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, align = "end", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-[var(--findx-space-3)]",
          align === "start" && "justify-start",
          align === "center" && "justify-center",
          align === "end" && "justify-end",
          align === "between" && "justify-between",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = "CardFooter";

// ═══════════════════════════════════════════════════════════════════════════════
// CARD DIVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export interface CardDividerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Divider spacing */
  spacing?: "none" | "sm" | "md" | "lg";
}

const CardDivider = React.forwardRef<HTMLDivElement, CardDividerProps>(
  ({ className, spacing = "md", ...props }, ref) => {
    const spacingValue = spacing === "none" ? "0" : spacing === "sm" ? "var(--findx-space-2)" : spacing === "lg" ? "var(--findx-space-6)" : "var(--findx-space-4)";
    
    return (
      <div
        ref={ref}
        className={cn("border-t border-[var(--findx-border-default)]", className)}
        style={{ marginTop: spacingValue, marginBottom: spacingValue }}
        {...props}
      />
    );
  }
);

CardDivider.displayName = "CardDivider";

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { Card, CardHeader, CardContent, CardFooter, CardDivider };
export type { CardProps, CardHeaderProps, CardContentProps, CardFooterProps, CardDividerProps, CardVariant, CardPadding, CardElevation };