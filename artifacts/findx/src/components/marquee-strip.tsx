/* ─────────────────────────────────────────
   MarqueeStrip — dual-row animated ticker
   Row 1 (→ left):  lead companies + scores
   Row 2 (→ right): AI activity events
───────────────────────────────────────── */

const LEADS = [
  "🔥 Verbouw&Zo BV · Amsterdam · 87pts",
  "⚡ TechVenture NL · Rotterdam · 79pts",
  "✓ Maasbouw Groep · Utrecht · WON",
  "🔥 Digital Agency Hub · Den Haag · 91pts",
  "⚡ Renovatie Partners · Eindhoven · 74pts",
  "✓ BuildSmart BV · Groningen · WON",
  "🔥 ProTech Solutions · Amsterdam · 88pts",
  "⚡ Bouw & Advies NL · Haarlem · 82pts",
  "✓ Installatie Groep · Utrecht · 76pts",
  "🔥 WebForce Studio · Rotterdam · 93pts",
];

const EVENTS = [
  "AI analysis complete · Gemini 2.5 Flash · 2s ago",
  "Email sent via Resend · Dutch template · 3 min ago",
  "New lead discovered · Amsterdam · just now",
  "Score updated · 74 → 91 · 5 min ago",
  "Outreach drafted · 3 emails ready · 8 min ago",
  "Pipeline run completed · 14 leads · 12 min ago",
  "Analysis complete · revenue at risk €4,200/mo",
  "Google Business scraped · 47 reviews · 1 min ago",
  "Lead qualified · Maasbouw Groep · 2 min ago",
  "AI model: Gemini 2.5 Flash · latency 1.8s",
];

function MarqueeRow({
  items,
  direction,
}: {
  items: string[];
  direction: "left" | "right";
}) {
  // Duplicate items so the seamless loop works
  const doubled = [...items, ...items];
  const trackClass =
    direction === "left" ? "marquee-track-left" : "marquee-track-right";

  return (
    <div className="overflow-hidden">
      <div className={trackClass}>
        {doubled.map((item, i) => (
          <span
            key={i}
            className="whitespace-nowrap text-[13px] font-medium text-[#F7F5F0] px-6 flex items-center gap-2"
          >
            {item}
            <span className="text-[var(--text-muted)] select-none px-1">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function MarqueeStrip() {
  return (
    <div
      className="bg-[#1A1A1A] py-2.5 space-y-1.5 overflow-hidden"
      aria-hidden="true"
    >
      <MarqueeRow items={LEADS} direction="left" />
      <MarqueeRow items={EVENTS} direction="right" />
    </div>
  );
}
