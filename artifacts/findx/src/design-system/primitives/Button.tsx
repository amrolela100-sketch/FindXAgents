/**
 * FindX Design System — Button Component
 * 
 * A polymorphic button component with multiple variants and sizes.
 * Built on top of Radix UI Slot for accessibility and performance.
 * 
 * Uses semantic design tokens:
 * - --findx-accent (primary actions)
 * - --findx-feedback-success/warning/danger (semantic variants)
 * - --findx-text-primary (text colors)
 * - --findx-surface-glass (backgrounds)
 * - --findx-radius-md (border radius)
 * - --findx-shadow-sm (elevation)
 * - --findx-duration-fast (transitions)
 * - --findx-z-above (focus ring z-index)
 * 
 * @example
 * <Button variant="primary" size="md">Click me</Button>
 * <Button variant="outline" size="sm" icon={Plus}>Add Item</Button>
 * <Button variant="ghost" isLoading>Loading...</Button>
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON VARIANTS — Using semantic design tokens
// ═══════════════════════════════════════════════════════════════════════════════

const buttonVariants = cva(
  // Base styles using design tokens
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-[var(--findx-radius-md)]",
    "text-sm font-medium",
    "transition-all duration-[var(--findx-duration-fast)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    // Hover elevation using design tokens
    "hover-elevate active-elevate-2",
  ].join(" "),
  {
    variants: {
      variant: {
        // ─── Primary — Brand accent (semantic token: --findx-accent) ───
        primary: [
          "bg-[var(--findx-accent)]",
          "text-[var(--findx-accent-foreground)]",
          "border border-transparent",
          "shadow-[var(--findx-shadow-sm)]",
          "hover:bg-[var(--findx-accent-hover)]",
          "focus-visible:ring-[var(--findx-accent)]",
          "active:scale-[0.98]",
        ].join(" "),
        
        // ─── Secondary — Subtle background ───
        secondary: [
          "bg-[var(--findx-bg-subtle)]",
          "text-[var(--findx-text-primary)]",
          "border border-[var(--findx-border-default)]",
          "hover:bg-[var(--findx-bg-inset)]",
          "hover:border-[var(--findx-border-strong)]",
          "focus-visible:ring-[var(--findx-border-focus)]",
        ].join(" "),
        
        // ─── Outline — Transparent with border ───
        outline: [
          "bg-transparent",
          "text-[var(--findx-text-primary)]",
          "border border-[var(--findx-border-default)]",
          "hover:bg-[var(--findx-interactive-hover)]",
          "hover:border-[var(--findx-border-strong)]",
          "focus-visible:ring-[var(--findx-border-focus)]",
        ].join(" "),
        
        // ─── Ghost — Minimal interaction ───
        ghost: [
          "bg-transparent",
          "text-[var(--findx-text-secondary)]",
          "border border-transparent",
          "hover:bg-[var(--findx-interactive-hover)]",
          "hover:text-[var(--findx-text-primary)]",
          "focus-visible:ring-[var(--findx-border-focus)]",
        ].join(" "),
        
        // ─── Destructive — Danger semantic (--findx-feedback-danger) ───
        destructive: [
          "bg-[var(--findx-feedback-danger)]",
          "text-white",
          "border border-transparent",
          "shadow-[var(--findx-shadow-sm)]",
          "hover:bg-[var(--findx-color-danger-600)]",
          "focus-visible:ring-[var(--findx-feedback-danger)]",
          "active:scale-[0.98]",
        ].join(" "),
        
        // ─── Success — Success semantic ───
        success: [
          "bg-[var(--findx-feedback-success)]",
          "text-white",
          "border border-transparent",
          "shadow-[var(--findx-shadow-sm)]",
          "hover:bg-[var(--findx-color-success-600)]",
          "focus-visible:ring-[var(--findx-feedback-success)]",
          "active:scale-[0.98]",
        ].join(" "),
        
        // ─── Warning — Warning semantic ───
        warning: [
          "bg-[var(--findx-feedback-warning)]",
          "text-[var(--findx-text-inverted)]",
          "border border-transparent",
          "shadow-[var(--findx-shadow-sm)]",
          "hover:bg-[var(--findx-color-warning-600)]",
          "focus-visible:ring-[var(--findx-feedback-warning)]",
          "active:scale-[0.98]",
        ].join(" "),
        
        // ─── Link — Minimal, underlined ───
        link: [
          "bg-transparent",
          "text-[var(--findx-accent)]",
          "border border-transparent",
          "underline-offset-4",
          "hover:underline",
          "focus-visible:ring-[var(--findx-accent)]",
        ].join(" "),
        
        // ─── Gradient — Brand gradient effect ───
        gradient: [
          "gradient-brand",
          "text-[var(--findx-accent-foreground)]",
          "border border-transparent",
          "shadow-[var(--findx-shadow-md)]",
          "hover:shadow-[var(--findx-shadow-lg)]",
          "focus-visible:ring-[var(--findx-accent)]",
          "active:scale-[0.98]",
        ].join(" "),
        
        // ─── Glass — Glass morphism effect ───
        glass: [
          "glass",
          "text-[var(--findx-text-primary)]",
          "shadow-[var(--findx-shadow-sm)]",
          "hover:shadow-[var(--findx-shadow-md)]",
          "focus-visible:ring-[var(--findx-border-focus)]",
        ].join(" "),
      },
      
      size: {
        // ─── Size tokens from design system ───
        xs: [
          "h-[var(--findx-space-7)]",    // 28px - 1.75rem
          "px-[var(--findx-space-2.5)]", // 10px
          "py-[var(--findx-space-1)]",   // 4px
          "text-xs",
          "[&_svg]:size-3",
        ].join(" "),
        
        sm: [
          "h-[var(--findx-space-8)]",    // 32px - 2rem
          "px-[var(--findx-space-3)]",   // 12px
          "py-[var(--findx-space-1.5)]", // 6px
          "text-xs",
          "[&_svg]:size-3.5",
        ].join(" "),
        
        md: [
          "h-[var(--findx-space-9)]",    // 36px - 2.25rem (default)
          "px-[var(--findx-space-4)]",   // 16px
          "py-[var(--findx-space-2)]",   // 8px
          "text-sm",
          "[&_svg]:size-4",
        ].join(" "),
        
        lg: [
          "h-[var(--findx-space-10)]",   // 40px - 2.5rem
          "px-[var(--findx-space-6)]",   // 24px
          "py-[var(--findx-space-2.5)]", // 10px
          "text-base",
          "[&_svg]:size-5",
        ].join(" "),
        
        xl: [
          "h-[var(--findx-space-12)]",   // 48px - 3rem
          "px-[var(--findx-space-8)]",   // 32px
          "py-[var(--findx-space-3)]",   // 12px
          "text-lg",
          "[&_svg]:size-5",
        ].join(" "),
        
        // ─── Icon-only button ───
        icon: [
          "h-[var(--findx-space-9)]",    // 36px
          "w-[var(--findx-space-9)]",    // 36px
          "text-sm",
          "[&_svg]:size-5",
        ].join(" "),
        
        "icon-sm": [
          "h-[var(--findx-space-8)]",    // 32px
          "w-[var(--findx-space-8)]",    // 32px
          "text-xs",
          "[&_svg]:size-4",
        ].join(" "),
        
        "icon-lg": [
          "h-[var(--findx-space-10)]",   // 40px
          "w-[var(--findx-space-10)]",   // 40px
          "text-base",
          "[&_svg]:size-5",
        ].join(" "),
      },
    },
    
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON PROPS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Use Radix Slot for polymorphic component (asChild) */
  asChild?: boolean;
  /** Show loading spinner and disable interactions */
  isLoading?: boolean;
  /** Loading text (replaces children when loading) */
  loadingText?: string;
  /** Icon component to render before text */
  icon?: React.ElementType;
  /** Icon position */
  iconPosition?: "start" | "end";
}

export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const SpinnerSVG = () => (
  <svg
    className="animate-spin"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      icon: Icon,
      iconPosition = "start",
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    // Determine if button is disabled due to loading
    const isDisabled = disabled || isLoading;
    
    // Build icon element if provided
    const iconElement = Icon && (
      <Icon 
        className={cn(
          // Size-based icon margin
          size === "xs" || size === "sm" ? "-ml-0.5 mr-1" : "-ml-1 mr-2"
        )}
        aria-hidden="true"
      />
    );
    
    // Build loading element
    const loadingElement = isLoading && (
      <>
        <SpinnerSVG />
        <span>{loadingText || children}</span>
      </>
    );
    
    // Build content
    const content = isLoading ? (
      loadingElement
    ) : (
      <>
        {Icon && iconPosition === "start" && iconElement}
        {children}
        {Icon && iconPosition === "end" && (
          <Icon 
            className={cn(
              size === "xs" || size === "sm" ? "ml-0.5" : "ml-2"
            )}
            aria-hidden="true"
          />
        )}
      </>
    );
    
    // Render with Slot for polymorphic behavior
    const Comp = asChild ? Slot : "button";
    
    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          // Additional states
          isLoading && "cursor-wait",
          isDisabled && "cursor-not-allowed"
        )}
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={isLoading}
        {...props}
      >
        {content}
      </Comp>
    );
  }
);

Button.displayName = "Button";

// ═══════════════════════════════════════════════════════════════════════════════
// BUTTON GROUP — Related action buttons
// ═══════════════════════════════════════════════════════════════════════════════

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual style of the group */
  variant?: "connected" | "separate" | "equal";
  /** Button size for all children */
  size?: ButtonSize;
}

const buttonGroupVariants = cva("inline-flex", {
  variants: {
    variant: {
      connected: [
        "[&>:not(:first-child):not(:last-child)]:rounded-none",
        "[&>:not(:first-child)>*]:rounded-none [&>:not(:first-child)>*]:-ml-px",
        "[&>:first-child:not(:last-child)>*]:rounded-[var(--findx-radius-md)] [&>:first-child:not(:last-child)>*]:rounded-r-none",
        "[&>:last-child:not(:first-child)>*]:rounded-[var(--findx-radius-md)] [&>:last-child:not(:first-child)>*]:rounded-l-none",
      ].join(" "),
      separate: "gap-[var(--findx-space-2)]",
      equal: "[&>:only-child]:w-full [&>:only-child>*]:w-full",
    },
  },
  defaultVariants: {
    variant: "connected",
  },
});

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, variant, size, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(buttonGroupVariants({ variant }), className)}
      role="group"
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<ButtonProps>, { size });
        }
        return child;
      })}
    </div>
  )
);

ButtonGroup.displayName = "ButtonGroup";

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { Button, ButtonGroup, buttonVariants };
export type { ButtonProps, ButtonGroupProps, ButtonVariant, ButtonSize };