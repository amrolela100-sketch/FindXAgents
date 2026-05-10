import { STATUS_LABELS, type LeadStatus } from "../lib/types";

const STATUS_STYLES: Record<LeadStatus, string> = {
  discovered: "bg-gray-100 text-gray-600 ring-gray-200",
  analyzing: "bg-amber-50 text-amber-700 ring-amber-200",
  analyzed: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  contacting: "bg-blue-50 text-blue-700 ring-blue-200",
  responded: "bg-orange-50 text-orange-700 ring-orange-200",
  qualified: "bg-purple-50 text-purple-700 ring-purple-200",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  lost: "bg-red-50 text-red-600 ring-red-200",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return null;

  const color =
    score >= 80
      ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
      : score >= 50
        ? "text-amber-700 bg-amber-50 ring-amber-200"
        : "text-red-600 bg-red-50 ring-red-200";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ring-1 ring-inset ${color}`}>
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

  const colorClass =
    score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-500";

  const trackColor =
    score >= 80 ? "stroke-emerald-100" : score >= 50 ? "stroke-amber-100" : "stroke-red-100";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={trackColor}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke="currentColor"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className={`${colorClass} transition-all duration-500`}
        />
      </svg>
      <span className={`absolute text-[11px] font-bold ${colorClass}`}>
        {score}
      </span>
    </div>
  );
}
