/**
 * HomePage — Section Card Component
 */
import { TrendingUp } from "lucide-react";

export function SectionCard({ title, icon: Icon, children, action }: {
  title: string; icon: typeof TrendingUp; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--glass-border)", background: "var(--glass-raised)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
            <Icon className="w-3.5 h-3.5" style={{ color: "var(--brand)" }} />
          </div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{title}</p>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
