import { motion } from "framer-motion";
import { FADE_UP, SPRING } from "@/lib/motion";
import { Home, Zap } from "lucide-react";
import { RadarIcon } from "@/components/radar-icon";
import { Link } from "wouter";
import { useLang } from "@/lib/lang-context";

export default function NotFound() {
  const { isRtl } = useLang();

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center"
      style={{ background: "var(--background)" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Logo mark */}
      <motion.div
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
        custom={0}
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-sm"
        style={{ background: "var(--primary)" }}
      >
        <RadarIcon className="w-7 h-7 text-white" />
      </motion.div>

      {/* 404 number */}
      <motion.p
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
        custom={1}
        className="text-8xl font-bold font-mono leading-none mb-4"
        style={{ color: "var(--primary)" }}
      >
        404
      </motion.p>

      {/* Heading */}
      <motion.h1
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
        custom={2}
        className="text-2xl font-bold text-text mb-2"
      >
        Page not found
      </motion.h1>

      {/* Subtext */}
      <motion.p
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
        custom={3}
        className="text-sm max-w-sm mb-8"
        style={{ color: "var(--text-muted)" }}
      >
        The page you're looking for doesn't exist or was moved.
      </motion.p>

      {/* CTA */}
      <motion.div
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
        custom={4}
      >
        <Link href="/">
          <a
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:opacity-90"
            style={{ background: "var(--primary)" }}
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </a>
        </Link>
      </motion.div>
    </div>
  );
}
