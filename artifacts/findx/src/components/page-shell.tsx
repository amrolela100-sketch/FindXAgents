import { type ReactNode } from "react";
import { TopBar } from "./top-bar";
import { cn } from "@/lib/utils";

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
    <div className="flex flex-col min-h-screen bg-background transition-colors duration-300">
      <TopBar title={title} subtitle={subtitle} actions={actions} />
      <main
        className={cn(
          "flex-1 w-full max-w-[1600px] mx-auto",
          noPadding ? "" : "px-4 md:px-8 py-6"
        )}
      >
        {children}
      </main>
    </div>
  );
}
