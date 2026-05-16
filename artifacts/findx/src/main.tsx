import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Sentry must be initialised before React renders
// No-op when VITE_SENTRY_DSN is not set
initSentry();

// LOW-4: Register Service Worker for offline support
// Only in production — dev mode uses HMR which conflicts with SW caching.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.info("[SW] registered, scope:", reg.scope);
      })
      .catch((err) => {
        // Non-fatal — app still works online without the service worker
        console.warn("[SW] registration failed:", err);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
