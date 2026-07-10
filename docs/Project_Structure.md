# HealthRisk Predictor — Project Structure Guide

**Version:** v1.0 | **Companion to:** TRD v2.0, Frontend & Backend documents | **Date:** 2026-07-06

This document is the directory-by-directory guide to the repository. It exists so a new contributor (or an evaluator) can find the right file in under a minute without reading the full TRD.

> **Update (Auth Service Architecture v1.0):** authentication moved out of `backend/` and into a new
> top-level `auth-service/` (Node.js + Better Auth). `backend/app/security/` no longer contains
> `passwords.py` or `oauth_google.py` — it now has `verify_token.py`, which verifies (never issues)
> tokens via the auth-service's JWKS endpoint. See `docs/Auth_Service_Architecture.md` for the full
> picture; the directory trees below predate this change in a few places and should be read with
> that in mind until this document gets a full v2 pass.


---

## 1. Top-Level Layout

```
healthrisk-predictor/
├── frontend/           React SPA (TRD v2.0 §6)
├── backend/            FastAPI REST API (TRD v2.0 §5)
├── training/            Offline ML training pipeline (TRD v1.0 §6, ported unchanged)
├── models/                Trained model artifacts + metadata (generated output, not hand-written)
├── docs/                    All project documentation (this file's neighbors)
├── .github/                  CI workflows and PR template
├── README.md                  Entry point — setup instructions, architecture summary
├── LICENSE                     MIT license for source code (datasets have separate licenses — see docs/Datasets.md)
├── CONTRIBUTING.md               Ground rules, especially the ownership-check and feature-order-lock invariants
├── CODE_OF_CONDUCT.md
├── SECURITY.md                    Vulnerability reporting process
├── docker-compose.yml               Local multi-service orchestration (backend + frontend; MongoDB is Atlas-hosted)
├── .env.example                      Pointer to backend/.env.example and frontend/.env.example
└── .gitignore
```

---

## 2. `frontend/` — React Application

```
frontend/
├── src/
│   ├── main.jsx                 Entry point: mounts <App/>, wraps in Router + QueryClient + AuthProvider
│   ├── App.jsx                   Route definitions (Screen Inventory §2 sitemap, implemented)
│   ├── api/                       One file per backend resource — thin wrappers around the shared Axios client
│   │   ├── client.js                Axios instance + interceptors (Frontend doc §4.3)
│   │   ├── auth.js, predictions.js, uploads.js, models.js
│   ├── context/
│   │   └── AuthContext.jsx           Current user, in-memory access token, login/logout/refresh
│   ├── hooks/                          React Query wrappers per resource (useAuth, usePredictions, useHistory, useUploads)
│   ├── components/
│   │   ├── shared/                       Cross-page components: RiskBadge, ModelSelector, ModelComparisonPanel,
│   │   │                                    ExplanationPanel, MetricCard, ConsentBanner, UploadDropzone,
│   │   │                                    HistoryTimeline, TrendChart (UI Design System §4/§5)
│   │   ├── layout/                         Sidebar, Header, Footer, AuthGuard
│   │   └── forms/                            One input-form component per disease (DiabetesForm, HeartForm, TBForm, CancerForm)
│   ├── pages/                                  One file per route: Landing, Login, Signup, Dashboard, Predict,
│   │                                              History, HistoryDetail, Uploads, Insights, Profile, NotFound
│   ├── styles/                                    tailwind.config.js + tokens.css (whichever design system - v2 or v3 - is chosen)
│   └── utils/
│       ├── validation.js                             Zod schemas, one per form
│       └── sanitize.js                                 Output-side sanitization helpers (Frontend doc §4.1)
├── public/                                                Static assets
├── .env.example                                             VITE_API_BASE_URL, VITE_GOOGLE_CLIENT_ID
├── vite.config.js, package.json, index.html, .eslintrc.cjs
└── .gitignore
```

**Where to look for X:**
- A new disease's input form -> `src/components/forms/`
- A new page/route -> `src/pages/` + register in `src/App.jsx`
- Anything about tokens/login state -> `src/context/AuthContext.jsx`
- Chart color logic -> `src/styles/tokens.css` (or the Tailwind config, depending on which design system is active)

---

## 3. `backend/` — FastAPI Application

```
backend/
├── app/
│   ├── main.py                    FastAPI app instance, middleware registration, router includes
│   ├── config.py                   Settings loader (pydantic-settings, reads .env)
│   ├── db.py                        Motor client + GridFS bucket + startup index creation
│   ├── core/                          Ported ML modules — DO NOT restructure without re-validating models
│   │   ├── preprocessing.py             Same cleaning/encoding logic as training/preprocessing.py
│   │   ├── model_loader.py                Loads + caches all 12 model files (4 diseases x 3 algorithms) at startup
│   │   ├── risk_scoring.py                  Thresholds (0.30/0.60), label/color logic
│   │   ├── shap_utils.py                      TreeExplainer wrappers, waterfall + global importance
│   │   └── model_comparison.py                  Assembles the all-model comparison payload
│   ├── security/
│   │   ├── passwords.py                          bcrypt hash/verify
│   │   ├── jwt.py                                  Encode/decode, expiry handling
│   │   ├── oauth_google.py                           Authlib Google OAuth2 flow
│   │   └── dependencies.py                             get_current_user, require_auth (FastAPI Depends)
│   ├── models/                                           Pydantic schemas: user.py, prediction.py, upload.py
│   ├── routers/                                            auth.py, predict.py, history.py, uploads.py, models_info.py
│   ├── middleware/
│   │   ├── rate_limit.py                                       slowapi configuration (Backend doc §4.4)
│   │   └── security_headers.py                                   Sets headers from Backend doc §4.7 on every response
│   └── utils/
│       └── logging.py                                               Structured logging, PII/health-data excluded by design
├── tests/                                                              One test file per router + a dedicated test_security.py
├── .env.example                                                          MONGO_URI, JWT_SECRET, GOOGLE_CLIENT_ID/SECRET, etc.
├── requirements.txt, Dockerfile, pytest.ini
└── .gitignore
```

**Where to look for X:**
- Adding a new API route -> `app/routers/`
- Anything about who can access a record -> `app/security/dependencies.py` + the ownership check inside each router function
- Model inference logic -> `app/core/`
- Rate limits or security headers -> `app/middleware/`

---

## 4. `training/` — Offline ML Pipeline (not part of the live app)

```
training/
├── preprocessing.py              Shared cleaning/encoding, mirrored in backend/app/core/preprocessing.py
├── train_diabetes.py              Trains LR/RF/XGBoost, writes models/diabetes_*.pkl
├── train_heart.py
├── train_tb.py
├── train_cancer.py
├── utils.py                        Shared CV harness, metric logging, model_metadata.json writer
├── data/
│   ├── raw/
│   │   ├── tabular/                   In-scope MVP datasets (git-ignored CSVs — see docs/Datasets.md §2)
│   │   └── future/                      Out-of-scope datasets, gathered for readiness only (docs/Datasets.md §3-4)
│   │       ├── images/                     tb_chest_xray/, iqothnccd_ct/, lc25000_histopathology/ — each with a
│   │       │                                  SOURCES.md pointing to the download link; actual image files are
│   │       │                                  never committed (multi-GB, git-ignored)
│   │       └── text/                         symptom2disease-related SOURCES.md, same non-commit rule
│   └── processed/                             Optional cached cleaned datasets (git-ignored)
├── notebooks/                                   Exploratory analysis, not part of the production pipeline
└── requirements.txt
```

**Important:** this directory is run manually/offline before deployment (per TRD v1.0 §10 and Implementation Plan Phase 0). It is never invoked by the live backend at request time.

---

## 5. `models/` — Trained Artifacts (generated, not hand-written)

```
models/
├── diabetes_logistic_regression.pkl, diabetes_random_forest.pkl, diabetes_xgboost.pkl
├── heart_logistic_regression.pkl, heart_random_forest.pkl, heart_xgboost.pkl
├── tb_logistic_regression.pkl, tb_random_forest.pkl, tb_xgboost.pkl
├── cancer_logistic_regression.pkl, cancer_random_forest.pkl, cancer_xgboost.pkl
└── model_metadata.json          One entry per disease: feature_order, cv_results per algorithm,
                                    best_hyperparameters, holdout metrics, top_features, trained_at
```
All `.pkl` files are produced by `training/train_*.py` and are git-ignored (binary, environment-specific) — only `model_metadata.json` (small, human-readable) is committed, per the pretty-printed decision in TRD v1.0 §12.

---

## 6. `docs/` — Project Documentation

| File | Content |
|---|---|
| `PRD.md` | Product requirements (personas, user stories, functional/non-functional requirements) |
| `TRD.md` | Technical architecture (system design, data model, API design) |
| `Implementation_Plan.md` | Phased build plan with milestones and exit criteria |
| `UI_Design_System_v2_DataLens.md` | Visual design system, option A (editorial/warm) |
| `UI_Design_System_v3_Happly.md` | Visual design system, option B (bold/playful) |
| `Screen_Inventory.md` | Full screen/route inventory and sitemap |
| `Datasets.md` | Dataset sources, licensing, in-scope vs. future-readiness split |
| `Frontend.md` | Frontend data flows and client-side security measures |
| `Backend.md` | Backend request lifecycles and OWASP-aligned security measures |
| `Project_Structure.md` | This file |

**Note:** exactly one of the two UI Design System files should be treated as active once a choice is made between them (v2/DataLens vs. v3/Happly per the decision aid in each document's closing section) — the other stays in `docs/` for reference/history, not deleted, so the rationale isn't lost.

---

## 7. `.github/` — CI/CD

```
.github/
├── workflows/
│   ├── backend-ci.yml     pytest + pip-audit on every backend PR/push
│   └── frontend-ci.yml     lint + npm audit + build on every frontend PR/push
└── PULL_REQUEST_TEMPLATE.md   Forces a conscious check on auth/uploads/history-touching PRs
```

---

## 8. Full File Tree (reference)

```
healthrisk-predictor/
├── .github/
│   ├── workflows/
│   │   ├── backend-ci.yml
│   │   └── frontend-ci.yml
│   └── PULL_REQUEST_TEMPLATE.md
├── backend/
│   ├── app/
│   │   ├── core/ (preprocessing.py, model_loader.py, risk_scoring.py, shap_utils.py, model_comparison.py)
│   │   ├── security/ (passwords.py, jwt.py, oauth_google.py, dependencies.py)
│   │   ├── models/ (user.py, prediction.py, upload.py)
│   │   ├── routers/ (auth.py, predict.py, history.py, uploads.py, models_info.py)
│   │   ├── middleware/ (rate_limit.py, security_headers.py)
│   │   ├── utils/ (logging.py)
│   │   ├── main.py, config.py, db.py, __init__.py
│   ├── tests/ (test_auth.py, test_predict.py, test_history.py, test_uploads.py, test_security.py)
│   ├── .env.example, requirements.txt, Dockerfile, pytest.ini, .gitignore
├── frontend/
│   ├── src/
│   │   ├── api/ (client.js, auth.js, predictions.js, uploads.js, models.js)
│   │   ├── context/ (AuthContext.jsx)
│   │   ├── hooks/ (useAuth.js, usePredictions.js, useHistory.js, useUploads.js)
│   │   ├── components/
│   │   │   ├── shared/ (RiskBadge, ModelSelector, ModelComparisonPanel, ExplanationPanel, MetricCard,
│   │   │   │            ConsentBanner, UploadDropzone, HistoryTimeline, TrendChart)
│   │   │   ├── layout/ (Sidebar, Header, Footer, AuthGuard)
│   │   │   └── forms/ (DiabetesForm, HeartForm, TBForm, CancerForm)
│   │   ├── pages/ (Landing, Login, Signup, Dashboard, Predict, History, HistoryDetail, Uploads, Insights, Profile, NotFound)
│   │   ├── styles/ (tailwind.config.js, tokens.css)
│   │   ├── utils/ (validation.js, sanitize.js)
│   │   ├── main.jsx, App.jsx
│   ├── public/
│   ├── .env.example, vite.config.js, package.json, index.html, .eslintrc.cjs, .gitignore
├── training/
│   ├── data/
│   │   ├── raw/tabular/ (.gitkeep — CSVs are git-ignored)
│   │   ├── raw/future/images/ (tb_chest_xray/, iqothnccd_ct/, lc25000_histopathology/ — each with SOURCES.md)
│   │   ├── raw/future/text/ (SOURCES.md)
│   │   └── processed/ (.gitkeep)
│   ├── notebooks/
│   ├── preprocessing.py, train_diabetes.py, train_heart.py, train_tb.py, train_cancer.py, utils.py, requirements.txt
├── models/ (.gitkeep, model_metadata.json — .pkl files are git-ignored)
├── docs/ (PRD.md, TRD.md, Implementation_Plan.md, UI_Design_System_v2_DataLens.md,
│          UI_Design_System_v3_Happly.md, Screen_Inventory.md, Datasets.md, Frontend.md, Backend.md, Project_Structure.md)
├── README.md, LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, docker-compose.yml, .env.example, .gitignore
```
