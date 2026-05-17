/**
 * RadarIcon — FindX brand icon
 * Replaces the lightning bolt (⚡) as part of the Brand Refresh.
 * Concept: radar sweep = intelligent scanning + discovery.
 *
 * Usage: <RadarIcon className="w-5 h-5 text-white" />
 */
export function RadarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.35" />
      {/* Middle ring */}
      <circle cx="12" cy="12" r="6"   stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.55" />
      {/* Inner ring */}
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.4" strokeOpacity="0.75" />
      {/* Center dot */}
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      {/* Sweep arm */}
      <line
        x1="12" y1="12"
        x2="19.8" y2="5.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* Detected blip */}
      <circle cx="19.8" cy="5.5" r="1.1" fill="currentColor" />
    </svg>
  );
}
