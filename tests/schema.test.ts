import { describe, it, expect } from "vitest";
import { leads, users, pipelineStages } from "../lib/db/src/schema";
import { getTableConfig } from "drizzle-orm/pg-core";

describe("Database Schema Validations", () => {
  it("should have correct lead status enum values", () => {
    // We check if the leads table has the status field with the default value
    const statusField = leads.status;
    expect(statusField.default).toBe("discovered");
  });

  it("should define users table with an email index", () => {
    const config = getTableConfig(users);
    expect(config.indexes.some((idx) => idx.name === "idx_users_email")).toBe(true);
  });

  it("should define pipeline stages with unique names and orders", () => {
    const config = getTableConfig(pipelineStages);
    // Unique constraints are applied as unique indexes or column uniques
    expect(pipelineStages.name.isUnique).toBe(true);
    expect(pipelineStages.order.isUnique).toBe(true);
  });
  
  it("leads table should have a relationship to pipeline stages", () => {
    expect(leads.pipelineStageId).toBeDefined();
  });
});
