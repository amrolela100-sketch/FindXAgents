import { type ReactNode } from "react";
import { TopBar } from "./top-bar";

interface PageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Full bleed — page manages its own padding */
  noPadding?: boolean;
}

export function PageShell({ children, title, subtitle, actions, noPadding }: PageShellProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopBar title={title} subtitle={subtitle} actions={actions} />
      <main
        className={`flex-1 ${noPadding ? "" : "px-5 md:px-8 py-6"}`}
        style={{ color: "var(--text)" }}
      >
        {children}
      </main>
    </div>
  );
}
