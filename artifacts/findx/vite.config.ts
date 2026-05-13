import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    // Warn at 400 KB (was 500 KB default). Keeps us honest.
    chunkSizeWarningLimit: 400,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — never changes, max cache hits
          "vendor-react": ["react", "react-dom"],
          // Routing
          "vendor-router": ["wouter"],
          // Supabase — large, but only loaded once
          "vendor-supabase": ["@supabase/supabase-js"],
          // UI primitives (Radix) — large but shared across pages
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-popover",
            "@radix-ui/react-tabs",
          ],
          // Icons — tree-shaken but still worth isolating
          "vendor-icons": ["lucide-react"],
          // Charting / heavy visualisation (used only in dashboard)
          "vendor-charts": ["recharts"],
          // i18n translations
          "chunk-i18n": [
            "./src/lib/i18n/ar",
            "./src/lib/i18n/en",
            "./src/lib/i18n/index",
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
    host: "0.0.0.0",
  },
});
