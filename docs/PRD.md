# HealthRisk Predictor — Product Requirements Document v2.0
### (Full-Stack Web Application — Supersedes PRD v1.0)

**Version:** v2.0 | **Date:** 2026-07-05 | **Status:** Draft | **Supersedes:** PRD v1.0 §1.3 Scope, and extends §2–4 with account/history/upload capability

---

## 1. Overview

### 1.1 Background & Motivation
HealthRisk Predictor is an educational, portfolio-grade web application demonstrating applied machine learning in preventive healthcare screening. It lets individuals assess personal risk for four major conditions — diabetes, heart disease, tuberculosis, and lung cancer — by entering health metrics, symptoms, and lifestyle factors, and returns probability-based risk scores with model-agnostic SHAP explanations.

**What's new in v2.0:** the product is no longer a single-session, anonymous Streamlit tool. It is now a **full-stack website with user accounts**, where every prediction a logged-in user makes is saved to a personal history, risk trends can be tracked over time, and users can upload and store supporting documents (e.g., lab reports) against their account. This turns the product from a one-off calculator into a **longitudinal personal health-risk record** — while keeping the same core promise: transparent, explainable, non-diagnostic risk screening.

### 1.2 Objectives

| Objective Type | Description |
|---|---|
| Business Objective | Deliver a portfolio-quality, deployable full-stack ML application demonstrating proficiency across model training, explainability, secure account systems, persistent data storage, and cloud deployment of a decoupled frontend/backend architecture. |
| User Objective | Let users create an account, assess risk across four diseases with explainable predictions, compare model outputs, track how their risk changes over time, and store relevant documents — all with clear control over their own data. |
| Success Metrics | 1. Model accuracy meets v1.0 benchmarks (Diabetes ~81%, Heart Disease ~85%, TB/Cancer >80% CV accuracy) — **unchanged**, models are ported not retrained. 2. All 4 disease modules functional on the new web stack. 3. A user can sign up, get a prediction, see it appear in history, log out, log back in, and still see it. 4. File upload/download works with per-user isolation (no cross-user access). 5. Full account deletion verifiably removes all associated data. 6. App deployed publicly (frontend + backend + managed database). 7. README documents architecture, setup, security posture, and the medical disclaimer. |

### 1.3 Scope

**In Scope (Must Have + Should Have):**
- Four tabular disease risk prediction modules (unchanged from v1.0: Diabetes, Heart Disease, Tuberculosis, Lung Cancer)
- **User accounts**: registration (email/password) and login, plus Google OAuth
- **Persistent prediction history** per user, across all diseases, with trend visualization over time
- **Multi-model comparison at inference time** — users can select and compare Logistic Regression, Random Forest, and XGBoost predictions for the same input (new in v2.0, carried from the UI Design System extension)
- **File uploads**: users can upload and manage documents (lab reports, etc.) tied to their account
- SHAP waterfall/coefficient explanations for individual predictions (unchanged in concept, ported to the new stack)
- Global feature importance visualizations
- Multi-disease dashboard and per-disease trend charts
- Model training pipeline with cross-validation and hyperparameter tuning (unchanged — this is offline, not part of the live app)
- Model comparison table / leaderboard (Insights page)
- Explicit consent capture for data storage, and a user-facing right to delete individual history records, uploads, or the entire account
- Comprehensive README with setup instructions, architecture overview, security summary, dataset links, model accuracy table, and medical disclaimer

**Out of Scope (Won't Have this release):**
- Image-based TB detection via CNN on chest X-rays (deferred, per v1.0)
- Framingham longitudinal 10-year CHD risk model (deferred, per v1.0)
- Auto-extraction (OCR/NLP) of structured values from uploaded documents — uploads are stored as reference documents only at this stage
- Additional OAuth providers beyond Google (e.g., GitHub, Apple)
- Data export (download-my-data as CSV/PDF) — distinct from and additional to the in-scope right-to-delete
- Admin-facing aggregate analytics dashboard across all users
- Email notifications (e.g., "your risk trend changed") — requires transactional email infrastructure not yet in scope
- "Forgot password" self-service flow — also requires transactional email infrastructure; deferred alongside the item above

---

## 2. User Personas

The four personas from v1.0 carry forward. Their goals are extended, not replaced, by the account/history layer:

| Persona | Role | Core Goal (v2.0 addition in bold) | Primary Pain Point |
|---|---|---|---|
| Curious Health User | General individual with basic health awareness | Quickly assess personal disease risk and understand which lifestyle factors to modify. **Track how that risk changes over time and keep a private record of past checks.** | Existing health tools are either too clinical, expensive, black-box, or forget everything the moment you close the tab. |
| ML Learner | Student or junior data scientist learning applied ML | Understand how different algorithms perform, why one was chosen, and how SHAP explains predictions. **Directly compare all three trained models against the same input, not just see the "winner."** | Kaggle notebooks are static and don't show end-to-end deployment, especially with real persistence and auth. |
| Healthcare Explorer | Medical student or junior healthcare professional | Explore ML-assisted screening and correlate clinical symptoms with predicted risk. **Attach real reference documents (reports) to a case history for review.** | Limited access to interactive ML demos that also model realistic longitudinal patient data handling. |
| Technical Evaluator | Recruiter, hiring manager, senior engineer | Efficiently evaluate code quality, architecture, model performance, and deployment competence. **Evaluate a full-stack system: auth, database design, API security, and a real frontend/backend split** — not just a Streamlit script. | Portfolio projects often lack real backend/security depth or a persuasive account/data model. |

---

## 3. User Stories (New & Changed for v2.0)

*User stories US-001 through US-015 from PRD v1.0 remain valid and are not repeated here — they describe the core prediction/explainability experience, which is unchanged in substance. The stories below are net-new for the account/history/upload layer.*

### 3.1 Accounts & Auth
| ID | User Story |
|---|---|
| US-016 | As a new visitor, I want to sign up with my email and password (or continue with Google), so that I can save my predictions for later. |
| US-017 | As a returning user, I want to log in and immediately see my past activity, so that I don't have to re-enter my health data every visit. |
| US-018 | As a privacy-conscious user, I want to explicitly consent to my health data being stored before any prediction is saved, so that I'm in control of what the app remembers about me. |
| US-019 | As a user, I want to permanently delete my account and all associated data, so that I can walk away from the app with confidence nothing personal remains. |

### 3.2 History & Trends
| ID | User Story |
|---|---|
| US-020 | As a Curious Health User, I want to see a timeline of my past risk assessments per disease, so that I can tell whether my risk is trending up or down. |
| US-021 | As a user, I want to open any past prediction and see exactly what I entered and what every model said at the time, so that I can compare it against a new result honestly. |
| US-022 | As a user, I want to delete an individual past prediction from my history, so that a one-off test entry (e.g., "just curious what happens at max values") doesn't distort my real record. |

### 3.3 Model Comparison
| ID | User Story |
|---|---|
| US-023 | As an ML Learner, I want to choose which trained model (Logistic Regression, Random Forest, or XGBoost) generates my primary prediction, so that I can see how algorithm choice affects the outcome. |
| US-024 | As an ML Learner, I want to see all three models' predictions for the same input side by side, so that I can judge how much they agree or disagree near the risk-threshold boundaries. |

### 3.4 Uploads
| ID | User Story |
|---|---|
| US-025 | As a Healthcare Explorer, I want to upload a lab report and attach a note to it, so that I have a reference alongside my risk history. |
| US-026 | As a user, I want to view and delete my uploaded files at any time, so that I control what documents are stored under my account. |

### 3.5 Story Map — Updated User Journey
```
[Discover App] → [Sign up / Log in / Continue as Guest] → [Read Disclaimer + Give Consent]
        ↓
[Select Disease] → [Input Health Data] → [Choose Model] → [View Risk Score]
        ↓
[Compare All Models] → [Explore SHAP/Coefficient Explanation]
        ↓
[Result Auto-Saved to History] (if logged in) → [View Trend Over Time]
        ↓
[Upload Supporting Document] (optional) → [Review Insights / Leaderboard]
        ↓
[Manage Profile — Consent, Delete Records, or Delete Account]
```

---

## 4. Functional Requirements — v2.0 Additions

*Features F-001 through F-022 from PRD v1.0 (landing page, 4 disease forms, risk score display, SHAP, global importance, multi-disease dashboard, radar/bar charts, model training pipeline, persistence/caching, risk scoring logic, README) remain the functional core and are ported to the new stack unchanged in behavior. The table below lists only what's new.*

| Feature ID | Feature Name | Associated User Stories | Description | Input / Output / Interaction |
|---|---|---|---|---|
| F-023 | Account Registration & Login | US-016, US-018 | Email/password signup with consent capture, plus Google OAuth | Input: name/email/password or Google account. Output: authenticated session (JWT). Interaction: signup/login forms |
| F-024 | Prediction History | US-017, US-020, US-021, US-022 | Every logged-in prediction is saved with full input, all-model results, and SHAP snapshot; viewable, filterable, deletable | Input: none (automatic on prediction). Output: chronological, filterable list + detail view. Interaction: view, filter by disease/date, delete |
| F-025 | Risk Trend Visualization | US-020 | Per-disease line chart of risk probability over time, built from history data | Input: user's historical predictions. Output: interactive line chart. Interaction: rendered on History and Dashboard pages |
| F-026 | Multi-Model Selection & Comparison | US-023, US-024 | User selects which of 3 trained models drives the primary result; all 3 results always shown together | Input: model selection click. Output: primary result + comparison panel. Interaction: segmented control |
| F-027 | File Upload & Management | US-025, US-026 | Users upload documents (PDF/image/CSV) tied to their account, optionally linked to a disease and annotated with a note | Input: file (max size/type enforced) + optional note. Output: stored file record. Interaction: drag-and-drop upload, list, delete |
| F-028 | Consent Management | US-018, US-019 | Explicit consent capture at signup; consent status visible and account/data deletion available from Profile | Input: checkbox at signup; delete action in Profile. Output: consent timestamp stored; cascading deletion on request. Interaction: one-time checkbox, confirm-to-delete flow |
| F-029 | Guest (Anonymous) Prediction Mode | — | Predictions remain usable without an account; results are not persisted for guests | Input: same as F-002–F-005. Output: same result, with a banner prompting signup. Interaction: no login required |

---

## 5. Non-Functional Requirements — v2.0 Additions

*Availability, prediction-latency, and mobile-responsiveness NFRs from v1.0 carry forward. New NFRs specific to the account/data layer:*

| NFR Category | Requirement |
|---|---|
| Data Privacy | No health data is stored without explicit, logged consent. Users can delete individual records or their entire account at any time, with deletion actually removing the underlying data (not just hiding it). |
| Security | Passwords hashed (never stored in plaintext); JWT access tokens short-lived and never stored in `localStorage`; refresh tokens in `httpOnly` cookies; every history/upload record is access-checked against the requesting user's identity. *(Full detail in the companion Backend document.)* |
| Data Isolation | A user must never be able to view, modify, or delete another user's predictions or uploads, including via guessable IDs. |
| Auditability | Consent timestamp and account-creation timestamp are retained for as long as the account exists, to support the "when did I agree to this" question. |
| Availability | Both the frontend and backend deploy on free/low-cost managed tiers; expected cold-start behavior is documented so evaluators aren't surprised by first-load latency. |

---

## 6. Acceptance Criteria — v2.0 Additions (illustrative, not exhaustive)

| Feature | Acceptance Criteria |
|---|---|
| F-023 Account Registration | AC-1: Cannot register without checking the consent checkbox. AC-2: Duplicate email registration is rejected with a clear error. AC-3: Google OAuth signup creates an account without requiring a password. |
| F-024 Prediction History | AC-1: A logged-in user's prediction appears in `/history` within the same session, no page reload needed. AC-2: A guest's prediction never appears in any history, even if they log in immediately after. AC-3: Deleting a history record removes it permanently — it does not reappear on refresh. |
| F-026 Multi-Model Comparison | AC-1: All 3 models' probabilities are shown for every prediction, regardless of which one is "selected." AC-2: Switching the selected model updates the primary badge and explanation panel without re-submitting the form. |
| F-027 File Upload | AC-1: Files above the configured size limit are rejected client-side and server-side, with a clear error. AC-2: A user cannot access another user's uploaded file via direct URL/ID manipulation. |
| F-028 Consent & Deletion | AC-1: "Delete my account" requires a type-to-confirm step before executing. AC-2: After account deletion, the user's `predictions` and `uploads` records are verifiably absent from the database, not merely flagged inactive. |

---

## 7. Risks (v2.0 Additions)

| Risk | Category | Mitigation |
|---|---|---|
| Storing real (even if hypothetical/test) health data raises the compliance bar significantly compared to v1.0's stateless design | Legal/Privacy | Explicit consent flow, minimal data retention, full deletion rights — detailed in the companion Backend document's security section |
| A security flaw in the new auth/API layer could expose one user's health data to another | Security | Mandatory ownership checks on every data-access route; detailed threat-model coverage in the companion Backend document |
| Free-tier hosting for both frontend and backend may introduce inconsistent cold-start latency, harming the "3 second prediction" experience evaluators expect | Performance | Documented expected behavior in README; models kept cached in backend memory rather than reloaded per request |
| Scope growth (accounts + history + uploads + multi-model comparison, all at once) risks the project never feeling "done" | Delivery | Implementation Plan v2.0 phases this work into 5 discrete weekly milestones with clear exit criteria per phase |

---

## 8. Open Questions Carried Forward for Sign-off

These mirror the open decisions already flagged in the Screen Inventory document (§6) and are restated here for PRD-level visibility:

1. Should a guest's prediction be retroactively saved if they sign up immediately after seeing a result? (Current default: no.)
2. Is "Forgot password" truly out of scope for this release, or should transactional email be pulled into scope earlier to support it?
3. Should the Insights/Model Leaderboard page remain public, or be gated behind login?
4. Should uploaded documents eventually be parsed (OCR/NLP) to pre-fill prediction forms — flagged as v3, but worth confirming it's genuinely not wanted sooner?
