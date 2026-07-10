import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Vite configuration for the TraceHealth frontend.
 * - Dev server proxy forwards /api/* to the FastAPI backend and
 *   /api/auth/* to the auth-service, so no CORS issues in local dev.
 * - CSS preprocessor is not needed — Tailwind handles it via PostCSS.
 */
export default defineConfig({
  plugins: [react()],

  css: {
    postcss: "./postcss.config.js",
  },

  server: {
    port: 5173,
    proxy: {
      // Auth routes → auth-service (Node/Better Auth)
      "/api/auth": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
      // All other API routes → FastAPI backend
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },

  build: {
    sourcemap: false, // disable source maps in production builds
    rollupOptions: {
      output: {
        // Code-split large dependencies into separate chunks
        manualChunks: {
          plotly: ["plotly.js", "react-plotly.js"],
          vendor: ["react", "react-dom", "react-router-dom"],
          query:  ["@tanstack/react-query"],
        },
      },
    },
  },
});
