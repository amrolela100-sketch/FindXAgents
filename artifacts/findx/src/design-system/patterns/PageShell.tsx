/**
 * FindX Design System — PageShell Component
 * 
 * The standard layout wrapper for all application pages.
 * Provides consistent spacing, header slot, and responsive behavior.
 * 
 * @example
 * <PageShell
 *   title="Leads"
 *   description="Manage your business prospects"
 *   header={<Button onClick={openModal}>Add Lead</Button>}
 * >
 *   <DataTable columns={columns} data={leads} />
 * </PageShell>
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageShellProps {
  title?: string;
  description?: string;
  header?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  children: React.ReactNode;
  footer?: React.ReactNode;
  loading?: boolean;
  error?: Error | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

const sizeClasses = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  full: "max-w-full",
};

export function PageShell({
  title,
  description,
  header,
  breadcrumbs,
  children,
  footer,
  loading,
  error,
  className,
  size = "lg",
}: PageShellProps) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <main className={cn("w-full min-h-[100dvh] px-4 py-6 md:px-6 md:py-8 mx-auto", sizeClasses[size], className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((item, index) => (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && (
                  <svg className="w-4 h-4 text-[var(--findx-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {item.href ? (
                  <a href={item.href} className="text-[var(--findx-text-secondary)] hover:text-[var(--findx-text-primary)] transition-colors">
                    {item.icon && <span className="mr-1">{item.icon}</span>}
                    {item.label}
                  </a>
                ) : (
                  <span className="text-[var(--findx-text-primary)] font-medium">
                    {item.icon && <span className="mr-1">{item.icon}</span>}
                    {item.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {(title || description || header) && (
        <header className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--findx-text-primary)', fontFamily: 'var(--findx-font-display)' }}>
                {title}
              </h1>
            )}
            {description && (
              <p className="mt-1 text-sm" style={{ color: 'var(--findx-text-secondary)' }}>{description}</p>
            )}
          </div>
          {header && <div className="flex items-center gap-3 mt-3 sm:mt-0 shrink-0">{header}</div>}
        </header>
      )}

      {loading && (
        <div className="space-y-4">
          <div className="h-8 w-48 animate-shimmer rounded-md" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 animate-shimmer rounded-lg" />)}
          </div>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center gap-4 p-12 rounded-lg" style={{ background: 'var(--findx-feedback-danger-bg)', border: '1px solid var(--findx-feedback-danger-border)' }}>
          <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--findx-feedback-danger)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-center">
            <p className="font-medium" style={{ color: 'var(--findx-feedback-danger)' }}>Something went wrong</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--findx-text-secondary)' }}>{error.message || 'An unexpected error occurred'}</p>
          </div>
          <button onClick={() => window.location.reload()} className="px-4 py-2 text-sm font-medium rounded-md transition-colors" style={{ background: 'var(--findx-feedback-danger)', color: '#FFFFFF' }}>
            Try again
          </button>
        </div>
      )}

      {!loading && !error && children}

      {footer && (
        <footer className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--findx-border-default)' }}>{footer}</footer>
      )}
    </main>
  );
}