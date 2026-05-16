/**
 * FindX Design System — EmptyState Component
 * 
 * A reusable empty state pattern for when lists, tables, or grids have no content.
 * 
 * @example
 * <EmptyState
 *   icon={InboxIcon}
 *   title="No leads yet"
 *   description="Start by discovering new business prospects"
 *   action={{ label: "Discover Leads", onClick: () => openDiscoveryModal() }}
 * />
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'ghost';
    icon?: React.ElementType;
  };
  secondaryAction?: { label: string; onClick: () => void };
  variant?: 'default' | 'compact' | 'contained';
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, secondaryAction, variant = 'default', className }: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 py-8 px-4", className)}>
        {Icon && <Icon className="w-8 h-8" style={{ color: 'var(--findx-text-muted)' }} />}
        <p className="text-sm font-medium" style={{ color: 'var(--findx-text-secondary)' }}>{title}</p>
        {action && <Button variant="ghost" size="sm" onClick={action.onClick}>{action.label}</Button>}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-6 py-16 px-8 text-center rounded-lg", variant === 'contained' && "glass", className)}>
      {Icon && (
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'var(--findx-bg-subtle)' }}>
          <Icon className="w-8 h-8" style={{ color: 'var(--findx-text-muted)' }} />
        </div>
      )}
      <div className="flex flex-col gap-2 max-w-sm">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--findx-text-primary)', fontFamily: 'var(--findx-font-display)' }}>{title}</h3>
        {description && <p className="text-sm" style={{ color: 'var(--findx-text-secondary)' }}>{description}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button onClick={action.onClick} variant={action.variant || 'default'}>
              {action.icon && <action.icon className="w-4 h-4 mr-2" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && <Button variant="ghost" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button>}
        </div>
      )}
    </div>
  );
}

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rectangular' | 'circular';
  delay?: number;
  className?: string;
}

export function Skeleton({ width, height, variant = 'text', delay = 0, className }: SkeletonProps) {
  const [visible, setVisible] = React.useState(delay === 0);
  React.useEffect(() => {
    if (delay > 0) {
      const timer = setTimeout(() => setVisible(true), delay);
      return () => clearTimeout(timer);
    }
  }, [delay]);

  const styles: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: variant === 'circular' ? '50%' : variant === 'text' ? '4px' : '8px',
  };

  if (!visible) return <div style={styles} />;
  return <div className={cn("animate-shimmer", className)} style={styles} />;
}

export function PageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width={200} height={28} />
          <Skeleton width={300} height={16} />
        </div>
        <Skeleton width={120} height={36} />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="glass rounded-lg p-4">
            <div className="flex items-center gap-4">
              <Skeleton variant="circular" width={40} height={40} />
              <div className="flex-1 space-y-2">
                <Skeleton width="60%" height={16} />
                <Skeleton width="40%" height={14} />
              </div>
              <Skeleton width={80} height={28} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}