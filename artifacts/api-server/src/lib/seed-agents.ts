/**
 * seed-agents.ts
 *
 * Ensures the 3 core pipeline agents exist in the database.
 * Safe to call on every server startup — uses upsert logic (insert or skip).
 *
 * Pipeline order:
 *   1. discovery  — Finds real businesses via web search
 *   2. analysis   — Visits websites, scores digital gaps
 *   3. outreach   — Writes hyper-personalized cold emails
 */

import { db, agents } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

type AgentSeed = {
  name: string;
  displayName: string;
  description: string;
  role: string;
  icon: string;
  model: string;
  maxIterations: number;
  maxTokens: number;
  systemPrompt: string;
  toolNames: string[];
  pipelineOrder: number;
  isActive: boolean;
};

const PIPELINE_AGENTS: AgentSeed[] = [
  {
    name: "discovery",
    displayName: "Discovery Agent",
    description: "Scans the web using Tavily to find real businesses matching your ICP. Filters out directories & aggregators automatically.",
    role: "discovery",
    icon: "Search",
    model: "google/gemini-2.5-flash",
    maxIterations: 15,
    maxTokens: 4096,
    systemPrompt: "You are a B2B discovery agent. Your job is to find real, legitimate businesses on the web that match the user's search query. Filter out directories, aggregators, and fake results. Only save genuine company websites.",
    toolNames: ["web_search", "kvk_search", "google_places_search", "save_lead"],
    pipelineOrder: 1,
    isActive: true,
  },
  {
    name: "analysis",
    displayName: "Analysis Agent",
    description: "Visits every lead's website. Extracts emails, SSL status, load speed, social links — grounds the AI score in real verified data. No hallucination.",
    role: "analysis",
    icon: "BarChart3",
    model: "google/gemini-2.5-flash",
    maxIterations: 20,
    maxTokens: 8192,
    systemPrompt: "You are a B2B analysis agent. Your job is to visit business websites, extract real data (emails, phone numbers, SSL status, social links, tech stack), and generate an accurate lead score from 0–100 based on verified facts only. Never guess or hallucinate data.",
    toolNames: ["scrape_page", "check_website", "extract_emails", "extract_social_links", "check_ssl", "detect_tech", "check_mx"],
    pipelineOrder: 2,
    isActive: true,
  },
  {
    name: "outreach",
    displayName: "Outreach Agent",
    description: "Writes hyper-personalised cold emails referencing verified facts from the scraped site. Each email is unique and grounded in real data.",
    role: "outreach",
    icon: "Mail",
    model: "google/gemini-2.5-flash",
    maxIterations: 10,
    maxTokens: 4096,
    systemPrompt: "You are a B2B outreach agent. Your job is to write highly personalized cold emails for each lead, referencing specific verified facts from their website (e.g., missing SSL, slow load time, no social presence). Make each email feel handcrafted and relevant — never generic.",
    toolNames: ["web_search", "scrape_page"],
    pipelineOrder: 3,
    isActive: true,
  },
];

/**
 * Seed the 3 pipeline agents into the database.
 * Skips any agent that already exists (by name) — safe to run repeatedly.
 */
export async function seedAgents(): Promise<void> {
  let seeded = 0;
  let skipped = 0;

  for (const agentData of PIPELINE_AGENTS) {
    try {
      const [existing] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.name, agentData.name))
        .limit(1);

      if (existing) {
        skipped++;
        continue;
      }

      await db.insert(agents).values(agentData as typeof agents.$inferInsert);
      seeded++;
      logger.info({ agent: agentData.name, order: agentData.pipelineOrder }, "Seeded agent");
    } catch (err) {
      // If unique constraint fires (race condition), just skip
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("unique") || msg.includes("duplicate")) {
        skipped++;
      } else {
        logger.error({ err, agent: agentData.name }, "Failed to seed agent");
      }
    }
  }

  if (seeded > 0) {
    logger.info({ seeded, skipped }, `✅ Agent seed complete: ${seeded} created, ${skipped} already existed`);
  } else {
    logger.info({ skipped }, "✅ All pipeline agents already exist in DB");
  }
}
