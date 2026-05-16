/**
 * AgentsPage — Agent Metadata & Types
 */
import { Search, BarChart3, Mail, Bot } from "lucide-react";
import type { Agent } from "@/lib/types";

export const AGENT_META: Record<string, {
  icon: typeof Bot; accent: string; gradient: string; bg: string; description: string;
}> = {
  discovery: { icon: Search, accent: "#60A5FA", gradient: "linear-gradient(135deg, #60A5FA22, #3B82F608)", bg: "rgba(96,165,250,0.10)", description: "Scans the web using Tavily to find real businesses matching your ICP. Filters out directories & aggregators." },
  analysis: { icon: BarChart3, accent: "#FBBF24", gradient: "linear-gradient(135deg, #FBBF2422, #F59E0B08)", bg: "rgba(251,191,36,0.10)", description: "Visits every lead's website. Extracts emails, SSL, load speed, social links — grounds the AI score in real data." },
  outreach: { icon: Mail, accent: "#34D399", gradient: "linear-gradient(135deg, #34D39922, #10B98108)", bg: "rgba(52,211,153,0.10)", description: "Writes hyper-personalised cold emails referencing verified facts from the scraped site. No hallucination." },
};

export const FALLBACK_AGENTS: Agent[] = [
  { id: "fallback-discovery", name: "discovery", displayName: "Discovery Agent", description: "Scans the web using Tavily to find real businesses matching your ICP.", role: "discovery", icon: "Search", model: "google/gemini-2.5-flash", maxIterations: 15, maxTokens: 4096, temperature: null, identityMd: "", soulMd: "", toolsMd: "", systemPrompt: "", toolNames: ["web_search", "save_lead"], pipelineOrder: 1, isActive: true, skills: [], createdAt: "", updatedAt: "" },
  { id: "fallback-analysis", name: "analysis", displayName: "Analysis Agent", description: "Visits every lead's website, extracts emails, SSL status, load speed & scores.", role: "analysis", icon: "BarChart3", model: "google/gemini-2.5-flash", maxIterations: 20, maxTokens: 8192, temperature: null, identityMd: "", soulMd: "", toolsMd: "", systemPrompt: "", toolNames: ["scrape_page", "check_ssl", "extract_emails"], pipelineOrder: 2, isActive: true, skills: [], createdAt: "", updatedAt: "" },
  { id: "fallback-outreach", name: "outreach", displayName: "Outreach Agent", description: "Writes hyper-personalised cold emails referencing verified facts.", role: "outreach", icon: "Mail", model: "google/gemini-2.5-flash", maxIterations: 25, maxTokens: 6144, temperature: null, identityMd: "", soulMd: "", toolsMd: "", systemPrompt: "", toolNames: ["send_email", "update_lead"], pipelineOrder: 3, isActive: true, skills: [], createdAt: "", updatedAt: "" },
];
