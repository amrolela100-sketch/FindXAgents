import { type ReactNode } from "react";
import { TopBar } from "./top-bar";

interface PageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** If true, don't add padding (page handles its own layout) */
  noPadding?: boolean;
}

/**
 * Wraps authenticated pages with the shared TopBar + proper bg.
 * The <Sidebar> is rendered by App.tsx so no need to add it here.
 */
export function PageShell({ children, title, subtitle, noPadding }: PageShellProps) {
  return (
    <div className="flex flex-col h-screen bg-surface text-on-surface overflow-hidden">
      <TopBar title={title} subtitle={subtitle} />
      <main className={`flex-1 overflow-y-auto ${noPadding ? "" : "px-margin-mobile md:px-margin-desktop py-gutter"}`}>
        {children}
      </main>
    </div>
  );
}
