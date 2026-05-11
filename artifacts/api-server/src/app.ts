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

app.use(helmet());
app.use(cors(buildCorsOptions()));
// Limit request body to 1 MB to prevent DoS via oversized JSON payloads
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

import { globalLimiter } from "./middleware/rate-limit.js";

app.use("/api", globalLimiter, router);

export default app;
