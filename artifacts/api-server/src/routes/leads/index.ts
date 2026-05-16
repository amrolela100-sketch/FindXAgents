/**
 * routes/leads/index.ts
 *
 * Composes all lead sub-routers into a single router.
 * Route registration order matters — static sub-paths (bulk/*, discover, export, import)
 * MUST appear before the parameterised /:id routes to avoid false matches.
 */
import { Router } from "express";
import { requireAuth, requireWorkspace } from "../../middleware/auth.js";
import listRouter from "./list.js";
import crudRouter from "./crud.js";
import discoverRouter from "./discover.js";
import bulkRouter from "./bulk.js";
import importExportRouter from "./import-export.js";
import analysisRouter from "./analysis.js";

const router = Router();

router.use(requireAuth, requireWorkspace);

// 1. Static paths first (no :id) — avoids /:id swallowing them
router.use(listRouter);           // GET  /leads
router.use(discoverRouter);       // POST /leads/discover
router.use(bulkRouter);           // POST /leads/bulk/*  PATCH /leads/bulk/status
router.use(importExportRouter);   // POST /leads/import  GET  /leads/export

// 2. Parameterised :id routes last
router.use(crudRouter);           // POST /leads  GET/PATCH/DELETE /leads/:id
router.use(analysisRouter);       // POST /leads/:id/analyze  GET /leads/:id/analyses
                                  // POST /leads/:id/outreach/*  GET /leads/:id/outreaches

export default router;
