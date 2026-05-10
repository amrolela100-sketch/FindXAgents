import rateLimit from "express-rate-limit";

// TODO: Replace MemoryStore with RedisStore in production
// import { RedisStore } from "rate-limit-redis";

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again after a minute." },
});

export const discoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Discovery limit reached. Please try again after an hour." },
});

// Protects bulk AI operations — max 20 per hour per IP
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "AI operation limit reached. Please try again after an hour." },
});

// Protects Telegram & external integration test endpoints — max 5 per minute per IP
export const integrationTestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many test requests. Please wait a minute before retrying." },
});
