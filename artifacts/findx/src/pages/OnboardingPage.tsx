import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Zap, Search, BarChart2, Mail, Building2, MapPin, Target, ChevronRight } from "lucide-react";
import { useAuth } from "../lib/auth-context";

interface OnboardingData {
  companyName: string;
  companyWebsite: string;
  industry: string;
  city: string;
  icp: string;
  targetIndustry: string;
  targetCity: string;
}

const INDUSTRIES = ["SaaS", "Fintech", "E-commerce", "Logistics", "Marketing", "Healthcare", "Manufacturing", "Other"];
const CITIES = ["Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Eindhoven", "Tilburg", "Groningen", "All of Netherlands"];

const fadeSlide = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
};

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-500 ${
            i < current ? "bg-[#1A1A1A]" : i === current ? "bg-[#1A1A1A] w-8" : "bg-[#E5E3D9]"
          } ${i === current ? "w-8" : "w-4"}`}
        />
      ))}
    </div>
  );
}

export default function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    companyName: "",
    companyWebsite: "",
    industry: "",
    city: "",
    icp: "",
    targetIndustry: "",
    targetCity: "",
  });

  const TOTAL_STEPS = 4;

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const [error, setError] = useState<string | null>(null);

  const handleFinish = async () => {
    setSaving(true);
    setError(null);
    try {
      const { supabase } = await import("../lib/supabase");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setError("Not authenticated. Please log in again.");
        return;
      }
      const base = (import.meta.env.VITE_API_URL as string) || "/api";
      const res = await fetch(`${base}/onboarding/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `Server error: ${res.status}`);
      }
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    {
      key: "welcome",
      render: () => (
        <div className="space-y-8">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1A1A] flex items-center justify-center">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <div className="space-y-3">
            <h1 className="font-serif text-4xl font-bold text-[#1A1A1A]">
              Welcome to FindX,<br />
              {(user as any)?.user_metadata?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there"}!
            </h1>
            <p className="text-[#7A756D] text-lg leading-relaxed max-w-md">
              Let's set up your account in a few steps so your AI agents can immediately find the right B2B prospects.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 max-w-md">
            {[
              { icon: Search, label: "Discovery Agent", desc: "Finds prospects" },
              { icon: BarChart2, label: "Analysis Agent", desc: "Scores leads" },
              { icon: Mail, label: "Outreach Agent", desc: "Writes emails" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="bg-[#F7F5F0] border border-[#E5E3D9] rounded-xl p-3 text-center space-y-1.5">
                <div className="w-8 h-8 rounded-lg bg-white border border-[#E5E3D9] flex items-center justify-center mx-auto">
                  <Icon className="w-4 h-4 text-[#1A1A1A]" />
                </div>
                <p className="text-xs font-semibold text-[#1A1A1A]">{label}</p>
                <p className="text-[10px] text-[#7A756D]">{desc}</p>
              </div>
            ))}
          </div>
          <button
            onClick={next}
            className="flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#2A2A2A] transition-colors"
          >
            Get started <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ),
    },
    {
      key: "company",
      render: () => (
        <div className="space-y-7 max-w-md">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#F0EDE6] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <h2 className="font-serif text-3xl font-bold text-[#1A1A1A]">Your company</h2>
            <p className="text-[#7A756D]">Tell us about your company so we have the right context.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Company name</label>
              <input
                className="w-full px-4 py-2.5 border border-[#E5E3D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:border-[#1A1A1A] transition"
                placeholder="e.g. Acme B.V."
                value={data.companyName}
                onChange={(e) => setData((d) => ({ ...d, companyName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Website</label>
              <input
                className="w-full px-4 py-2.5 border border-[#E5E3D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:border-[#1A1A1A] transition"
                placeholder="e.g. acme.nl"
                value={data.companyWebsite}
                onChange={(e) => setData((d) => ({ ...d, companyWebsite: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Industry</label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    onClick={() => setData((d) => ({ ...d, industry: ind }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      data.industry === ind
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                        : "bg-white text-[#7A756D] border-[#E5E3D9] hover:border-[#1A1A1A]"
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">City</label>
              <div className="flex flex-wrap gap-2">
                {CITIES.slice(0, 5).map((city) => (
                  <button
                    key={city}
                    onClick={() => setData((d) => ({ ...d, city }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      data.city === city
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                        : "bg-white text-[#7A756D] border-[#E5E3D9] hover:border-[#1A1A1A]"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "icp",
      render: () => (
        <div className="space-y-7 max-w-md">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#F0EDE6] flex items-center justify-center">
              <Target className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <h2 className="font-serif text-3xl font-bold text-[#1A1A1A]">Ideal customer</h2>
            <p className="text-[#7A756D]">Describe your ideal prospect — agents use this as a search query.</p>
          </div>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">ICP description</label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 border border-[#E5E3D9] rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:border-[#1A1A1A] transition resize-none"
                placeholder="e.g. Dutch B2B SaaS companies with 10-200 employees that have an outdated website and are actively growing."
                value={data.icp}
                onChange={(e) => setData((d) => ({ ...d, icp: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">Target industry</label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    onClick={() => setData((d) => ({ ...d, targetIndustry: ind }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      data.targetIndustry === ind
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                        : "bg-white text-[#7A756D] border-[#E5E3D9] hover:border-[#1A1A1A]"
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[#1A1A1A]">
                <MapPin className="w-3.5 h-3.5 inline mr-1" />Target region
              </label>
              <div className="flex flex-wrap gap-2">
                {CITIES.map((city) => (
                  <button
                    key={city}
                    onClick={() => setData((d) => ({ ...d, targetCity: city }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      data.targetCity === city
                        ? "bg-[#1A1A1A] text-white border-[#1A1A1A]"
                        : "bg-white text-[#7A756D] border-[#E5E3D9] hover:border-[#1A1A1A]"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "done",
      render: () => (
        <div className="space-y-8 max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center"
          >
            <Check className="w-8 h-8 text-white" strokeWidth={2.5} />
          </motion.div>
          <div className="space-y-3">
            <h2 className="font-serif text-4xl font-bold text-[#1A1A1A]">Ready to go!</h2>
            <p className="text-[#7A756D] text-lg leading-relaxed">
              Your profile is set up. Agents are ready to find your first leads.
            </p>
          </div>
          <div className="bg-[#F7F5F0] border border-[#E5E3D9] rounded-2xl p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7A756D]">Your settings</p>
            {[
              { label: "Company", value: data.companyName || "—" },
              { label: "Target market", value: data.targetIndustry || "—" },
              { label: "Region", value: data.targetCity || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-[#7A756D]">{label}</span>
                <span className="font-medium text-[#1A1A1A]">{value}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleFinish}
            disabled={saving}
            className="flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#2A2A2A] transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Start FindX"}
            <ArrowRight className="w-4 h-4" />
          </button>
          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F5F0] flex">
      {/* Left decorative panel */}
      <div className="hidden lg:flex w-80 bg-[#1A1A1A] flex-col p-10 justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white/10">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-serif font-bold text-white">FindX</span>
        </div>
        <div className="space-y-6">
          {["Set up your profile", "Configure AI agents", "Discover first leads"].map((s, i) => (
            <div key={s} className={`flex items-center gap-3 ${i <= step ? "opacity-100" : "opacity-30"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${i < step ? "bg-emerald-500" : i === step ? "bg-white" : "bg-white/20"}`}>
                {i < step ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : (
                  <span className={`text-xs font-bold ${i === step ? "text-[#1A1A1A]" : "text-white"}`}>{i + 1}</span>
                )}
              </div>
              <span className="text-sm text-white/80">{s}</span>
            </div>
          ))}
        </div>
        <p className="text-[#7A756D] text-xs">FindX · Dutch B2B Prospecting</p>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between px-10 py-6">
          <StepIndicator current={step} total={TOTAL_STEPS} />
          <span className="text-sm text-[#7A756D]">Step {step + 1} of {TOTAL_STEPS}</span>
        </div>

        <div className="flex-1 px-10 py-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={fadeSlide.initial}
              animate={fadeSlide.animate}
              exit={fadeSlide.exit}
              transition={fadeSlide.transition as any}
            >
              {steps[step].render()}
            </motion.div>
          </AnimatePresence>
        </div>

        {step > 0 && step < TOTAL_STEPS - 1 && (
          <div className="px-10 py-6 border-t border-[#E5E3D9] flex items-center justify-between">
            <button
              onClick={prev}
              className="text-sm text-[#7A756D] hover:text-[#1A1A1A] transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={next}
              className="flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2A2A2A] transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
