/**
 * Shared utility functions used across the API server.
 *
 * LOW-1 fix: consolidate duplicated helpers instead of copying them file-by-file.
 * Previously getDomain() was defined independently in:
 *   - lib/agent-runner.ts (private, non-exported)
 *   - services/discovery.service.ts (exported)
 * Both implementations were identical. This file is the single source of truth.
 */

// ─── URL / Domain helpers ─────────────────────────────────────────────────────

/**
 * Extract the bare hostname from a URL, stripping the leading "www." prefix.
 *
 * Examples:
 *   getDomain("https://www.example.com/path") → "example.com"
 *   getDomain("example.com")                  → "example.com"
 *   getDomain(undefined)                       → null
 *
 * Used for:
 *  - Per-domain deduplication in the discovery pipeline
 *  - Matching scraped leads against existing DB records
 *  - Building display names when page titles are unavailable
 */
export function getDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// ─── String helpers ────────────────────────────────────────────────────────────

/**
 * Truncate a string to maxLength characters, appending "…" if truncated.
 * Safe to call with null/undefined (returns "").
 */
export function truncate(value: unknown, maxLength = 100): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return s.length > maxLength ? s.slice(0, maxLength) + "…" : s;
}

// ─── Error helpers ─────────────────────────────────────────────────────────────

/**
 * Extract a readable message from an unknown caught value.
 * Covers: Error instances, plain objects with .message, and primitives.
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}
