/**
 * FindX Design System — Avatar Components
 * 
 * User profile avatars with image, initials, and fallback states.
 * 
 * Design Tokens Used:
 * - --findx-accent (default background)
 * - --findx-accent-subtle (fallback background)
 * - --findx-accent-foreground (text color)
 * - --findx-text-primary (text color)
 * - --findx-radius-full (circular shape)
 * - --findx-shadow-sm (shadow)
 * - --findx-z-above (stacking context)
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR SIZES
// ═══════════════════════════════════════════════════════════════════════════════

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const avatarSizes = {
  xs:  "size-[var(--findx-space-6)]",   // 24px
  sm:  "size-[var(--findx-space-8)]",   // 32px
  md:  "size-[var(--findx-space-9)]",   // 36px (default)
  lg:  "size-[var(--findx-space-12)]",  // 48px
  xl:  "size-[var(--findx-space-16)]",  // 64px
  "2xl": "size-[var(--findx-space-20)]", // 80px
};

const avatarFontSizes = {
  xs:  "text-[10px]",
  sm:  "text-xs",
  md:  "text-sm",
  lg:  "text-base",
  xl:  "text-xl",
  "2xl": "text-2xl",
};

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Image source URL */
  src?: string;
  /** Alt text for image */
  alt?: string;
  /** Fallback name (for initials) */
  name?: string;
  /** Size variant */
  size?: AvatarSize;
  /** Shape variant */
  shape?: "circle" | "square" | "rounded";
  /** Status indicator color */
  status?: "success" | "warning" | "danger" | "info" | "offline";
  /** Loading state */
  loading?: boolean;
  /** Fallback content when no image */
  fallback?: React.ReactNode;
}

const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(
  (
    {
      className,
      src,
      alt,
      name,
      size = "md",
      shape = "circle",
      status,
      loading = false,
      fallback,
      children,
      ...props
    },
    ref
  ) => {
    const [imageError, setImageError] = React.useState(false);
    
    // Get initials from name
    const getInitials = (name?: string): string => {
      if (!name) return "?";
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
      }
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    // Generate color from name (deterministic)
    const getColorFromName = (name?: string): string => {
      if (!name) return "var(--findx-accent)";
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const colors = [
        "var(--findx-color-brand-500)",
        "var(--findx-color-purple-500)",
        "var(--findx-color-pink-500)",
        "var(--findx-color-info-500)",
        "var(--findx-color-success-500)",
      ];
      return colors[Math.abs(hash) % colors.length];
    };

    // Shape class
    const shapeClass = {
      circle: "rounded-[var(--findx-radius-full)]",
      square: "rounded-[var(--findx-radius-sm)]",
      rounded: "rounded-[var(--findx-radius-lg)]",
    }[shape];

    // Status color
    const statusColors = {
      success: "bg-[var(--findx-feedback-success)]",
      warning: "bg-[var(--findx-feedback-warning)]",
      danger:  "bg-[var(--findx-feedback-danger)]",
      info:    "bg-[var(--findx-feedback-info)]",
      offline: "bg-[var(--findx-text-muted)]",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden",
          "bg-[var(--findx-accent-subtle)]",
          "text-[var(--findx-accent)]",
          shapeClass,
          avatarSizes[size],
          className
        )}
        role="img"
        aria-label={alt || name || "Avatar"}
        {...props}
      >
        {/* Loading state */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--findx-bg-inset)]">
            <div className="w-1/2 h-1/2 rounded-full animate-shimmer" />
          </div>
        )}

        {/* Image */}
        {src && !imageError && !loading && (
          <img
            src={src}
            alt={alt || name || "Avatar"}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        )}

        {/* Fallback — initials */}
        {!src || imageError ? (
          <span
            className={cn(
              "flex items-center justify-center",
              "font-semibold uppercase",
              "select-none",
              avatarFontSizes[size],
              "text-[var(--findx-text-inverted)]"
            )}
            style={{ backgroundColor: getColorFromName(name) }}
            aria-hidden="true"
          >
            {fallback || getInitials(name)}
          </span>
        ) : null}

        {/* Status indicator */}
        {status && (
          <span
            className={cn(
              "absolute bottom-0 right-0",
              "block rounded-full",
              "border-2 border-[var(--findx-bg-base)]",
              size === "xs" || size === "sm" ? "size-2" : "size-3",
              statusColors[status]
            )}
            aria-label={`Status: ${status}`}
            role="status"
          />
        )}

        {/* Children (for custom content) */}
        {children}
      </span>
    );
  }
);

Avatar.displayName = "Avatar";

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR GROUP — Multiple overlapping avatars
// ═══════════════════════════════════════════════════════════════════════════════

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Maximum avatars to show before +N */
  max?: number;
  /** Avatar size */
  size?: AvatarSize;
  /** Stack direction */
  direction?: "rtl" | "ltr";
  /** Gap between avatars */
  gap?: "sm" | "md" | "lg";
  /** Show remaining count */
  showCount?: boolean;
  /** Count label format */
  countLabel?: string;
}

const avatarGroupSizes = {
  xs: "-space-x-2 [&>:not(:first-child)]:ml-[-8px]",
  sm: "-space-x-3 [&>:not(:first-child)]:ml-[-12px]",
  md: "-space-x-3 [&>:not(:first-child)]:ml-[-14px]",
  lg: "-space-x-4 [&>:not(:first-child)]:ml-[-16px]",
  xl: "-space-x-5 [&>:not(:first-child)]:ml-[-20px]",
  "2xl": "-space-x-6 [&>:not(:first-child)]:ml-[-24px]",
};

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  (
    {
      className,
      max = 4,
      size = "md",
      direction = "ltr",
      showCount = true,
      countLabel = "others",
      children,
      ...props
    },
    ref
  ) => {
    const childArray = React.Children.toArray(children);
    const visibleAvatars = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center",
          direction === "rtl" ? "flex-row-reverse" : "flex-row",
          avatarGroupSizes[size],
          className
        )}
        role="group"
        aria-label={`${childArray.length} avatars`}
        {...props}
      >
        {visibleAvatars.map((child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(
              child as React.ReactElement<AvatarProps>,
              { 
                size,
                key: index,
                // Add stacking shadow
                className: cn(
                  (child as React.ReactElement).props.className,
                  "ring-2 ring-[var(--findx-bg-base)]"
                ),
              }
            );
          }
          return child;
        })}
        
        {/* Remaining count */}
        {showCount && remainingCount > 0 && (
          <span
            className={cn(
              "flex items-center justify-center",
              "rounded-[var(--findx-radius-full)]",
              "bg-[var(--findx-bg-inset)]",
              "text-[var(--findx-text-secondary)]",
              "font-medium",
              "ring-2 ring-[var(--findx-bg-base)]",
              avatarSizes[size],
              avatarFontSizes[size]
            )}
            aria-label={`${remainingCount} ${countLabel}`}
          >
            +{remainingCount}
          </span>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = "AvatarGroup";

// ═══════════════════════════════════════════════════════════════════════════════
// AVATAR STACK — Vertical stack
// ═══════════════════════════════════════════════════════════════════════════════

export interface AvatarStackProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number;
  size?: AvatarSize;
  showCount?: boolean;
}

const AvatarStack = React.forwardRef<HTMLDivElement, AvatarStackProps>(
  ({ className, max = 4, size = "md", showCount = true, children, ...props }, ref) => {
    const childArray = React.Children.toArray(children);
    const visibleAvatars = childArray.slice(0, max);
    const remainingCount = childArray.length - max;

    const gapSizes = {
      xs: "-space-y-1.5",
      sm: "-space-y-2",
      md: "-space-y-3",
      lg: "-space-y-4",
      xl: "-space-y-5",
      "2xl": "-space-y-6",
    };

    return (
      <div
        ref={ref}
        className={cn("flex flex-col", gapSizes[size], className)}
        role="group"
        {...props}
      >
        {visibleAvatars.map((child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(
              child as React.ReactElement<AvatarProps>,
              { size, key: index }
            );
          }
          return child;
        })}
        {showCount && remainingCount > 0 && (
          <span
            className={cn(
              "flex items-center justify-center",
              avatarSizes[size],
              "bg-[var(--findx-bg-inset)]",
              "rounded-[var(--findx-radius-full)]",
              "text-[var(--findx-text-muted)]",
              "text-xs font-medium"
            )}
          >
            +{remainingCount}
          </span>
        )}
      </div>
    );
  }
);

AvatarStack.displayName = "AvatarStack";

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { Avatar, AvatarGroup, AvatarStack };
export type { AvatarProps, AvatarGroupProps, AvatarStackProps, AvatarSize };