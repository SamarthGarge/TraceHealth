# HealthRisk Predictor — Screen Inventory & Sitemap (v2.0 — Full Scope)

**Version:** v2.0 | **Companion to:** Full-Scope Expansion v3.0 | **Date:** 2026-07-06 | **Supersedes:** Screen Inventory v1.0

---

## 1. Screen Count Summary

| Category | Unique templates | Total routes |
|---|---|---|
| Public / Marketing | 1 | 1 |
| Auth (expanded) | 5 | 6 |
| Core authenticated | 8 | 11 |
| Full-scope additions | 6 | 6 |
| Admin | 1 | 1 |
| System / Utility | 2 | 2 |
| **Total** | **23 unique screen templates** | **27 routes** |

All 4 open questions from Screen Inventory v1.0 §6 are now resolved (see §5 below) rather than left as defaults.

---

## 2. Sitemap

```
/                              Landing Page                                [Public]
│
├── /login                     Login (email/password + Google)               [Public]
├── /signup                    Signup (+ consent, + claim guest result)       [Public]
├── /forgot-password           Forgot Password                                 [Public]
├── /reset-password/:token     Reset Password                                   [Public]
│
└── (authenticated app shell)
    │
    ├── /dashboard              Dashboard (+ symptom-checker entry point)        [Auth]
    │
    ├── /predict/diabetes       Predict — Diabetes (tabular)                      [Guest + Auth]
    ├── /predict/heart          Predict — Heart Disease (tabular + Framingham)      [Guest + Auth]
    ├── /predict/tb             Predict — Tuberculosis (tabular + image upload)      [Guest + Auth]
    ├── /predict/cancer         Predict — Lung Cancer (tabular + image upload)         [Guest + Auth]
    │
    ├── /symptom-check          Free-Text Symptom Checker                                [Guest + Auth]
    │
    ├── /history                History (list + filters + trend chart)                    [Auth]
    │   └── /history/:id        History Detail (tabular or image, as originally submitted)   [Auth]
    │
    ├── /uploads                Uploads (+ "Auto-fill from report" trigger)                   [Auth]
    │
    ├── /export                 Data Export (CSV/PDF)                                          [Auth]
    │
    ├── /insights               Model Leaderboard & Data Insights                                [Public + Auth]
    │
    ├── /profile                Profile & Account Settings (+ notification prefs)                 [Auth]
    │
    └── /admin                  Admin Analytics Dashboard                                           [Auth + Admin role]

(system-level, not part of the nav)
├── /404                        Not Found
└── (any unhandled error)       Error State
```

---

## 3. New Screens (Full-Scope Additions)

### 3.1 Forgot Password
| | |
|---|---|
| Route | `/forgot-password` |
| Access | Public |
| Purpose | Request a password reset email |
| Key components | Single email field, generic confirmation message regardless of whether the email exists (Full-Scope Expansion §2.8) |
| States | Default, submitting, submitted (always shows success state) |

### 3.2 Reset Password
| | |
|---|---|
| Route | `/reset-password/:token` |
| Access | Public |
| Purpose | Set a new password using a emailed single-use token |
| Key components | New password + confirm field, token validated server-side on submit |
| States | Default, invalid/expired token, success (redirects to `/login`) |

### 3.3 Free-Text Symptom Checker
| | |
|---|---|
| Route | `/symptom-check` |
| Access | Guest + Auth |
| Purpose | Route an unsure user to the right disease module via natural-language input |
| Key components | Text area, "Check" button, suggested-disease card with confidence, link into the matching `/predict/:disease` |
| States | Default, loading, result (with alternate suggestions), no-clear-match state |

### 3.4 Predict — Tuberculosis / Lung Cancer (image variant, extends existing template)
| | |
|---|---|
| Route | `/predict/tb`, `/predict/cancer` (same routes as before, now with a mode toggle) |
| Access | Guest + Auth |
| Purpose | Adds an "Upload an image" tab alongside the existing "Enter symptoms" tab |
| Key components | Image dropzone, Grad-CAM overlay result view (replaces SHAP panel in this mode), confidence score |
| States | Upload idle, uploading, processing (CNN inference — slower than tabular, needs its own loading state), result, unsupported-file error |

### 3.5 Uploads (extended)
| | |
|---|---|
| Route | `/uploads` (existing route, extended) |
| Purpose | Adds an "Auto-fill from report" action per uploaded file |
| Key components | Existing Upload Dropzone/list, plus an extraction-trigger button and a confirm-before-fill review screen showing extracted fields with confidence scores |
| States | Existing states, plus: extracting, extraction-result-review (edit/confirm each field before it populates a prediction form) |

### 3.6 Data Export
| | |
|---|---|
| Route | `/export` |
| Access | Auth |
| Purpose | Download prediction history as CSV or PDF |
| Key components | Format toggle (CSV/PDF), optional disease/date-range filter, download button |
| States | Default, generating (PDF generation takes a moment), ready-to-download, error |

### 3.7 Admin Analytics Dashboard
| | |
|---|---|
| Route | `/admin` |
| Access | Auth + admin role (non-admin users get a 404, not a 403 — consistent with the ownership-check pattern in Backend doc §3.5) |
| Purpose | Aggregate, anonymized usage statistics |
| Key components | Overview stat cards (total users, total predictions), predictions-per-disease chart, model-usage distribution chart — no individual record ever rendered |
| States | Default, loading, empty (pre-launch, no data yet) |

---

## 4. Updated Existing Screens

| Screen | What Changed |
|---|---|
| Login / Signup | Auth stays at email/password + Google only (GitHub removed, Apple excluded — requires a paid developer account; see Full-Scope Expansion §2.5); Signup adds "claim your guest result" prompt if a guest prediction exists in session memory |
| Dashboard | Adds the Symptom Checker entry point as a prominent card |
| Predict — Heart Disease | Adds the Framingham 10-Year Risk card, visually distinct from the 3-model ML comparison panel |
| Profile | Adds notification preferences (opt-in risk-trend emails, default off) and a link to `/export` |
| History Detail | Must render either the tabular result layout or the image + Grad-CAM layout, depending on `input_type` |

---

## 5. Open Questions — Now Resolved

| Question (from v1.0 §6) | Resolution |
|---|---|
| Guest prediction retroactive save | **Resolved: yes, but opt-in.** Held in frontend session memory only; signup/login offers an explicit "save this result?" action. Never automatic. |
| Forgot password scope | **Resolved: in scope.** Unblocked by the free SMTP-based email integration (Full-Scope Expansion §2.8). |
| `/insights` public or gated | **Resolved: stays public.** Unchanged from v1.0 — a portfolio/trust asset, not sensitive data. |
| Individual routes vs. parameterized for disease predict pages | **Resolved: individual routes**, unchanged — cosmetic decision, already settled. |

No open questions remain outstanding.
