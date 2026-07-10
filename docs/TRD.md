# HealthRisk Predictor — Technical Requirements Document v2.0
### (Full-Stack Web Application — Supersedes TRD v1.0 Streamlit Architecture)

**Version:** v2.0 | **Date:** 2026-07-05 | **Status:** Draft | **Supersedes:** TRD v1.0 §§2–10 (Streamlit-specific sections)

---

## 0. What Changed and Why

| | v1.0 (Streamlit) | v2.0 (Web App) |
|---|---|---|
| Delivery | Single Streamlit process, no accounts | Full-stack web app: React frontend + FastAPI backend |
| Users | Anonymous, stateless, single-session | **Registered users** with login/signup |
| Data persistence | None — nothing survives a session | **MongoDB** stores user accounts, every prediction made, and every file a user uploads |
| History | Not possible | **Disease history per user** — past predictions, trends over time, uploaded reports |
| Auth | None | **Email/password (JWT) + OAuth (Google)** |
| Hosting | Streamlit Community Cloud | Frontend: Vercel/Netlify · Backend: Render/Railway · DB: MongoDB Atlas |

The ML core — preprocessing, the 4 trained models per disease, SHAP explainability, risk scoring, and multi-model comparison — **does not change**. It is lifted out of Streamlit page code and wrapped behind a REST API instead. Everything in TRD v1.0 §6 (ML Design) and the UI Design System's component *logic* (risk badges, model comparison, SHAP panel) carries forward conceptually; only the delivery mechanism changes.

---

## 1. Recommended Stack (locked decisions)

| Layer | Choice | Rationale |
|---|---|---|
| Frontend | **React** (Vite build tool) | User's choice — component-based, good fit for a multi-page app with shared state (auth, history) |
| Backend | **FastAPI (Python)** | Recommended: the entire ML stack (scikit-learn, XGBoost, SHAP, joblib) is Python. FastAPI lets the API import and call training/inference code directly with zero cross-language bridge, gives async I/O for DB calls, automatic OpenAPI docs, and Pydantic-validated request/response models — a strong fit for a solo/small-team build |
| Database | **MongoDB** (Atlas free tier for dev/deploy) | User's choice — document model fits variable per-disease input schemas and evolving prediction/history records well |
| Auth | **JWT (email/password) + OAuth 2.0 (Google)**, both | User's choice — covers both a self-serve signup flow and a low-friction social login |
| File storage | **MongoDB GridFS** (for small reports/images) or local disk + path reference in Mongo, upgradeable to S3-compatible storage later | Keeps infra to one system (Mongo) at MVP stage; abstracted behind a storage interface so swapping to S3 later is a config change, not a rewrite |
| ML serving | FastAPI background/async endpoints calling the existing `core/` inference modules (loaded once at startup, cached in memory) | Reuses TRD v1.0 §6 model design unchanged |

---

## 2. System Architecture

### 2.1 High-Level Diagram (textual)

```
┌───────────────────────────┐        HTTPS/JSON         ┌───────────────────────────────┐
│   React SPA (Vite)         │ ────────────────────────▶ │   FastAPI Backend               │
│   - Auth pages (login/     │ ◀──────────────────────── │   - /api/auth/*                  │
│     signup/OAuth redirect) │        JWT in header       │   - /api/predict/*                │
│   - Disease prediction     │                            │   - /api/history/*                │
│     pages (4 modules)      │                            │   - /api/uploads/*                 │
│   - Model comparison UI    │                            │   - /api/models/*                  │
│   - History/dashboard      │                            │                                     │
│   - Profile/uploads        │                            │  ┌───────────────────────────────┐ │
└───────────────────────────┘                            │  │ core/ (ported from v1.0)         │ │
                                                            │  │  - preprocessing.py               │ │
                                                            │  │  - model_loader.py (in-memory)    │ │
                                                            │  │  - risk_scoring.py                 │ │
                                                            │  │  - shap_utils.py                   │ │
                                                            │  │  - model_comparison.py             │ │
                                                            │  └───────────────────────────────┘ │
                                                            └──────────────┬────────────────────┘
                                                                           │ Motor (async driver)
                                                                           ▼
                                                            ┌───────────────────────────────┐
                                                            │   MongoDB Atlas                   │
                                                            │   - users                          │
                                                            │   - predictions (history)           │
                                                            │   - uploads (file metadata/GridFS)  │
                                                            │   - model_metadata                  │
                                                            └───────────────────────────────┘
```

### 2.2 Key Architectural Decisions

| Decision | Rationale | Trade-off Accepted |
|---|---|---|
| Decouple frontend/backend completely (SPA + REST API) | Enables independent deployment/scaling, matches React choice | More moving parts than a monolith; needs CORS config |
| Models loaded once into backend memory at startup (`@lru_cache`/module-level singletons), not per-request | Keeps the sub-3s prediction target from v1.0; avoids reloading `.pkl` files on every call | Backend restart needed to pick up retrained models (acceptable — deploy = restart anyway) |
| Every prediction request is persisted to `predictions` collection **by default** for logged-in users | This is the core new requirement — history tracking | Requires clear consent/disclaimer language and a way to delete history (privacy) |
| Anonymous/guest prediction still allowed but **not stored** | Keeps the tool usable without forcing signup, while making the value of an account (history, trends) obvious | Two code paths (persisted vs. not) — kept thin via a single `if user: save()` branch |
| JWT access token (short-lived, ~15–30 min) + refresh token (httpOnly cookie, ~7 days) | Standard secure pattern; avoids storing long-lived tokens in `localStorage` where they're XSS-exposed | Slightly more implementation work than a single long-lived token |
| OAuth via Google only at v2.0 (not GitHub/others) | Matches "both" methods requested while keeping OAuth provider count minimal for MVP | Users without Google accounts must use email/password |
| File uploads stored via GridFS at MVP, abstracted behind `core/storage.py` interface | No new infra dependency (stays inside MongoDB Atlas free tier); swappable to S3 later without touching route handlers | GridFS is slower than object storage at scale — acceptable at MVP volume |

---

## 3. Technology Stack (full)

| Layer | Technology | Notes |
|---|---|---|
| Frontend framework | React 18 + Vite | Fast dev server, modern build |
| Routing | React Router v6 | `/login`, `/signup`, `/dashboard`, `/predict/:disease`, `/history`, `/profile` |
| State management | React Context (Auth context) + React Query (TanStack Query) for server state/caching | Avoids over-engineering with Redux for this scope |
| HTTP client | Axios (with interceptor for JWT attach + refresh) | |
| Charts | Plotly.js (via `react-plotly.js`) | Carries forward the "everything interactive" principle from the UI Design System |
| Styling | Tailwind CSS + custom design tokens (ported from UI Design System v1.0 palette) | |
| Forms | React Hook Form + Zod (client-side validation) | |
| Backend framework | FastAPI + Uvicorn (ASGI) | |
| ORM/driver | Motor (async MongoDB driver) | |
| Validation | Pydantic v2 models for every request/response | |
| Auth | `python-jose` (JWT), `passlib[bcrypt]` (password hashing), `Authlib` (Google OAuth2) | |
| ML | scikit-learn, XGBoost, SHAP, joblib — unchanged from v1.0 | |
| File handling | FastAPI `UploadFile` + GridFS (via Motor's `AsyncIOMotorGridFSBucket`) | |
| Background jobs | FastAPI `BackgroundTasks` (e.g., async SHAP computation for large uploads) | |
| Testing | Pytest + `httpx.AsyncClient` (backend), Vitest + React Testing Library (frontend) | |
| Deployment | Frontend: Vercel/Netlify · Backend: Render/Railway/Fly.io · DB: MongoDB Atlas (free M0 tier) | |
| Environment/secrets | `.env` (backend), Vite `.env` (frontend) — JWT secret, Mongo URI, Google OAuth client ID/secret | Never committed; `.env.example` provided |

---

## 4. Data Architecture (MongoDB Collections)

### 4.1 `users`
```json
{
  "_id": "ObjectId",
  "name": "string",
  "email": "string (unique, indexed)",
  "password_hash": "string | null",        // null if OAuth-only account
  "oauth_provider": "google | null",
  "oauth_id": "string | null",
  "created_at": "ISODate",
  "last_login_at": "ISODate",
  "consent_data_storage": true,             // explicit consent flag, see §7
  "consent_timestamp": "ISODate"
}
```

### 4.2 `predictions` (the disease history)
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (indexed)",
  "disease": "diabetes | heart | tb | cancer",
  "input_data": { "...": "raw form values, per feature_schema.py order" },
  "selected_model": "logistic_regression | random_forest | xgboost",
  "all_model_results": [
    {"model": "logistic_regression", "probability": 0.382, "risk_label": "Moderate Risk"},
    {"model": "random_forest",       "probability": 0.614, "risk_label": "High Risk"},
    {"model": "xgboost",             "probability": 0.589, "risk_label": "Moderate Risk"}
  ],
  "final_probability": 0.614,
  "final_risk_label": "High Risk",
  "top_shap_features": [{"feature": "Glucose", "impact": 0.21}, "..."],
  "linked_upload_id": "ObjectId | null",     // if this prediction referenced an uploaded report
  "created_at": "ISODate"
}
```

### 4.3 `uploads`
```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (indexed)",
  "original_filename": "string",
  "content_type": "application/pdf | image/png | image/jpeg | text/csv",
  "size_bytes": "number",
  "gridfs_file_id": "ObjectId",
  "linked_disease": "diabetes | heart | tb | cancer | null",
  "uploaded_at": "ISODate",
  "notes": "string | null"                  // optional user-added note, e.g. "lab report March 2026"
}
```
Uploads are treated as **reference documents attached to a user's history** (e.g., a lab report PDF) — not as auto-parsed inputs at MVP. Auto-extraction of values from uploaded reports (OCR/NLP) is flagged as a v3 candidate (§9), since it introduces significant scope (document parsing accuracy, validation) beyond this restructuring.

### 4.4 `model_metadata` (ported from v1.0, now DB-backed instead of a static JSON file)
Same shape as TRD v1.0 §5.3, stored as one document per disease so the backend and any admin/insights endpoint can read it without a file-system dependency (important since some hosts have ephemeral filesystems).

### 4.5 Indexes
- `users.email` — unique
- `predictions.user_id, predictions.created_at` — compound, for fast history queries sorted by recency
- `uploads.user_id` — for listing a user's files

---

## 5. API Design (FastAPI)

### 5.1 Auth
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Email/password signup — hashes password, creates `users` doc, requires `consent_data_storage: true` |
| POST | `/api/auth/login` | Email/password login — returns access + refresh token |
| GET | `/api/auth/google/login` | Redirects to Google OAuth consent screen |
| GET | `/api/auth/google/callback` | Handles OAuth callback, creates/links user, returns tokens |
| POST | `/api/auth/refresh` | Exchanges refresh token (httpOnly cookie) for a new access token |
| POST | `/api/auth/logout` | Clears refresh cookie |
| GET | `/api/auth/me` | Returns current user profile (requires valid access token) |

### 5.2 Predictions
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/predict/{disease}` | Runs inference across all 3 models for that disease; if authenticated, persists to `predictions`; returns full comparison payload + SHAP summary |
| GET | `/api/history` | Paginated list of the current user's past predictions, filterable by `disease` and date range |
| GET | `/api/history/{prediction_id}` | Full detail of one past prediction (input, all model results, SHAP snapshot) |
| DELETE | `/api/history/{prediction_id}` | User-initiated deletion (supports the data-deletion right in §7) |

### 5.3 Uploads
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/uploads` | Multipart upload; validates type/size; stores in GridFS; creates `uploads` doc |
| GET | `/api/uploads` | List current user's uploaded files |
| GET | `/api/uploads/{upload_id}` | Download/stream a specific file (owner-only) |
| DELETE | `/api/uploads/{upload_id}` | Delete a file and its GridFS chunks |

### 5.4 Model Insights
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/models/metadata` | Returns `model_metadata` for all 4 diseases (leaderboard data) |
| GET | `/api/models/metadata/{disease}` | Single-disease metadata |

### 5.5 Response Contract Example (`POST /api/predict/{disease}`)
```json
{
  "disease": "diabetes",
  "final_probability": 0.614,
  "final_risk_label": "High Risk",
  "selected_model": "random_forest",
  "all_model_results": [ "...as in §4.2..." ],
  "shap_top_features": [ "...as in §4.2..." ],
  "saved_to_history": true,
  "prediction_id": "665f1c2e9b1e4a0012a34567"
}
```

---

## 6. Frontend Architecture (React)

### 6.1 Route Map
```
/                     → Landing page (marketing/overview, disclaimer, CTA to signup/login)
/login                → Email/password + "Continue with Google"
/signup               → Email/password + consent checkbox + "Continue with Google"
/dashboard             → Post-login home: quick links to 4 disease modules + recent history summary
/predict/:disease      → Prediction form + model selector + comparison panel + SHAP panel (per disease)
/history                → Full history table/timeline, filterable, per-disease trend charts
/history/:id            → Detail view of one past prediction
/uploads                → File upload manager (list, upload, delete)
/profile                → Account settings, consent management, delete-account option
/insights                → Model leaderboard / data insights (ported from v1.0's dashboard concept)
```

### 6.2 State Management
- **AuthContext** — holds current user, access token (in memory only, never `localStorage`), login/logout/refresh functions
- **React Query** — caches `/api/history`, `/api/models/metadata`, `/api/uploads` responses; auto-refetches after mutations (new prediction, new upload, delete)
- **Axios interceptor** — attaches `Authorization: Bearer <token>` to every request; on 401, attempts a silent `/api/auth/refresh` before retrying once

### 6.3 Component Library (ported + extended from UI Design System v1.0)
All visual components from the v1.0 UI Design System (risk badge, model selector, model comparison panel, SHAP/coefficient explanation panel, metric cards, disease-page layout) are **rebuilt as React components** with identical visual logic — this is a framework port, not a redesign. New components needed for the web-app layer:

| Component | Purpose |
|---|---|
| `<AuthGuard>` | Route wrapper redirecting unauthenticated users to `/login` |
| `<HistoryTimeline>` | Chronological list of past predictions per disease, with risk-trend sparkline |
| `<HistoryTrendChart>` | Plotly line chart of a single disease's risk probability over time |
| `<UploadDropzone>` | Drag-and-drop file upload with type/size validation feedback |
| `<ConsentBanner>` | One-time, explicit consent capture at signup (see §7) |
| `<AccountMenu>` | Avatar/name dropdown — profile, logout |

A dedicated **UI Design System v2.0** (React component-level: props, states, Tailwind tokens) should follow this TRD as its own document, since the visual language needs re-specifying for a component library rather than Streamlit page functions — flagged as the next deliverable.

---

## 7. Privacy, Consent & Security (new section — required by storing personal health data)

Storing user accounts and disease-prediction history changes the compliance posture from v1.0 (which was explicitly stateless/no-PII). This section is now load-bearing.

| Requirement | Implementation |
|---|---|
| Explicit consent before storing any health data | Signup requires checking a consent checkbox (`consent_data_storage`); this is stored with a timestamp; the app must not save predictions for a user who hasn't consented |
| Right to delete | `DELETE /api/history/{id}`, `DELETE /api/uploads/{id}`, and a full "Delete my account" action in `/profile` that cascades: removes `users` doc, all `predictions`, all `uploads`/GridFS chunks |
| Data minimization | Only store what's needed for history/trends (inputs, model outputs, SHAP summary) — never store raw uploaded report contents unless the user explicitly uploads them, and never auto-extract without consent (see §4.3) |
| Passwords | Never stored in plaintext — `bcrypt` hash only |
| Transport security | HTTPS enforced everywhere (both hosts provide free TLS); JWT sent only over HTTPS |
| Token storage | Access token in memory (React state), refresh token in an `httpOnly`, `Secure`, `SameSite=Strict` cookie — mitigates XSS token theft |
| Authorization checks | Every history/upload endpoint verifies `user_id` on the record matches the authenticated user — no cross-user data access, even by guessing IDs |
| Rate limiting | Basic rate limiting on `/api/auth/*` (e.g., `slowapi`) to reduce brute-force risk |
| Disclaimer persistence | The "educational tool, not medical diagnosis" disclaimer (carried from PRD F-014) is **still mandatory** — now also shown once at signup as part of consent language, not just per-page |
| Data retention policy | Documented in `/profile` and README: data is retained until the user deletes it or their account; no fixed auto-expiry at MVP, but flagged as a v3 policy candidate |

---

## 8. Non-Functional Requirements (updated)

| NFR | v1.0 | v2.0 |
|---|---|---|
| Prediction latency | ≤3s (Streamlit rerun) | ≤3s API response for `/api/predict/{disease}` (models cached in backend memory, same principle) |
| Statelessness | Fully stateless | **Backend is stateless (JWT), data layer is stateful (MongoDB)** — this is the core architecture shift |
| Availability | Single free-tier instance | Frontend (Vercel/Netlify) and backend (Render/Railway) both have free tiers with cold-start considerations similar to Streamlit Cloud; document expected cold-start latency |
| Scalability (5th disease) | Template page pattern | New disease = new Pydantic schema + new `core/` training script + new frontend route — same low-friction pattern, now framework-agnostic |
| Mobile responsiveness | Streamlit native responsive | Tailwind responsive utility classes; test at 375px/768px/1280px breakpoints |
| Data privacy | N/A (no data stored) | Full §7 compliance posture — new and mandatory |

---

## 9. Explicitly Out of Scope for v2.0 (documented, not silently dropped)

| Item | Status |
|---|---|
| Auto-extracting structured values from uploaded lab reports (OCR/NLP) | v3 candidate — flagged in §4.3 |
| GitHub/Apple/other OAuth providers | v3 candidate — Google only at v2.0 |
| Admin dashboard for aggregate/anonymized analytics across all users | v3 candidate |
| Push/email notifications on new risk trends | v3 candidate |
| Data export (download my data as CSV/PDF) | v3 candidate — related to but distinct from the delete-my-account right, which **is** in scope |

---

## 10. Migration Notes from v1.0

- All `core/` ML modules (`preprocessing.py`, `risk_scoring.py`, `shap_utils.py`, model training scripts) **move as-is** into the FastAPI backend's `core/` package — no retraining or re-validation of models required.
- `model_metadata.json` content moves from a static file into the `model_metadata` MongoDB collection (§4.4); a one-time migration script reads the existing JSON and inserts it.
- The Streamlit-specific TRD v1.0 sections that are now void: §2 (Streamlit architecture), §4 (Streamlit project structure), §7.1–7.2 (Streamlit page contracts), §10 (Streamlit Cloud deployment). TRD v1.0 §5 (Data Architecture, preprocessing contracts), §6 (ML Design), and §9 (Testing categories for the ML core) remain valid and are referenced, not repeated, in this document.
