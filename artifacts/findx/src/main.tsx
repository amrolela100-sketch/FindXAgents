import { createRoot } from "react-dom/client";
import App from "./App";
import { LangProvider } from "./lib/lang-context";
import { ThemeProvider } from "./lib/theme-context";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <LangProvider>
      <App />
    </LangProvider>
  </ThemeProvider>
);
