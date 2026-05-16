import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initSentry } from "./lib/sentry";

// Sentry must be initialised before React renders
// No-op when VITE_SENTRY_DSN is not set
initSentry();

createRoot(document.getElementById("root")!).render(<App />);
