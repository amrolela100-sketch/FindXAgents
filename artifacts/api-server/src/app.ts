import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { sentryRequestHandler, sentryErrorHandler } from "./lib/sentry.js";

const app: Express = express();

import helmet from "helmet";

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

// ── Sentry request tracing (must be first middleware) ─────────────────────────
app.use(sentryRequestHandler());

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(
  helmet({
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
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
    noSniff: true,
    frameguard: { action: "deny" },
    xssFilter: true,
    hidePoweredBy: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    crossOriginEmbedderPolicy:   false,
    crossOriginResourcePolicy:   { policy: "cross-origin" },
    crossOriginOpenerPolicy:     { policy: "same-origin" },
  }),
);
app.use(cors(buildCorsOptions()));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// MED-3: /leads/import accepts CSV up to 5MB
app.use("/api/leads/import", express.text({ type: ["text/csv", "application/csv", "text/plain"], limit: "5mb" }));

import { globalLimiter } from "./middleware/rate-limit.js";

app.use("/api", globalLimiter, router);

// ── Sentry error handler (must be after routes, before safeError) ─────────────
app.use(sentryErrorHandler());

export default app;
