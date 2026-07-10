# HealthRisk Predictor — Implementation Plan v2.0
### (Full-Stack Web Application — Supersedes Implementation Plan v1.0)

**Version:** v2.0 | **Companion to:** TRD v2.0 (Web App) | **Date:** 2026-07-05

The ML core (Phase 1 of v1.0 — preprocessing, training, SHAP) is **already valid and reusable**; this plan assumes those trained models/artifacts exist and focuses on the new backend, frontend, database, auth, and history layers built around them.

---

## Phase 0 — Foundation & Environment Setup (Days 1–2)

- [ ] Create two repos (or a monorepo with `/frontend` and `/backend`)
- [ ] Backend: scaffold FastAPI project (`uvicorn`, `pydantic`, `motor`, `python-jose`, `passlib[bcrypt]`, `authlib`)
- [ ] Backend: port `core/` ML modules from v1.0 Streamlit project unchanged (preprocessing, model_loader, risk_scoring, shap_utils, model_comparison)
- [ ] Set up MongoDB Atlas free-tier cluster; create `healthrisk` database
- [ ] Write one-time migration script: load existing `model_metadata.json` into the `model_metadata` collection
- [ ] Frontend: scaffold React + Vite project, install Tailwind, React Router, React Query, Axios, React Hook Form + Zod
- [ ] Set up `.env` / `.env.example` for both frontend and backend (Mongo URI, JWT secret, Google OAuth client ID/secret, API base URL)
- [ ] Configure CORS on FastAPI to allow the frontend origin

**Exit criteria:** Backend responds to a `GET /health` check; frontend renders a blank shell that successfully calls it.

---

## Phase 1 — Auth & User Accounts (Week 1)

### Backend
- [ ] `users` collection + Pydantic models (`UserCreate`, `UserOut`, `UserInDB`)
- [ ] `POST /api/auth/register` — bcrypt hash, consent flag required, unique email enforcement
- [ ] `POST /api/auth/login` — verify password, issue access + refresh tokens
- [ ] `GET /api/auth/google/login` + `GET /api/auth/google/callback` — Authlib Google OAuth flow, create-or-link user
- [ ] `POST /api/auth/refresh`, `POST /api/auth/logout`
- [ ] `GET /api/auth/me` — protected route, JWT dependency
- [ ] Rate limiting on auth routes (`slowapi` or equivalent)

### Frontend
- [ ] `AuthContext` + Axios interceptor (attach token, silent refresh on 401)
- [ ] `/login`, `/signup` pages with consent checkbox + "Continue with Google" button
- [ ] `<AuthGuard>` route wrapper
- [ ] `/profile` page: view account info, logout, delete-account action (delete-account backend endpoint stubbed here, fully wired in Phase 4)

**Exit criteria:** A user can sign up (email or Google), log in, stay logged in across refresh, and log out. Protected routes redirect when unauthenticated.

---

## Phase 2 — Prediction API & Disease Pages (Week 2)

### Backend
- [ ] `POST /api/predict/{disease}` — validates input via per-disease Pydantic schema (mirrors `feature_schema.py` order-lock from TRD v1.0 §5.2), runs all 3 cached models, returns comparison payload + SHAP summary
- [ ] Persist to `predictions` collection when `Authorization` header present and user has consented; skip persistence for anonymous/guest calls
- [ ] `GET /api/history`, `GET /api/history/{id}`, `DELETE /api/history/{id}`

### Frontend
- [ ] `/predict/:diabetes|heart|tb|cancer` — form (ported field-by-field from v1.0 UI Design System §5.3), model selector (§5.4), model comparison panel (§5.5), SHAP/coefficient panel (§5.6)
- [ ] Risk badge, metric cards ported as React components (Tailwind, same color tokens as v1.0 palette)
- [ ] Guest mode: prediction works without login, with a banner: "Log in to save this result to your history"

**Exit criteria:** All 4 disease pages functional end-to-end; logged-in predictions appear in `predictions` collection; guest predictions work but aren't persisted.

---

## Phase 3 — History, Trends & Insights (Week 3)

### Backend
- [ ] `GET /api/models/metadata`, `GET /api/models/metadata/{disease}` — leaderboard data source
- [ ] Pagination + filtering (`disease`, date range) on `GET /api/history`

### Frontend
- [ ] `/history` — `<HistoryTimeline>`, filterable by disease/date
- [ ] `/history/:id` — full detail view (input values, all-model comparison, SHAP snapshot at time of prediction)
- [ ] `<HistoryTrendChart>` — Plotly line chart per disease, risk probability over time
- [ ] `/insights` — model leaderboard (ported from v1.0 Insights Dashboard concept), dataset/metrics visualizations
- [ ] `/dashboard` — post-login home: quick links + recent-activity summary pulling from `/api/history` (limit 5)

**Exit criteria:** A returning user can see their risk trend over time per disease, and view/inspect any past prediction in full detail.

---

## Phase 4 — File Uploads & Data Privacy Controls (Week 4)

### Backend
- [ ] `POST /api/uploads` — multipart handling, type/size validation (e.g., PDF/PNG/JPEG/CSV, max 10MB), GridFS storage via `AsyncIOMotorGridFSBucket`
- [ ] `GET /api/uploads`, `GET /api/uploads/{id}` (stream/download), `DELETE /api/uploads/{id}`
- [ ] Full account-deletion cascade: `DELETE /api/auth/me` removes `users` doc + all `predictions` + all `uploads`/GridFS chunks
- [ ] Ownership checks on every history/upload route (user can only access their own records)

### Frontend
- [ ] `/uploads` — `<UploadDropzone>`, file list, delete action, optional linkage to a disease/prediction with a note field
- [ ] `<ConsentBanner>` finalized — persistent, non-dismissible until acknowledged at signup; consent status visible in `/profile`
- [ ] `/profile` — finalize "Delete my account" flow with a confirmation step (type-to-confirm pattern)

**Exit criteria:** Users can upload, view, and delete files tied to their account; full account deletion actually removes all associated data (verify by direct DB inspection during QA).

---

## Phase 5 — Hardening, Testing & Deployment (Week 5)

- [ ] Backend tests: Pytest + `httpx.AsyncClient` — auth flows, prediction endpoint (all 4 diseases), history CRUD, upload CRUD, ownership-check rejection cases
- [ ] Frontend tests: Vitest + React Testing Library — auth forms, prediction form submission, history rendering
- [ ] Security pass: confirm JWT expiry behavior, refresh-token cookie flags (`httpOnly`, `Secure`, `SameSite`), rate limiting on `/api/auth/*`, CORS restricted to production frontend origin only
- [ ] Load check: confirm cached in-memory models keep `/api/predict/{disease}` under 3s on the deployed backend tier
- [ ] Deploy backend (Render/Railway/Fly.io) with environment secrets configured
- [ ] Deploy frontend (Vercel/Netlify) pointed at the deployed backend URL
- [ ] Update README: architecture diagram, setup instructions (frontend + backend + Mongo Atlas), consent/privacy summary, live URL, disclaimer

**Exit criteria:** Publicly deployed, working end-to-end web app; all Phase 1–4 exit criteria still pass against the deployed (not just local) environment.

---

## Milestone Summary

| Milestone | Target | Definition of Done |
|---|---|---|
| M0 — Environment ready | Day 2 | Both apps scaffolded, talking to each other and to MongoDB Atlas |
| M1 — Auth complete | End of Week 1 | Signup/login (email + Google), JWT + refresh cycle, protected routes |
| M2 — Prediction live | End of Week 2 | All 4 disease pages predicting via the API, with history persistence for logged-in users |
| M3 — History & Insights | End of Week 3 | Trend charts, history detail views, model leaderboard page |
| M4 — Uploads & Privacy | End of Week 4 | File upload/delete, full account-deletion cascade, consent flow finalized |
| M5 — Deployed | End of Week 5 | Public URL, tested, documented |

## Risk Watch

| Risk | Watch For | Action If Triggered |
|---|---|---|
| Cross-user data leakage | Any history/upload route missing an ownership check | Mandatory code-review checklist item before merging any new route touching `predictions`/`uploads` |
| Token stored insecurely on frontend | Access token accidentally persisted to `localStorage` | Enforce in-memory-only storage via code review; refresh token must stay in `httpOnly` cookie |
| GridFS performance at scale | Upload/download latency growing with file count | Documented upgrade path to S3-compatible storage behind the existing `core/storage.py` interface |
| Free-tier cold starts (backend + frontend) | First request after idle period is slow | Document expected behavior in README; consider a lightweight keep-alive ping if it becomes disruptive |
| Consent gate bypassed | A prediction gets saved for a user without `consent_data_storage: true` | Add a backend-level guard (not just frontend) before any `predictions` insert |

---

*This plan should be read alongside TRD v2.0. A React-specific UI Design System v2.0 (component props, states, Tailwind token mapping) is the recommended next deliverable to keep the visual language consistent with the v1.0 design system through this framework migration.*
