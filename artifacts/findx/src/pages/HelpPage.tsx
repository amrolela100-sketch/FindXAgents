import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FADE_UP, STAGGER_CONTAINER, STAGGER_CHILD, SPRING } from "@/lib/motion";
import {
  HelpCircle, ChevronDown, ChevronRight,
  Mail, Github, BookOpen, Zap, Search, BarChart3,
  Send, Key, Settings2, AlertCircle
} from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { Link } from "wouter";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSection {
  title: string;
  icon: typeof HelpCircle;
  items: FAQItem[];
}

// ─── FAQ Data ──────────────────────────────────────────────────────────────────

const QUICK_START: FAQSection = {
  title: "Quick Start",
  icon: Zap,
  items: [
    {
      q: "How do I run my first pipeline?",
      a: "Go to Pipeline → type a search query like 'web design agencies in Amsterdam' → click Run. The AI will discover up to 50 real businesses, visit their websites, and score each one. The whole process takes 2–5 minutes.",
    },
    {
      q: "How do I understand lead scores (0–100)?",
      a: "Lower score = more digital gaps = better prospect. The score is calculated from real data: SSL status, page load speed, social media presence, email/phone visibility, and website quality. A score of 20 means that company has serious online weaknesses your agency can fix.",
    },
    {
      q: "How do I send my first outreach email?",
      a: "Open any analyzed lead → click Generate Outreach → review the AI-written email. It references a specific verified fact from the company's website. Click Approve & Send to dispatch it via Resend, or Edit to customize it first.",
    },
  ],
};

const COMMON_QUESTIONS: FAQSection = {
  title: "Common Questions",
  icon: HelpCircle,
  items: [
    {
      q: "Which API keys do I need?",
      a: "Required: Tavily API key (for web search) and Resend API key (for email sending). Optional: Google Places API for richer location data. Set them in Settings → API Keys.",
    },
    {
      q: "What does the AI filter out?",
      a: "The AI automatically rejects directories (Clutch, Sortlist, DesignRush, Yelp, etc.), blog posts, news articles, and 40+ aggregator domains. Every result is a real company's homepage.",
    },
    {
      q: "Why did my agent run fail?",
      a: "Most failures are caused by: (1) invalid Tavily API key, (2) Tavily free tier limit reached, (3) network timeout on a slow website. Check Settings → API Keys to verify your keys, then re-run.",
    },
    {
      q: "How do I move leads through the pipeline?",
      a: "In the Leads page, switch to Kanban view. Drag cards between New → Qualified → Won. Or open a lead's detail panel and change the stage from the dropdown.",
    },
    {
      q: "Can I import my existing leads?",
      a: "Yes — Leads page → Import → upload a CSV. FindX will show you a preview of the first 5 rows and let you map your columns before importing.",
    },
    {
      q: "What languages are supported?",
      a: "Arabic (RTL), English, Dutch, French, Spanish, and German. Switch language in the top bar or in Settings. The entire UI — including the AI's outreach emails — adapts to your selected language.",
    },
  ],
};

// ─── Sub-Components ────────────────────────────────────────────────────────────

function AccordionItem({ q, a }: FAQItem) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border border-glass-border rounded-xl overflow-hidden transition-all duration-200"
      style={{ background: open ? "var(--surface)" : "var(--surface-elevated)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-sm font-medium text-text leading-snug">{q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={SPRING}
          className="flex-shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-text-muted" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FAQBlock({ section }: { section: FAQSection }) {
  const Icon = section.icon;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--primary)10" }}>
          <Icon className="w-4 h-4" style={{ color: "var(--primary)" }} />
        </div>
        <h2 className="font-semibold text-text">{section.title}</h2>
      </div>
      <div className="space-y-2">
        {section.items.map((item, i) => (
          <AccordionItem key={i} {...item} />
        ))}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HelpPage() {
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
        className="mb-10"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-glow-brand"
            style={{ background: "var(--primary)" }}>
            <HelpCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text">Help & Support</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Everything you need to get the most out of FindX
            </p>
          </div>
        </div>
      </motion.div>

      <div className="max-w-3xl space-y-12">
        {/* Quick Start */}
        <motion.div variants={FADE_UP} initial="hidden" animate="visible" custom={1}>
          <FAQBlock section={QUICK_START} />
        </motion.div>

        {/* Common Questions */}
        <motion.div variants={FADE_UP} initial="hidden" animate="visible" custom={2}>
          <FAQBlock section={COMMON_QUESTIONS} />
        </motion.div>

        {/* Documentation */}
        <motion.div variants={FADE_UP} initial="hidden" animate="visible" custom={3}>
          <div className="rounded-2xl border border-glass-border p-6" style={{ background: "var(--surface)" }}>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <h2 className="font-semibold text-text">Documentation</h2>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              Detailed guides, API reference, and architecture docs.
            </p>
            <a
              href="https://github.com/amrolela100-sketch/FindXAgents/blob/main/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-all hover:opacity-80"
              style={{ background: "var(--primary)15", color: "var(--primary)" }}
            >
              <Github className="w-4 h-4" />
              View on GitHub
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </motion.div>

        {/* Contact Support */}
        <motion.div variants={FADE_UP} initial="hidden" animate="visible" custom={4}>
          <div className="rounded-2xl border border-glass-border p-6" style={{ background: "var(--surface)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <h2 className="font-semibold text-text">Contact Support</h2>
            </div>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              Can't find your answer? The team typically responds within 24 hours.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="mailto:support@findx.app"
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl text-white shadow-glow-brand transition-all hover:opacity-90"
                style={{ background: "var(--primary)" }}
              >
                <Mail className="w-4 h-4" />
                support@findx.app
              </a>
              <a
                href="https://github.com/amrolela100-sketch/FindXAgents/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:opacity-80"
                style={{ background: "var(--surface-elevated)", color: "var(--text)", border: "1px solid var(--border)" }}
              >
                <Github className="w-4 h-4" />
                Open a GitHub Issue
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
