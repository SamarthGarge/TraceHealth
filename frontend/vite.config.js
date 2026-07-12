import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite configuration for the TraceHealth frontend.
 * Dev server proxy forwards /api/* to the FastAPI backend.
 * No separate auth-service — auth is handled by the backend directly.
 */
export default defineConfig({
  plugins: [react()],

  css: {
    postcss: "./postcss.config.js",
  },

  server: {
    port: 5173,
    proxy: {
      // All API routes (including /api/auth/*) → FastAPI backend
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },

  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          plotly: ["plotly.js", "react-plotly.js"],
          vendor: ["react", "react-dom", "react-router-dom"],
          query:  ["@tanstack/react-query"],
        },
      },
    },
  },
});
