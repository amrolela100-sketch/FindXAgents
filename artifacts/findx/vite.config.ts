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
    // Lower warning threshold — keep chunks honest
    chunkSizeWarningLimit: 400,
    // Source maps disabled in prod (smaller output, no IP leak)
    sourcemap: false,
    // esbuild minification (default) — fast and effective
    minify: "esbuild",
    rollupOptions: {
      output: {
        // ── Vendor chunks: stable filenames → max CDN/browser cache reuse ──
        manualChunks(id) {
          // React runtime — smallest possible initial chunk
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor-react";
          }
          // Supabase — large (~350 KB), loaded once, changes rarely
          if (id.includes("node_modules/@supabase/")) {
            return "vendor-supabase";
          }
          // Framer Motion — ~120 KB, only needed post-auth
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-framer";
          }
          // Radix UI primitives — large but shared across many pages
          if (id.includes("node_modules/@radix-ui/")) {
            return "vendor-radix";
          }
          // Recharts — heavy charting, only used on Dashboard
          if (id.includes("node_modules/recharts") ||
              id.includes("node_modules/d3-") ||
              id.includes("node_modules/victory-vendor")) {
            return "vendor-charts";
          }
          // DnD Kit — only used in Kanban board
          if (id.includes("node_modules/@dnd-kit/")) {
            return "vendor-dnd";
          }
          // Lucide icons — tree-shaken but worth isolating
          if (id.includes("node_modules/lucide-react")) {
            return "vendor-icons";
          }
          // cmdk — command palette, lazy-loaded
          if (id.includes("node_modules/cmdk")) {
            return "vendor-cmdk";
          }
          // Routing
          if (id.includes("node_modules/wouter")) {
            return "vendor-router";
          }
          // i18n translations — loaded eagerly but small
          if (id.includes("/src/lib/i18n/")) {
            return "chunk-i18n";
          }
        },
      },
      // Aggressive tree-shaking: remove pure side-effect-free calls
      treeshake: {
        preset: "recommended",
        moduleSideEffects: (id) => {
          // CSS modules and index.css have side effects (inject styles)
          if (id.endsWith(".css")) return true;
          // Supabase has no global side effects on import
          if (id.includes("@supabase/")) return false;
          return "no-external";
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
