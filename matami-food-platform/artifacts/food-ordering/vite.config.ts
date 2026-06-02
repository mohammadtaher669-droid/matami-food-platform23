import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const API_PORT = Number(process.env.API_PORT ?? 3001);

export default defineConfig({
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
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/scheduler/")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/framer-motion/")) return "vendor-motion";
          if (id.includes("node_modules/recharts/") || id.includes("node_modules/d3")) return "vendor-charts";
          if (id.includes("node_modules/@dnd-kit/")) return "vendor-dnd";
          if (id.includes("node_modules/@radix-ui/")) return "vendor-radix";
          if (id.includes("node_modules/xlsx/")) return "vendor-xlsx";
          if (id.includes("node_modules/@tanstack/")) return "vendor-query";
          if (id.includes("node_modules/lucide-react/")) return "vendor-icons";
          if (id.includes("node_modules/")) return "vendor-misc";
        },
      },
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    // Proxy API calls to the backend during development
    proxy: {
      "/api": {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    host: "0.0.0.0",
  },
});
