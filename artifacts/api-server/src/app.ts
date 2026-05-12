import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

import helmet from "helmet";

/**
 * CORS configuration.
 *
 * Accepts requests from:
 *  - Only the specified FRONTEND_URL or FRONTEND_ORIGIN env var, or localhost for dev
 */
function buildCorsOptions(): cors.CorsOptions {
  const allowedOrigins = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL]
    : ["http://localhost:5173", "http://localhost:3000"];

  const extra = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const allAllowed = [...allowedOrigins, ...extra];

  return {
    origin(origin, callback) {
      if (!origin || allAllowed.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  };
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ── Security headers via helmet ───────────────────────────────────────────────
// Overrides the helmet() defaults with a strict, explicit CSP.
// The API is JSON-only — no inline scripts, frames, or images are served.
app.use(
  helmet({
    // Strict Content-Security-Policy for an API server (no HTML served)
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'none'"],
        scriptSrc:      ["'none'"],
        objectSrc:      ["'none'"],
        frameAncestors: ["'none'"],
        formAction:     ["'none'"],
        baseUri:        ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    // HSTS — force HTTPS for 1 year, include subdomains
    hsts: {
      maxAge:            31_536_000,
      includeSubDomains: true,
      preload:           true,
    },
    // Prevent MIME-type sniffing
    noSniff: true,
    // Block embedding in iframes
    frameguard: { action: "deny" },
    // XSS filter (legacy browsers)
    xssFilter: true,
    // Remove X-Powered-By: Express
    hidePoweredBy: true,
    // Referrer policy
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    // Permissions policy — disable unused browser features
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    crossOriginEmbedderPolicy:   false, // API doesn't serve documents
    crossOriginResourcePolicy:   { policy: "same-site" },
    crossOriginOpenerPolicy:     { policy: "same-origin" },
  }),
);
app.use(cors(buildCorsOptions()));
// Limit request body to 1 MB to prevent DoS via oversized JSON payloads
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

import { globalLimiter } from "./middleware/rate-limit.js";

app.use("/api", globalLimiter, router);

export default app;
