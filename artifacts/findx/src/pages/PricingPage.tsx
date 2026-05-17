import { useState } from "react";
import { motion } from "framer-motion";
import { FADE_UP, STAGGER_CONTAINER, STAGGER_CHILD, SPRING } from "@/lib/motion";
import { Check, Zap, Building2, Sparkles } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { useAuth } from "@/lib/auth-context";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

// ─── Plan definitions ─────────────────────────────────────────────────────────

interface Plan {
  id: string;
  name: string;
  icon: typeof Zap;
  monthlyPrice: number;
  annualPrice: number;
  badge?: string;
  description: string;
  cta: string;
  ctaHref: string;
  highlighted: boolean;
  features: string[];
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    icon: Zap,
    monthlyPrice: 0,
    annualPrice: 0,
    description: "Perfect for trying FindX and running your first campaigns.",
    cta: "Start Free",
    ctaHref: "/",
    highlighted: false,
    features: [
      "10 pipeline runs / month",
      "50 leads total",
      "1 workspace",
      "AI-powered scoring",
      "Kanban pipeline board",
      "Email support (48h)",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: Sparkles,
    monthlyPrice: 49,
    annualPrice: 39,
    badge: "Most Popular",
    description: "For agencies and freelancers doing active B2B outreach.",
    cta: "Get Pro",
    ctaHref: "#",
    highlighted: true,
    features: [
      "100 pipeline runs / month",
      "500 leads",
      "3 workspaces",
      "Priority support (8h)",
      "CSV export",
      "Bulk lead actions",
      "Email approval flow",
      "All 6 languages (RTL support)",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    icon: Building2,
    monthlyPrice: 149,
    annualPrice: 119,
    description: "Unlimited scale for teams and white-label deployments.",
    cta: "Contact Sales",
    ctaHref: "mailto:sales@findx.app",
    highlighted: false,
    features: [
      "Unlimited pipeline runs",
      "Unlimited leads",
      "Unlimited workspaces",
      "API access",
      "White-label option",
      "Dedicated support",
      "Team members & roles",
      "Webhook integrations",
    ],
  },
];

// ─── Sub-Components ────────────────────────────────────────────────────────────

function PlanCard({ plan, annual }: { plan: Plan; annual: boolean }) {
  const Icon = plan.icon;
  const price = annual ? plan.annualPrice : plan.monthlyPrice;
  const isFree = plan.id === "free";
  const isAgency = plan.id === "agency";

  return (
    <motion.div
      variants={STAGGER_CHILD}
      className={cn(
        "relative flex flex-col rounded-2xl border p-6 transition-all duration-200",
        plan.highlighted
          ? "border-primary shadow-glow-brand scale-[1.02]"
          : "border-glass-border hover:border-primary/40"
      )}
      style={{
        background: plan.highlighted ? "var(--surface)" : "var(--surface-elevated)",
      }}
    >
      {/* Most Popular badge */}
      {plan.badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider text-white shadow-glow-brand"
          style={{ background: "var(--primary)" }}
        >
          {plan.badge}
        </div>
      )}

      {/* Icon + Name */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: plan.highlighted ? "var(--primary)" : "var(--primary)15",
          }}
        >
          <Icon
            className="w-4.5 h-4.5"
            style={{ color: plan.highlighted ? "white" : "var(--primary)" }}
          />
        </div>
        <div>
          <h3 className="font-bold text-text">{plan.name}</h3>
        </div>
      </div>

      {/* Price */}
      <div className="mb-4">
        {isFree ? (
          <p className="text-4xl font-bold font-mono text-text">€0</p>
        ) : isAgency ? (
          <div>
            <span className="text-4xl font-bold font-mono text-text">
              €{price}
            </span>
            <span className="text-sm ml-1" style={{ color: "var(--text-muted)" }}>
              /mo
            </span>
          </div>
        ) : (
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold font-mono text-text">€{price}</span>
            <span className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
              /mo
            </span>
          </div>
        )}
        {annual && !isFree && (
          <p className="text-xs mt-1" style={{ color: "var(--success, #22c55e)" }}>
            Save 20% with annual billing
          </p>
        )}
        <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
          {plan.description}
        </p>
      </div>

      {/* CTA */}
      <a
        href={plan.ctaHref}
        className={cn(
          "w-full py-2.5 rounded-xl text-sm font-bold text-center transition-all duration-200 mb-6 block",
          plan.highlighted
            ? "text-white shadow-glow-brand hover:opacity-90"
            : "hover:opacity-80 border border-glass-border"
        )}
        style={{
          background: plan.highlighted ? "var(--primary)" : "var(--surface-elevated)",
          color: plan.highlighted ? "white" : "var(--text)",
        }}
      >
        {plan.cta}
      </a>

      {/* Features */}
      <ul className="space-y-2.5 flex-1">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check
              className="w-4 h-4 mt-0.5 flex-shrink-0"
              style={{ color: "var(--primary)" }}
            />
            <span style={{ color: "var(--text-muted)" }}>{feature}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const { user } = useAuth();
  const { isRtl } = useLang();

  return (
    <div
      className="min-h-[100dvh] p-6 md:p-10"
      style={{ background: "var(--background)" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Header */}
      <motion.div
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
        custom={0}
        className="text-center max-w-2xl mx-auto mb-12"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-text mb-3">
          Simple, transparent pricing
        </h1>
        <p className="text-base" style={{ color: "var(--text-muted)" }}>
          Start free. Upgrade when you're ready to scale.
        </p>

        {/* Annual/Monthly toggle */}
        <div className="inline-flex items-center gap-3 mt-6 p-1 rounded-xl border border-glass-border" style={{ background: "var(--surface)" }}>
          <button
            onClick={() => setAnnual(false)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              !annual ? "text-white shadow-sm" : "text-text-muted hover:text-text"
            )}
            style={!annual ? { background: "var(--primary)" } : {}}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5",
              annual ? "text-white shadow-sm" : "text-text-muted hover:text-text"
            )}
            style={annual ? { background: "var(--primary)" } : {}}
          >
            Annual
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{
                background: annual ? "rgba(255,255,255,0.25)" : "var(--primary)20",
                color: annual ? "white" : "var(--primary)",
              }}
            >
              –20%
            </span>
          </button>
        </div>

        {/* Current plan indicator */}
        {user && (
          <p className="text-xs mt-3" style={{ color: "var(--text-subtle)" }}>
            You're currently on the <strong>Free</strong> plan.
          </p>
        )}
      </motion.div>

      {/* Plans grid */}
      <motion.div
        variants={STAGGER_CONTAINER}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto"
      >
        {PLANS.map(plan => (
          <PlanCard key={plan.id} plan={plan} annual={annual} />
        ))}
      </motion.div>

      {/* FAQ teaser */}
      <motion.div
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
        custom={3}
        className="text-center mt-14"
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Have questions?{" "}
          <Link href="/help">
            <a className="font-medium hover:underline" style={{ color: "var(--primary)" }}>
              Check our Help & Support page
            </a>
          </Link>
          {" "}or{" "}
          <a
            href="mailto:sales@findx.app"
            className="font-medium hover:underline"
            style={{ color: "var(--primary)" }}
          >
            contact sales
          </a>
          .
        </p>
        <p className="text-xs mt-2" style={{ color: "var(--text-subtle)" }}>
          No credit card required for the Free plan. Cancel anytime.
        </p>
      </motion.div>
    </div>
  );
}
