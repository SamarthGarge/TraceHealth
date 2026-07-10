# HealthRisk Predictor — Frontend Architecture, Flow & Security

**Version:** v1.0 | **Stack:** React 18 + Vite | **Companion to:** TRD v2.0, UI Design System v2.0 | **Date:** 2026-07-05

---

## 1. Purpose

This document specifies exactly how the React frontend is structured, how data flows through it for every major user action, and — since the frontend is the layer most directly exposed to a hostile browser environment — what security measures protect it against common client-side attacks. It complements TRD v2.0 §6 (Frontend Architecture) with implementation-level detail.

---

## 2. Application Structure

```
frontend/
├── src/
│   ├── main.jsx                     # App entry, providers (Auth, QueryClient, Router)
│   ├── App.jsx                       # Route definitions
│   ├── api/
│   │   ├── client.js                  # Axios instance, interceptors (§4.3)
│   │   ├── auth.js                     # login, register, refresh, logout, me
│   │   ├── predictions.js               # predict, history, history detail, delete
│   │   ├── uploads.js                    # upload, list, download, delete
│   │   └── models.js                      # model metadata / leaderboard
│   ├── context/
│   │   └── AuthContext.jsx              # current user, token (in-memory), auth actions
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── usePredictions.js             # React Query wrappers
│   │   ├── useHistory.js
│   │   └── useUploads.js
│   ├── components/
│   │   ├── shared/                        # RiskBadge, ModelSelector, ModelComparisonPanel,
│   │   │                                     ExplanationPanel, MetricCard, ConsentBanner,
│   │   │                                     UploadDropzone, HistoryTimeline, TrendChart
│   │   ├── layout/                        # Sidebar, Header, Footer, AuthGuard
│   │   └── forms/                          # Per-disease input form components
│   ├── pages/                              # One file per route (§3 of Screen Inventory)
│   ├── styles/                              # Tailwind config, DataLens token CSS
│   └── utils/
│       ├── validation.js                    # Zod schemas per form
│       └── sanitize.js                       # Output-side sanitization helpers (§5.2)
├── .env.example
├── vite.config.js
└── package.json
```

---

## 3. Core Data Flows

### 3.1 Authentication Flow (Email/Password)
```
User submits signup form (React Hook Form + Zod validation)
   → client-side validation passes
   → POST /api/auth/register { name, email, password, consent_data_storage: true }
   → Backend hashes password, creates user, returns { access_token, user }
      (refresh token arrives as an httpOnly Set-Cookie header, invisible to JS)
   → Frontend stores access_token in AuthContext state (memory only — never localStorage)
   → React Query invalidates any cached "unauthenticated" state
   → Redirect to /dashboard
```

### 3.2 Authentication Flow (Google OAuth)
```
User clicks "Continue with Google"
   → Frontend redirects (full navigation, not fetch) to GET /api/auth/google/login
   → Backend redirects to Google's consent screen
   → Google redirects back to GET /api/auth/google/callback
   → Backend creates/links the user, issues tokens, redirects to
     frontend URL with a short-lived one-time code (never the JWT itself in the URL)
   → Frontend exchanges the one-time code for an access token via a POST call
   → Same in-memory storage as §3.1 from here on
```
*(Passing the JWT directly in a redirect URL is deliberately avoided — URLs land in browser history and server logs; a one-time exchange code closes that exposure.)*

### 3.3 Silent Token Refresh
```
Any API call returns 401 (access token expired)
   → Axios response interceptor catches it
   → POST /api/auth/refresh (httpOnly refresh cookie sent automatically by the browser)
   → New access token received, stored in memory, original request retried once
   → If refresh also fails → AuthContext clears, user redirected to /login
```

### 3.4 Prediction Flow
```
User fills disease form → client-side Zod validation (range/required checks)
   → On submit: POST /api/predict/{disease} with Authorization header if logged in
   → Loading state shown (skeleton, not a blank screen)
   → Response: { final_probability, final_risk_label, selected_model, all_model_results,
                 shap_top_features, saved_to_history, prediction_id }
   → RiskBadge, ModelComparisonPanel, ExplanationPanel render from this single response
   → If saved_to_history: React Query invalidates the /api/history cache so the new
     entry appears immediately if the user navigates to /history
   → If NOT logged in: a dismissible banner reads "Log in to save this result to your history"
```

### 3.5 History & Trend Flow
```
/history mounts → React Query fetches GET /api/history?disease=&from=&to=&page=
   → HistoryTimeline renders rows; TrendChart renders from the same payload,
     grouped client-side by disease
   → Clicking a row navigates to /history/:id → GET /api/history/:id →
     renders the read-only Predict-page layout stamped with the original timestamp
   → Delete action → DELETE /api/history/:id → optimistic removal from the
     React Query cache, rolled back if the request fails
```

### 3.6 Upload Flow
```
User drags a file onto UploadDropzone
   → Client-side check: type in {pdf, png, jpeg, csv}, size <= 10MB
      (fails fast with a DataLens error box before any network call)
   → POST /api/uploads (multipart/form-data) with progress event → progress bar
   → On success: React Query invalidates /api/uploads, new file appears in the list
   → Delete action requires a confirm step, then DELETE /api/uploads/:id
```

---

## 4. Frontend Security Measures

The frontend cannot enforce security on its own — the backend is the actual authority (see the companion Backend document) — but the client is the first line of defense against a wide class of attacks and must not introduce its own vulnerabilities.

### 4.1 Cross-Site Scripting (XSS) Prevention
- React's default JSX escaping is relied on for all rendered text — **no use of `dangerouslySetInnerHTML`** anywhere in the codebase for user-supplied content (health form values, upload notes, file names).
- If any markdown/rich-text rendering is ever introduced (e.g., a future "notes" field with formatting), it must go through a sanitizer (`DOMPurify`) before rendering — documented here as a standing rule for any future contributor, not just current scope.
- User-supplied strings (upload notes, profile name) are treated as data, never as executable content, at every render site.

### 4.2 Secure Token Handling
- **Access token:** kept only in React state (`AuthContext`), never written to `localStorage` or `sessionStorage`. This means a reflected or stored XSS bug elsewhere in the app cannot trivially exfiltrate a long-lived credential — the access token is short-lived and lost on tab close/refresh (recovered via silent refresh, §3.3).
- **Refresh token:** never touched by JavaScript at all — it lives in an `httpOnly`, `Secure`, `SameSite=Strict` cookie set by the backend, so it is unreadable to any script running on the page, including a malicious injected one.

### 4.3 Axios Interceptor Hardening
```js
// api/client.js (excerpt)
axios.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
axios.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retried) {
      error.config._retried = true;           // prevents infinite refresh loops
      const refreshed = await tryRefresh();
      if (refreshed) return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```
- The `_retried` flag guards against infinite refresh loops if the refresh endpoint itself starts returning 401.
- The Axios instance's `baseURL` is pinned to the known backend origin from an environment variable — never constructed from user input or `window.location`, preventing accidental SSRF-style misdirection of API calls.

### 4.4 CSRF Considerations
- Because the access token is sent via an `Authorization` header (not a cookie) for all state-changing requests, classic CSRF (which relies on cookies being sent automatically) does not apply to those routes.
- The one cookie the browser does send automatically — the refresh token — is scoped with `SameSite=Strict`, meaning it is not sent on cross-site requests at all, closing the one remaining CSRF surface (someone tricking a user's browser into hitting `/api/auth/refresh` from another site).

### 4.5 Input Validation (Client-Side, Defense in Depth)
- Every form (auth, predict, upload metadata) is validated with **Zod schemas shared conceptually with the backend's Pydantic models** — same constraints (ranges, required fields, string lengths) expressed on both sides, so a user gets instant feedback client-side while the backend independently re-validates and is the actual source of truth (client-side validation is a UX nicety here, never a security control on its own — see Backend document §3).
- File upload type/size checks happen client-side for fast feedback, and are re-checked server-side as the authoritative gate (§3.6).

### 4.6 Dependency & Supply-Chain Hygiene
- `package-lock.json` is committed so builds are reproducible.
- `npm audit` (or equivalent) is run as part of the pre-release checklist; any high/critical vulnerability in a dependency is resolved (patch, replace, or documented as an accepted risk) before deployment.
- Third-party scripts are limited to what's declared in TRD v2.0's stack (Plotly.js, no arbitrary CDN includes beyond fonts) to minimize the supply-chain attack surface.

### 4.7 Content Security & Transport
- The app is served exclusively over HTTPS in production (enforced by the hosting platform, e.g., Vercel/Netlify's automatic TLS).
- A Content-Security-Policy header (set by the hosting platform or a meta tag) restricts script sources to the app's own origin plus the Google Fonts CDN already in use — reduces the blast radius if an XSS vector were ever found.
- `rel="noopener noreferrer"` is applied to any external link (e.g., a footer GitHub link) to prevent the linked page from gaining a reference to `window.opener`.

### 4.8 Clickjacking
- The backend sets `X-Frame-Options: DENY` (or an equivalent CSP `frame-ancestors 'none'`) so the app cannot be embedded in a hidden iframe on a malicious page to trick users into clicking (e.g., a fake "delete account" overlay) — detailed further in the companion Backend document's response-header section.

### 4.9 Error Handling Without Information Leakage
- API error responses are rendered via the DataLens error box using the backend's generic user-facing message only — raw stack traces, internal error codes, or database error strings are never surfaced in the UI, even in development builds that might accidentally ship.

### 4.10 Environment & Secrets
- The frontend `.env` only ever contains **public** configuration (API base URL, Google OAuth client ID — which is public by design in OAuth). No secret (JWT signing key, OAuth client secret, database credentials) is ever present in frontend code or environment variables, since anything shipped to the browser is inherently readable by the end user.

---

## 5. Accessibility & Robustness (supports security indirectly)

- All interactive elements (Model Selector, Upload Dropzone, delete-confirmation modals) are keyboard-operable and screen-reader labeled — not a security control per se, but part of the same "don't ship a fragile client" discipline as the rest of this document.
- Every data-fetching page has an explicit loading, empty, and error state (per Screen Inventory §4) so a slow or failing backend never presents a blank or confusing screen that could be mistaken for a successful action (e.g., a silent failed deletion).

---

## 6. Pre-Deployment Frontend Security Checklist

- [ ] No `localStorage`/`sessionStorage` used for tokens anywhere in the codebase
- [ ] No `dangerouslySetInnerHTML` on any user-supplied string
- [ ] Axios `baseURL` is environment-pinned, never derived from user input
- [ ] `npm audit` shows no unresolved high/critical vulnerabilities
- [ ] CSP header present and restricts script-src appropriately
- [ ] All external links use `rel="noopener noreferrer"`
- [ ] Error states never render raw backend error bodies/stack traces
- [ ] Refresh-loop guard (`_retried`) present in the Axios interceptor
- [ ] `.env` contains no secret values, only public configuration
