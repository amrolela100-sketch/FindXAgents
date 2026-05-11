import { STATUS_LABELS, type LeadStatus } from "../lib/types";

/* Glass-aware status styles — no hardcoded light/dark split needed */
const STATUS_STYLES: Record<LeadStatus, { bg: string; text: string; border: string; dot: string }> = {
  discovered: {
    bg:     "rgba(148,163,184, 0.12)",
    text:   "var(--text-muted)",
    border: "rgba(148,163,184, 0.25)",
    dot:    "#94A3B8",
  },
  analyzing: {
    bg:     "rgba(245,158,11, 0.12)",
    text:   "#F59E0B",
    border: "rgba(245,158,11, 0.28)",
    dot:    "#F59E0B",
  },
  analyzed: {
    bg:     "rgba(99,102,241, 0.12)",
    text:   "#818CF8",
    border: "rgba(99,102,241, 0.28)",
    dot:    "#818CF8",
  },
  contacting: {
    bg:     "rgba(59,130,246, 0.12)",
    text:   "#60A5FA",
    border: "rgba(59,130,246, 0.28)",
    dot:    "#60A5FA",
  },
  responded: {
    bg:     "rgba(249,115,22, 0.12)",
    text:   "#FB923C",
    border: "rgba(249,115,22, 0.28)",
    dot:    "#FB923C",
  },
  qualified: {
    bg:     "rgba(168,85,247, 0.12)",
    text:   "#C084FC",
    border: "rgba(168,85,247, 0.28)",
    dot:    "#C084FC",
  },
  won: {
    bg:     "rgba(16,185,129, 0.12)",
    text:   "#34D399",
    border: "rgba(16,185,129, 0.28)",
    dot:    "#34D399",
  },
  lost: {
    bg:     "rgba(239,68,68, 0.12)",
    text:   "#F87171",
    border: "rgba(239,68,68, 0.28)",
    dot:    "#F87171",
  },
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{
        background: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: s.dot }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;

  const config =
    score >= 80
      ? { bg: "rgba(16,185,129,0.12)", text: "#34D399", border: "rgba(16,185,129,0.28)" }
      : score >= 50
      ? { bg: "rgba(245,158,11,0.12)", text: "#FBBF24", border: "rgba(245,158,11,0.28)" }
      : { bg: "rgba(239,68,68,0.12)", text: "#F87171", border: "rgba(239,68,68,0.28)" };

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold"
      style={{
        background: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      {score}
    </span>
  );
}

export function ScoreRing({ score, size = 40 }: { score: number | null | undefined; size?: number }) {
  if (score == null) return null;

  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const color =
    score >= 80 ? "#34D399" : score >= 50 ? "#FBBF24" : "#F87171";

  const trackColor =
    score >= 80
      ? "rgba(16,185,129,0.15)"
      : score >= 50
      ? "rgba(245,158,11,0.15)"
      : "rgba(239,68,68,0.15)";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={stroke}
          stroke={trackColor}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-[11px] font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}
