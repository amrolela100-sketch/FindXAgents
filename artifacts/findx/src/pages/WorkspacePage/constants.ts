/**
 * WorkspacePage — Constants & Types
 */

import type { Workspace } from "@/lib/workspace-context";

export const INDUSTRIES = [
  "SaaS", "Fintech", "E-commerce", "Logistics", "Marketing",
  "Healthcare", "Manufacturing", "Real Estate", "Education",
  "Food & Beverage", "Retail", "Construction", "Other",
];

export const REGIONS: { group: string; options: string[] }[] = [
  { group: "🇦🇪 UAE", options: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "UAE – All"] },
  { group: "🇸🇦 Saudi Arabia", options: ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina", "Saudi Arabia – All"] },
  { group: "🌍 MENA", options: ["Egypt – Cairo", "Qatar – Doha", "Kuwait", "Bahrain", "Oman – Muscat", "Jordan – Amman", "Iraq – Baghdad", "Syria – Damascus", "Lebanon – Beirut", "Libya", "Tunisia", "Morocco – Casablanca", "Algeria"] },
  { group: "🇳🇱 Netherlands", options: ["Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Eindhoven", "Tilburg", "Groningen", "Heel Nederland"] },
  { group: "🌍 Europe", options: ["London", "Paris", "Berlin", "Madrid", "Rome", "Barcelona", "Vienna", "Brussels", "Stockholm", "Copenhagen"] },
  { group: "🌏 Asia", options: ["Istanbul", "Singapore", "Hong Kong", "Mumbai", "Karachi", "Lahore", "Nairobi", "Lagos"] },
  { group: "🌎 Americas", options: ["New York", "Los Angeles", "Miami", "Toronto", "São Paulo"] },
];

export type WorkspaceFormData = Pick<Workspace, "name" | "description" | "icp" | "targetIndustry" | "targetCity">;
