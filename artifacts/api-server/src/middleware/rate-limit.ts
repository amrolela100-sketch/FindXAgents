import rateLimit from "express-rate-limit";

// TODO: Replace MemoryStore with RedisStore in production
// import { RedisStore } from "rate-limit-redis";

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: "Too many requests, please try again later.",
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 auth requests per `window`
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many authentication attempts, please try again after a minute.",
  },
});

export const discoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 discovery requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Discovery limit reached. Please try again after an hour.",
  },
});
