import { Skeleton } from "./skeleton";

// ── LeadRowSkeleton ──────────────────────────────────────────────────────────
export function LeadRowSkeleton() {
  return (
    <tr>
      {/* Checkbox */}
      <td className="px-4 py-3 w-10">
        <Skeleton className="w-4 h-4 rounded" />
      </td>
      {/* Business name + industry */}
      <td className="px-4 py-3">
        <Skeleton className="h-4 w-36 mb-1.5" />
        <Skeleton className="h-3 w-24" />
      </td>
      {/* City */}
      <td className="px-4 py-3">
        <Skeleton className="h-3.5 w-20" />
      </td>
      {/* Date */}
      <td className="px-4 py-3">
        <Skeleton className="h-3.5 w-24" />
      </td>
      {/* Status */}
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-20 rounded-full" />
      </td>
      {/* Score */}
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-8 rounded-full" />
      </td>
      {/* Website */}
      <td className="px-4 py-3">
        <Skeleton className="h-3.5 w-28" />
      </td>
      {/* Actions */}
      <td className="px-3 py-3 w-10" />
    </tr>
  );
}

// ── AgentCardSkeleton ────────────────────────────────────────────────────────
export function AgentCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}
      aria-hidden="true"
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="h-4 w-28 mb-1.5" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      {/* Description */}
      <Skeleton className="h-3 w-full mb-1.5" />
      <Skeleton className="h-3 w-4/5 mb-4" />
      {/* Stats row */}
      <div className="flex gap-4 mb-4">
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
      {/* Button */}
      <Skeleton className="h-9 w-full rounded-xl" />
    </div>
  );
}

// ── StatCardSkeleton ─────────────────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="w-7 h-7 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-2.5 w-full rounded-full" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// ── ActivityItemSkeleton ─────────────────────────────────────────────────────
export function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3 py-2.5" aria-hidden="true">
      <Skeleton className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <Skeleton className="h-3.5 w-3/4 mb-1.5" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-3 w-12 flex-shrink-0" />
    </div>
  );
}

// ── KanbanCardSkeleton ───────────────────────────────────────────────────────
export function KanbanCardSkeleton() {
  return (
    <div
      className="rounded-xl p-3 mb-2"
      style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}
      aria-hidden="true"
    >
      <Skeleton className="h-4 w-3/4 mb-2" />
      <Skeleton className="h-3 w-1/2 mb-3" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  );
}
