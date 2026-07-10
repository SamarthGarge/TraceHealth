# HealthRisk Predictor — Full-Scope Expansion (v3.0)
### Every Previously Deferred Item Is Now In Scope

**Version:** v3.0 | **Supersedes:** PRD v2.0 §1.3 (Out of Scope), TRD v2.0 §9, Implementation Plan v2.0 phasing, Screen Inventory §6 (open questions) | **Date:** 2026-07-06

---

## 0. Purpose

Every item previously logged as "out of scope" or "deferred" across the PRD, TRD, Implementation Plan, Datasets doc, and Screen Inventory is now **in scope**. This document is the single place that specifies what each of those items requires technically and functionally, so nothing gets folded in halfway. Once this is read alongside the companion updates to `Datasets.md` and `Screen_Inventory.md` (both fully revised below/alongside), the project has no remaining "won't have" list — everything that was ever discussed is now a build target.

**A note on honesty about what this means:** this roughly triples the technical surface area of the project — it adds a full computer-vision pipeline, an OCR/NLP pipeline, a transactional email system, multi-provider auth, an admin analytics layer, and data export, on top of the already-substantial account/history/upload system. The Implementation Plan section at the end reflects that with a realistic phase count rather than pretending this is a small addition.

**Zero-cost constraint:** every service and provider chosen in this document is free at the scale this project operates at — no paid API tiers, no paid developer program memberships. This ruled out two things that would otherwise have been the "obvious" choice: **Apple Sign In** (requires a $99/year Apple Developer Program membership with no free tier — dropped entirely, not replaced) and **SendGrid** (has a free tier but is API-key/vendor-locked for what is fundamentally a commodity capability — replaced with plain SMTP, which works with any free provider a person already has, e.g., a Gmail account with an app password, or a free-tier transactional relay like Brevo). Where a free tier of a paid-tiered product is used elsewhere in this project (MongoDB Atlas M0, Render/Railway/Vercel/Netlify free tiers), that's noted explicitly so it's a conscious choice, not an assumption.

---

## 1. Scope Change Summary

| Item | Previous Status | New Status | What It Requires |
|---|---|---|---|
| TB detection via chest X-ray CNN | Deferred (PRD v1.0 §1.3) | **In scope** | Vision pipeline (§2.1) |
| Lung Cancer detection via CT/histopathology imaging | Implicit in "image-based" deferral | **In scope** | Vision pipeline (§2.1) |
| Framingham 10-year CHD risk score | Deferred (PRD v1.0 §1.3) | **In scope** | Deterministic clinical formula module (§2.2) |
| OCR/NLP auto-extraction from uploaded documents | Deferred (PRD v2.0 §1.3) | **In scope** | Document intelligence pipeline (§2.3) |
| Free-text symptom checker (NLP) | Not previously specified | **In scope** | Text classification pipeline (§2.4), uses Symptom2Disease dataset |
| ~~Additional OAuth providers~~ | Deferred (PRD v2.0 §1.3) | **Removed — Google + email/password only** | See §2.5 |
| Data export (CSV/PDF) | Deferred (PRD v2.0 §1.3) | **In scope** | Export service (§2.6) |
| Admin analytics dashboard | Deferred (TRD v2.0 §9) | **In scope** | Admin role + aggregate endpoints (§2.7) |
| Email notifications | Deferred (PRD v2.0 §1.3) | **In scope** | Transactional email service (§2.8) |
| Forgot/reset password | Deferred (PRD v2.0 §1.3, needed email infra) | **In scope** | Now unblocked by §2.8 |
| Guest prediction retroactively saved on signup | Open question, default "no" (Screen Inventory §6) | **Resolved: yes** | Session-held guest result claimed at signup (§2.9) |

---

## 2. New Functional & Technical Specifications

### 2.1 Image-Based Detection (TB Chest X-ray + Lung Cancer CT/Histopathology)

**Functional requirement (new: F-030, F-031):** users can submit a chest X-ray image for TB screening, or a CT/histopathology image for lung cancer screening, as an alternative or complement to the existing symptom-based tabular forms.

**Datasets (now in scope, moved from Datasets.md §3):**
- TB: [TB Chest X-ray Database](https://www.kaggle.com/datasets/tawsifurrahman/tuberculosis-tb-chest-xray-dataset) (~3,500 TB + ~3,500 normal images)
- Lung Cancer: [IQ-OTH/NCCD CT dataset](https://www.kaggle.com/datasets/hamdallak/the-iqothnccd-lung-cancer-dataset) (1,097–1,190 CT slices) **and** [LC25000 histopathology](https://www.kaggle.com/datasets/andrewmvd/lung-and-colon-cancer-histopathological-images) (lung classes only: adenocarcinoma, squamous cell carcinoma, benign)

**Model architecture:**
- Transfer learning on a pretrained CNN backbone (ResNet50 or EfficientNetB0 — start with ResNet50 for a well-documented baseline), fine-tuned per disease/image-type
- Two independent vision models: `tb_xray_model` (binary: TB / normal) and `cancer_image_model` (3-class: benign / malignant / normal, trained primarily on IQ-OTH/NCCD CT, with LC25000 used as a secondary histopathology-specific model given the different imaging modality)
- Framework: PyTorch (torchvision pretrained weights) — chosen over TensorFlow/Keras since it keeps the whole ML stack in one ecosystem alongside scikit-learn/XGBoost/SHAP, and Grad-CAM tooling (`pytorch-grad-cam`) is mature
- Image preprocessing: resize to 224×224, normalize to ImageNet mean/std, augmentation during training (rotation, flip, brightness jitter) to reduce overfitting on the comparatively small TB/CT datasets

**Explainability — Grad-CAM, not SHAP:** SHAP's TreeExplainer constraint (TRD v1.0 §6.2) doesn't apply to CNNs. Image-based predictions use **Grad-CAM** (Gradient-weighted Class Activation Mapping) instead, producing a heatmap overlay showing which regions of the X-ray/CT/histopathology image most influenced the prediction. This is a deliberate, disease-appropriate substitution — the Explanation Panel component (UI Design System §4.4/5.4) gains a third mode alongside SHAP-waterfall and coefficient-bar: **Grad-CAM overlay**, rendered as the original image with a semi-transparent heatmap layered on top.

**New API endpoint:**
```
POST /api/predict/{disease}/image   (disease: tb | cancer)
  multipart/form-data: image file
  -> { prediction, confidence, risk_label, gradcam_overlay_url, saved_to_history, prediction_id }
```

**New data model fields (`predictions` collection):**
```json
{
  "input_type": "tabular | image",
  "image_ref": "GridFS file id (if input_type = image)",
  "gradcam_ref": "GridFS file id for the heatmap overlay (if input_type = image)"
}
```

**New training scripts:** `training/train_tb_image.py`, `training/train_cancer_image.py` — separate from the existing tabular `train_*.py` scripts, run offline, output `.pt` (PyTorch) model files into `models/vision/`.

**Non-functional consideration:** CNN training is meaningfully more compute-intensive than the tabular models. Training happens offline/locally (or on a free-tier GPU notebook, e.g., Google Colab), never on the production backend. Inference at request time uses the pretrained/fine-tuned weights on CPU, which is acceptable for single-image inference latency (typically 1-2s on CPU for a ResNet50 forward pass) even though it doesn't meet the sub-3s target as comfortably as the tabular models — this is documented as an accepted trade-off, not hidden.

### 2.2 Framingham 10-Year CHD Risk Score (Heart Disease Module Addition)

**Functional requirement (new: F-032):** the Heart Disease prediction page shows, alongside the 3-model ML comparison, a fourth card: the classic Framingham Risk Score — a validated actuarial formula, not a trained ML model.

**Implementation:** a deterministic function (`core/framingham.py`), not a trained artifact — no dataset/training needed, only the published Framingham coefficients (age, total cholesterol, HDL, systolic blood pressure, smoking status, treatment for hypertension, sex-specific coefficient sets). This is the standard clinical formula from the Framingham Heart Study, reimplemented directly.

```python
def framingham_10yr_risk(age, sex, total_chol, hdl, sys_bp, smoker, bp_treated) -> float:
    # Sex-specific coefficient sets per the published Framingham point system
    # Returns a 10-year CHD risk percentage
    ...
```

**New API endpoint:**
```
POST /api/predict/heart/framingham
  { age, sex, total_cholesterol, hdl, systolic_bp, smoker, bp_treated }
  -> { ten_year_risk_percent, risk_category }
```

**UI treatment:** shown as a distinct "Framingham 10-Year Risk" card on the Heart Disease predict page, visually separated from the 3-model ML comparison panel with a caption clarifying it's a clinical formula, not a trained model — this distinction matters for the Technical Evaluator persona and must not be blurred into looking like a 4th ML model.

### 2.3 Document Auto-Extraction (OCR/NLP on Uploads)

**Functional requirement (new: F-033):** after uploading a document (lab report), a user can trigger extraction of structured health values (glucose, cholesterol, blood pressure, etc.) to pre-fill a prediction form.

**Pipeline:**
1. OCR: **Tesseract OCR** (via `pytesseract`) for scanned/image documents; direct text extraction (via `pdfplumber`) for text-based PDFs — tries direct extraction first, falls back to OCR only if the PDF has no extractable text layer
2. Extraction: regex + keyword-anchored parsing (e.g., a pattern matching "Glucose: 142 mg/dL" style lines) mapped to the exact `feature_schema` field names from TRD v1.0 §5.2 — deliberately rule-based rather than a trained NER model at this stage, since medical report formats vary enormously and a rule-based extractor's failures are predictable and auditable, whereas a trained model's failures are not
3. Confidence surfaced per extracted field; low-confidence extractions are shown to the user as suggestions requiring explicit confirmation before they populate the form — **never auto-submitted silently**

**New API endpoint:**
```
POST /api/uploads/{upload_id}/extract
  -> { extracted_fields: [{ field_name, value, confidence }], disease_guess }
```

**Security note (extends Backend doc §4.1):** OCR output is treated as untrusted text — extracted "values" are validated against the same Pydantic field constraints as manually-typed input before they're allowed anywhere near a prediction call; OCR text is never passed to a database query or executed in any way.

### 2.4 Free-Text Symptom Checker (NLP)

**Functional requirement (new: F-034):** a user can type a free-text description of how they're feeling, and the app suggests which of the 4 disease modules to check.

**Model:** trained on the [Symptom2Disease dataset](https://www.kaggle.com/datasets/niyarrbarman/symptom2disease) (1,200 rows, 24 disease labels — a superset of this app's 4 diseases). Approach: TF-IDF vectorization + Logistic Regression classifier (`scikit-learn`), chosen over a transformer model for this stage since the dataset is small (1,200 rows) and a heavier model would overfit; this is a **routing aid**, not a diagnostic prediction — it never produces a risk percentage itself, only a suggestion of which structured form to fill out next.

**New API endpoint:**
```
POST /api/symptom-check
  { text: "I've been coughing for weeks and losing weight" }
  -> { suggested_disease: "tb", confidence, alternate_suggestions: [...] }
```

**UI treatment:** a new entry point on the Dashboard — "Not sure where to start? Describe how you're feeling" — free-text box that routes to the suggested `/predict/:disease` page, pre-selected but not pre-filled (pre-filling would require the OCR/NLP extraction pipeline in §2.3, a separate concern).

### 2.5 OAuth Providers — Google Only (GitHub Removed)

**Decision:** authentication stays at email/password + Google OAuth only (TRD v2.0 §5.1, unchanged). GitHub OAuth, which was briefly added in the previous revision of this document, has been removed at the person's request.

**Why this is a reasonable place to stop, not just a smaller version of the same idea:** every additional OAuth provider is ongoing surface area — its own app registration, its own client secret to rotate and protect, its own create-or-link-user edge cases (e.g., an email that already exists under a different provider), and its own line in the security checklist. None of that is expensive in money, but it's a real maintenance and audit cost for a two-person portfolio project. Google alone already covers the large majority of users who'd rather not type a password, and email/password covers everyone else — adding GitHub was marginal value for a real recurring cost of a different kind (attention, not dollars).

**Apple remains excluded for the reason already documented:** it requires a $99/year Apple Developer Program membership with no free tier, which was the original reason it never made it in.

**If a second OAuth provider is wanted later**, `security/oauth_google.py`'s pattern (Authlib, create-or-link-user, token issuance identical to the email/password path) is the template to copy — nothing else in the architecture needs to change to support re-adding GitHub or adding a different provider.

### 2.6 Data Export (CSV/PDF)

**Functional requirement (new: F-035):** a user can export their full prediction history as CSV (for their own analysis) or PDF (for sharing with a doctor).

**Implementation:**
- CSV: straightforward `pandas.DataFrame.to_csv()` over the user's `predictions` collection
- PDF: `WeasyPrint` (HTML/CSS-to-PDF, easiest to keep visually consistent with the app's chosen design system) rendering a templated report: user info, disclaimer, one section per disease with a trend chart image and a table of past predictions

**New API endpoint:**
```
GET /api/export/history?format=csv|pdf
  -> file download (never emailed automatically — always an explicit, user-initiated download)
```

**Security note:** this is a per-user route with the same ownership-check pattern as everything else (Backend doc §3.5) — it only ever exports the authenticated user's own data, and is rate-limited (Backend doc §4.4) since PDF generation is comparatively expensive per request.

### 2.7 Admin Analytics Dashboard

**Functional requirement (new: F-036):** a small number of designated admin accounts can view aggregate, anonymized usage statistics — never per-user PII.

**Implementation:**
- `users.role` field added: `"user" | "admin"` (default `"user"`; admin accounts are seeded manually, never self-assignable through any API route)
- New route group, all gated by an `require_admin` FastAPI dependency (extends `security/dependencies.py`) checked in addition to, not instead of, normal JWT auth
- Aggregate queries only: total users, total predictions per disease, model-selection distribution (how often each algorithm is chosen), average risk score per disease — **computed via MongoDB aggregation pipelines that never return a `user_id` or any individual record**, so there is no code path from this feature back to a specific person's health data

**New API endpoints:**
```
GET /api/admin/analytics/overview
GET /api/admin/analytics/predictions-per-disease
GET /api/admin/analytics/model-usage
```

**New screen:** `/admin` (Auth + admin role required) — reuses the Model Leaderboard Table pattern (UI Design System §5.6/5.7) plus new aggregate charts.

**Security note (extends Backend doc §4.3):** admin routes are the highest-value target in the system if compromised (aggregate data across all users), so beyond the role check, they get the tightest rate limiting of any route group and every access is logged with the admin's own user ID for audit purposes.

### 2.8 Email Notifications & Forgot Password

**Functional requirement (new: F-037, unblocks F-038 forgot password):** transactional email is added as infrastructure, enabling both a self-service password reset and optional risk-trend notifications.

**Provider:** plain **SMTP** via Python's `aiosmtplib` (a free, open-source async SMTP client library — no vendor API key, no paid tier of any kind) — abstracted behind `core/email_service.py` so the actual SMTP relay is a config choice, not a code choice. This works with any free SMTP relay a person already has access to:
- A Gmail account with an [app password](https://myaccount.google.com/apppasswords) (free, ~500 emails/day limit — plenty for password resets and opt-in trend notifications at this project's scale)
- A free-tier transactional relay such as Brevo (300 emails/day free) or Mailjet (200/day free), if a dedicated "from" address is preferred over a personal Gmail

No third-party email API key is required for local development or a small deployment — just SMTP host/port/username/password in `.env`, the same pattern as configuring any email client.

**Forgot Password flow:**
```
POST /api/auth/forgot-password { email }
  -> generates a single-use, short-lived (30 min) reset token, stored hashed in a new
     `password_reset_tokens` collection, emails a reset link
  -> ALWAYS returns a generic success response regardless of whether the email exists
     (prevents user enumeration, consistent with the login error-message principle
     in Backend doc §4.2)

POST /api/auth/reset-password { token, new_password }
  -> validates token (exists, unexpired, unused), hashes new password, invalidates the token,
     invalidates all existing refresh tokens for that user (forces re-login everywhere)
```

**Risk-trend notifications (opt-in only, default off):** a scheduled job (`APScheduler` running inside the backend, or a separate cron-triggered endpoint if the hosting platform doesn't support long-running background processes) checks, for opted-in users, whether their most recent prediction for a disease crossed a risk-band boundary (e.g., Moderate → High) since their previous one, and sends a templated email if so. This is explicitly opt-in (a toggle in `/profile`, defaulting to **off**) since unsolicited health-related emails are a genuine sensitivity — never sent without affirmative consent separate from the general data-storage consent (TRD v2.0 §7).

**New collection:**
```json
// password_reset_tokens
{ "_id", "user_id", "token_hash", "expires_at", "used": false, "created_at" }
```

**New screens:** `/forgot-password`, `/reset-password/:token`.

### 2.9 Guest Prediction Retroactive Save (Resolved Open Question)

**Resolution:** the guest's most recent prediction result is held in **frontend memory only** (React state, not persisted anywhere) for the duration of the browser session. If the guest signs up or logs in within that same session, the signup/login success flow offers "Save this result to your history?" — an explicit, opt-in action, not an automatic retroactive save. If they decline, refresh, or close the tab first, the result is gone, consistent with the "anonymous means anonymous unless the user explicitly chooses otherwise, in the moment" principle.

---

## 3. Updated Non-Functional Requirements

| NFR | Addition |
|---|---|
| Compute | CNN training requires GPU access for reasonable training time (recommend a free-tier notebook environment for the one-time training step); CPU inference at request time is acceptable but slower than the tabular models — documented, not hidden |
| Email deliverability | SPF/DKIM configured on whichever free SMTP relay is used (Gmail/Brevo/Mailjet all support this) so reset/notification emails don't land in spam — a functional requirement, not just a nicety, since a broken password-reset email is a support/trust problem |
| Admin data isolation | No admin endpoint may return an identifiable individual record — enforced via aggregation-only queries, verified in the pre-deployment security checklist (§5) |
| Export rate limits | PDF export specifically rate-limited tighter than most routes given its compute cost per request |
| OCR reliability | Extraction confidence must be surfaced and low-confidence fields must require explicit user confirmation — never silently trusted |

---

## 4. Updated Risks

| Risk | Mitigation |
|---|---|
| CNN models overfit on comparatively small TB/CT datasets (a few thousand images vs. the tens of thousands typical for vision tasks) | Aggressive data augmentation, transfer learning from ImageNet weights (not training from scratch), held-out test set reporting, honest accuracy reporting even if it's lower than the tabular models' |
| OCR/NLP extraction misreads a lab value and a user trusts it uncritically | Confidence scores shown per field, explicit confirm-before-fill step, never auto-submits a prediction from extracted values without the user reviewing the populated form first |
| Email service becomes a spam/abuse vector (e.g., password-reset spam against other people's emails) | Rate limiting on `/api/auth/forgot-password` (Backend doc §4.4 pattern), generic response regardless of email existence |
| Admin dashboard becomes a high-value breach target | Role check is additive to JWT auth (never a replacement), tightest rate limits, full audit logging of admin access |
| Scope size delays shipping anything usable | Implementation Plan phases the original MVP (Phases 0-5) to completion **first**; all Section 2 additions are explicitly sequenced *after* a working core product exists (§6 below) |

---

## 5. Updated Pre-Deployment Security Checklist (additions to Backend doc §5)

- [ ] Admin routes confirmed to return only aggregated data — manually attempt to find any admin response field that maps to a single user
- [ ] Password reset tokens are hashed at rest, single-use, and expire in 30 minutes — verified by attempting reuse after a successful reset
- [ ] `/api/auth/forgot-password` returns an identical response for both existing and non-existing emails
- [ ] OCR-extracted values pass through the same Pydantic validation as manual input before reaching any prediction call
- [ ] Uploaded images intended for CNN inference are validated by magic-byte inspection (Backend doc §3.6) before being handed to the vision pipeline, and stripped of EXIF metadata before storage (privacy — X-ray/CT images may carry embedded device/location metadata)
- [ ] SMTP credentials stored only in backend environment variables, never in frontend code

---

## 6. Updated Implementation Plan — New Phases

*Phases 0-5 from Implementation Plan v2.0 (foundation, auth, prediction API, history/insights, uploads/privacy, hardening/deployment) remain the required foundation and ship **first**. The phases below are additive, built on top of a working core product — not interleaved with it.*

### Phase 6 — Vision Pipeline (TB & Lung Cancer Imaging)
- [ ] Acquire and preprocess TB X-ray, IQ-OTH/NCCD, and LC25000 datasets
- [ ] Train `tb_xray_model` and `cancer_image_model` (transfer learning, PyTorch)
- [ ] Integrate Grad-CAM explainability
- [ ] Build `POST /api/predict/{disease}/image` and the image-upload UI variant on the TB/Cancer predict pages
- [ ] Extend `predictions` schema with `input_type`/`image_ref`/`gradcam_ref`

**Exit criteria:** a user can upload a chest X-ray or CT/histopathology image and receive a prediction with a Grad-CAM overlay, saved to history alongside tabular predictions.

### Phase 7 — Framingham Score & Symptom Checker
- [ ] Implement `core/framingham.py` and its endpoint/UI card
- [ ] Train the TF-IDF + Logistic Regression symptom classifier on Symptom2Disease
- [ ] Build the free-text entry point on the Dashboard and its routing behavior

**Exit criteria:** Heart Disease page shows the Framingham card alongside the ML comparison; Dashboard offers a working symptom-based routing entry point.

### Phase 8 — Document Intelligence (OCR/NLP Extraction)
- [ ] Integrate Tesseract/pdfplumber extraction pipeline
- [ ] Build the field-mapping/confidence layer
- [ ] Build the "Auto-fill from report" UI flow with mandatory confirm-before-fill

**Exit criteria:** a user can upload a lab report and get a reviewable, editable pre-filled prediction form — never a silently-submitted one.

### Phase 9 — Data Export & Notifications
- [ ] Build CSV and PDF export endpoints + UI
- [ ] Add SMTP email integration, forgot/reset password flow, opt-in risk-trend notifications

**Exit criteria:** a user can export their data; password reset works end-to-end via free SMTP; opted-in users receive a trend-change email in a test scenario. (Auth stays at email/password + Google only — no additional OAuth work in this phase.)

### Phase 10 — Admin Analytics
- [ ] Add `role` field, seed one admin account manually
- [ ] Build aggregate-only analytics endpoints and the `/admin` screen

**Exit criteria:** an admin account sees aggregate usage stats; a non-admin account is rejected from every `/api/admin/*` route; no admin response contains an identifiable individual record.

### Phase 11 — Full-Scope Hardening & Re-Deployment
- [ ] Re-run the full security checklist (Backend doc §5 + this document's §5 additions) against the expanded surface
- [ ] Load-test image inference latency and document realistic expectations
- [ ] Update README, all docs, and the repository scaffold to reflect the final full-scope state

**Exit criteria:** every item in §1's Scope Change Summary table is live, tested, and documented — nothing remains in a "deferred" state anywhere in the project's documentation.
