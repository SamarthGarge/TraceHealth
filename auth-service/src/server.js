import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";

const app = express();

// CORS — only allow the configured frontend origin (and the backend for JWKS fetches)
app.use(
  cors({
    origin: [
      process.env.FRONTEND_ORIGIN || "http://localhost:5173",
      process.env.BACKEND_ORIGIN  || "http://localhost:8000",
    ],
    credentials: true,
  })
);

// Parse JSON bodies for any Express-native routes (Better Auth handles its own body parsing)
app.use(express.json());

// ── Health probe ────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "tracehealth-auth" });
});

// ── Better Auth — handles all /api/auth/* routes ────────────────────────────
// This includes: sign-in, sign-up, sign-out, session, JWKS, OAuth callbacks, etc.
app.all("/api/auth/*", toNodeHandler(auth));

// ── Start server ────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || "4000", 10);
app.listen(port, () => {
  console.log(`[auth-service] listening on http://localhost:${port}`);
  console.log(`[auth-service] JWKS endpoint: http://localhost:${port}/api/auth/jwks`);
});
