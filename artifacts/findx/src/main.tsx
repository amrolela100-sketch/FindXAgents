import { createRoot } from "react-dom/client";
import App from "./App";
import { LangProvider } from "./lib/lang-context";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <LangProvider>
    <App />
  </LangProvider>
);
