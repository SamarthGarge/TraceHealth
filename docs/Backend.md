# HealthRisk Predictor — Backend Architecture, Flow & Security

**Version:** v1.0 | **Stack:** FastAPI + MongoDB (Motor) | **Companion to:** TRD v2.0, Frontend document | **Date:** 2026-07-05

---

## 1. Purpose

This document specifies the backend's internal structure, the full request lifecycle for every major operation, and — because the backend is the actual authority over authentication, data access, and stored health information — a comprehensive set of security measures aligned to the OWASP Top 10 and general API/database hardening practice. This is the document that should give a technical evaluator confidence the system won't be trivially compromised.

---

## 2. Application Structure

```
backend/
├── app/
│   ├── main.py                        # FastAPI app instance, middleware, router includes
│   ├── config.py                       # Settings via pydantic-settings, reads .env
│   ├── db.py                            # Motor client, GridFS bucket, index creation on startup
│   ├── core/                             # Ported ML modules (unchanged from TRD v1.0)
│   │   ├── preprocessing.py
│   │   ├── model_loader.py                # loads + caches models at startup
│   │   ├── risk_scoring.py
│   │   ├── shap_utils.py
│   │   └── model_comparison.py
│   ├── security/
│   │   ├── passwords.py                    # passlib bcrypt hash/verify
│   │   ├── jwt.py                           # encode/decode, expiry handling
│   │   ├── oauth_google.py                   # Authlib Google OAuth2 flow
│   │   └── dependencies.py                    # get_current_user, require_auth FastAPI Depends
│   ├── models/                                 # Pydantic request/response schemas
│   │   ├── user.py, prediction.py, upload.py
│   ├── routers/
│   │   ├── auth.py, predict.py, history.py, uploads.py, models_info.py
│   ├── middleware/
│   │   ├── rate_limit.py                         # slowapi config
│   │   └── security_headers.py                    # sets hardening headers on every response
│   └── utils/
│       └── logging.py                              # structured logging, no PII in logs
├── tests/
├── .env.example
├── requirements.txt
└── Dockerfile (optional, for consistent deployment)
```

---

## 3. Core Data Flows (Request Lifecycle)

### 3.1 Registration
```
POST /api/auth/register  { name, email, password, consent_data_storage }
  1. Pydantic validates payload shape (email format, password min length/complexity, consent must be true)
  2. Check `users` collection for existing email (case-insensitive) -> 409 if found
  3. bcrypt-hash the password (never store plaintext, never log it)
  4. Insert user doc with consent_timestamp = now()
  5. Issue access token (short TTL) + refresh token (long TTL, httpOnly cookie)
  6. Return { access_token, user: { id, name, email } }  -- password_hash never serialized in any response
```

### 3.2 Login
```
POST /api/auth/login  { email, password }
  1. Look up user by email
  2. bcrypt.verify(password, stored_hash) -- constant-time comparison, no early-exit timing leak
  3. On failure: generic "Invalid email or password" (never reveal whether the email exists)
  4. On success: issue tokens as in 3.1 step 5, update last_login_at
  5. Rate-limited (4.4) to slow credential-stuffing/brute-force attempts
```

### 3.3 Authenticated Request (any protected route)
```
Request arrives with Authorization: Bearer <token>
  1. FastAPI dependency `get_current_user` decodes + verifies the JWT signature and expiry
  2. On invalid/expired signature -> 401 (frontend triggers refresh, see Frontend doc 3.3)
  3. On valid token -> user_id extracted and attached to the request context
  4. Route handler uses user_id to scope every database query -- never trusts a user_id
     from the request body/query string for ownership-sensitive operations
```

### 3.4 Prediction
```
POST /api/predict/{disease}  { ...per-disease input fields... }
  1. Pydantic schema validates every field against the exact per-disease constraints
     (type, range, enum membership) -- mirrors feature_schema.py's order-lock invariant (TRD v1.0 5.2)
  2. Assemble input vector in the locked feature order
  3. Run all 3 cached models (already loaded in memory at startup -- no per-request disk I/O)
  4. Compute SHAP (tree models) or coefficient contribution (Logistic Regression)
  5. If Authorization header present and valid: insert a `predictions` doc with user_id from
     the verified token (3.3) -- never from any client-supplied field
  6. Return the comparison payload (TRD v2.0 5.5)
```

### 3.5 History Access
```
GET /api/history/{prediction_id}
  1. Verify JWT -> user_id
  2. Fetch the prediction doc by _id
  3. Ownership check: doc.user_id must equal the authenticated user_id, or return 404
     (not 403 -- a 403 would confirm the record exists and belongs to someone else;
      404 avoids leaking existence of other users' data)
  4. Return the doc
```
This ownership-check-then-404 pattern is applied identically to every per-record route: history detail, history delete, upload download, upload delete.

### 3.6 File Upload
```
POST /api/uploads  (multipart/form-data)
  1. Verify JWT -> user_id
  2. Validate content-type against an allow-list (application/pdf, image/png, image/jpeg, text/csv)
     -- checked by inspecting actual file bytes/magic numbers, not just the client-supplied
     Content-Type header, which is trivially spoofable
  3. Enforce max size (10MB) before reading the full file into memory (streamed check)
  4. Store bytes in GridFS; insert `uploads` doc with user_id, filename, content_type, size
  5. Original filename is stored as metadata only -- never used to construct a filesystem path
     (irrelevant here since storage is GridFS, not the local filesystem, but documented as a
     standing rule in case storage is ever migrated to S3/local disk per TRD v2.0 1)
```

### 3.7 Account Deletion (Cascading)
```
DELETE /api/auth/me
  1. Verify JWT -> user_id
  2. Require a re-confirmation signal from the client (e.g., password re-entry or a
     confirmation token) before proceeding -- a bare DELETE with just a valid session
     token is not sufficient for an irreversible, cascading action
  3. Delete all `predictions` docs where user_id matches
  4. Delete all `uploads` docs where user_id matches, and their GridFS chunks
  5. Delete the `users` doc
  6. Invalidate the refresh token (clear cookie) -- no further requests succeed with old tokens
     once the access token also expires (short TTL bounds the exposure window)
```

---

## 4. Security Measures (OWASP-Aligned)

### 4.1 Injection Prevention (A03:2021 -- Injection)
- **MongoDB / NoSQL injection:** all queries are built using Motor's parameterized query objects (`{"email": email}`), never by interpolating user input into a raw query string or `$where` JavaScript expression. `$where` and server-side JS execution are disabled entirely -- there is no legitimate use case for them here.
- Every request body is validated against a strict Pydantic schema **before** it reaches any database call -- unexpected fields are rejected (`model_config = {"extra": "forbid"}`), preventing operator-injection payloads like `{"email": {"$ne": null}}` from ever reaching a query.
- File content-type checks (3.6) prevent a malicious file from being processed as anything other than inert stored bytes -- there is no server-side parsing of uploaded file *contents* in this release (no OCR/parsing = no parser-exploitation surface).

### 4.2 Broken Authentication (A07:2021 -- Identification & Authentication Failures)
- Passwords hashed with **bcrypt** (adaptive cost factor, resistant to brute-force even with GPU acceleration), never MD5/SHA1/plain SHA256.
- JWT access tokens: short expiry (15-30 minutes), signed with a strong secret (HS256 minimum, rotated if ever suspected compromised) stored only in backend environment variables.
- Refresh tokens: longer-lived but revocable -- stored server-side (or as a signed token with a server-side denylist for logout) so a logout or account deletion can actually invalidate them, not just rely on client-side cookie clearing.
- Login endpoint is rate-limited (4.4) specifically to blunt brute-force and credential-stuffing attempts.
- Generic error messages on failed login (3.2) prevent user-enumeration via error-message differences.

### 4.3 Broken Access Control (A01:2021)
- **Every** route touching a `predictions` or `uploads` document performs the ownership check in 3.5 -- this is treated as a mandatory code-review gate (also called out in Implementation Plan v2.0's Risk Watch), not a per-route judgment call.
- No route trusts a `user_id` supplied in a request body or query parameter for authorization decisions -- the only trusted source of identity is the verified JWT.
- Admin-only or debug routes (if any exist during development, e.g., a `/api/debug/*` path) are hard-disabled via environment flag in production builds, not just hidden from documentation.

### 4.4 Rate Limiting & Abuse Prevention
- `slowapi` (or equivalent) applied to: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh` (tightest limits -- these are the credential-attack surface), and a more generous but still-present limit on `/api/predict/*` and `/api/uploads` to prevent resource-exhaustion abuse (e.g., someone scripting thousands of predictions to spike compute cost, or thousands of uploads to exhaust storage).
- Limits are keyed by IP address at minimum, with a documented upgrade path to per-account limits once usage patterns are observed.

### 4.5 Sensitive Data Exposure (A02:2021 -- Cryptographic Failures)
- HTTPS/TLS enforced end-to-end in production (terminated at the hosting platform, e.g., Render/Railway's managed TLS); the app itself never accepts plaintext HTTP in production configuration.
- `password_hash` is excluded from every Pydantic response model (`UserOut` never includes it) -- there is no code path by which a hash can be serialized back to a client, even accidentally.
- MongoDB Atlas connection uses TLS by default and IP-allowlisting (or VPC peering, depending on the hosting backend's network) so the database is not reachable from the open internet.
- Secrets (JWT signing key, Mongo connection string, Google OAuth client secret) live only in backend environment variables / the hosting platform's secret manager -- never committed to source control (`.env` is git-ignored; `.env.example` documents required keys with placeholder values only).

### 4.6 Security Misconfiguration (A05:2021)
- CORS is configured with an explicit allow-list of the production frontend origin (and `localhost` only in development builds) -- never `allow_origins=["*"]` alongside credentialed requests, which would defeat the purpose of the `SameSite`/`httpOnly` cookie protections entirely.
- Debug mode / verbose tracebacks (FastAPI's `debug=True`, auto-generated `/docs` and `/redoc` OpenAPI explorers) are **disabled in production** -- left on only in local development, since an exposed interactive API explorer against a production database is an unnecessary attack surface and information leak.
- Default security headers set on every response via middleware (4.7).

### 4.7 Security Response Headers
Applied globally via middleware, not per-route:

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Prevents clickjacking via iframe embedding |
| `X-Content-Type-Options` | `nosniff` | Stops browsers from MIME-sniffing responses into an executable type |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Forces HTTPS on all future requests to this origin |
| `Content-Security-Policy` | Restrictive, app-origin-scoped | Reduces XSS blast radius (coordinated with the frontend's CSP, see Frontend document 4.7) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits URL/referrer leakage to third parties |

### 4.8 Insecure Deserialization / Object Injection (A08:2021)
- All request parsing goes through Pydantic's typed models -- there is no use of `pickle`, `eval`, or dynamic deserialization of client-supplied data anywhere in the request path. (`joblib`/`pickle` are used only for loading the backend's own trained model files at startup, which are build artifacts controlled by the development pipeline, never user input.)

### 4.9 Vulnerable & Outdated Components (A06:2021)
- `requirements.txt` pins versions; `pip-audit` (or `safety`) is run as part of the pre-release checklist, mirroring the frontend's `npm audit` step.
- Dependencies are kept to what's justified in TRD v2.0 3 -- no speculative library additions that expand the audit surface without a clear need.

### 4.10 Insufficient Logging & Monitoring (A09:2021)
- Structured logs record: auth attempts (success/failure, without the password), rate-limit triggers, and any 4xx/5xx on data-access routes -- enough to reconstruct an incident.
- **Logs never contain**: raw passwords, JWT contents, full health-form input values, or file contents -- health data specifically is excluded from application logs by design, since logs are a lower-security-tier surface than the primary database.
- A failed login, a 404 from an ownership-check rejection (3.5), and a rate-limit trip are all distinguishable in logs so repeated attempts against one account or from one IP are visible to whoever reviews logs.

### 4.11 Server-Side Request Forgery (A10:2021)
- The only outbound request the backend makes to a user-influenced destination is the Google OAuth token exchange, which talks exclusively to Google's fixed, hardcoded endpoint -- the backend never fetches an arbitrary URL supplied by a client, so there is no SSRF surface to defend beyond that fixed integration point.

### 4.12 File Upload Hardening (supplementary to A03/A05)
- Content-type validated by magic-byte inspection, not the client-supplied header (3.6)
- Size capped before full buffering into memory
- Stored in GridFS (inside MongoDB Atlas's access-controlled environment) rather than the application server's local filesystem -- removes any path-traversal or "uploaded file executed as a script" class of risk entirely, since GridFS stores inert binary blobs referenced by ID, not by user-influenced paths

---

## 5. Pre-Deployment Backend Security Checklist

- [ ] `debug=True` and auto-generated `/docs`/`/redoc` disabled in the production config
- [ ] CORS allow-list contains only the real production frontend origin
- [ ] All secrets present only in environment variables / platform secret manager, never in source
- [ ] Every route touching `predictions`/`uploads` has an ownership check (manual review, not just tests)
- [ ] Rate limiting active on all `/api/auth/*` routes and confirmed via a manual burst test
- [ ] `password_hash` confirmed absent from every response model by inspecting the OpenAPI schema
- [ ] `pip-audit`/`safety` shows no unresolved high/critical vulnerabilities
- [ ] Security response headers (4.7) present on a live response (verified with `curl -I`)
- [ ] MongoDB Atlas network access restricted (IP allow-list or VPC), not open to `0.0.0.0/0`
- [ ] Account-deletion cascade manually verified by direct database inspection post-deletion
- [ ] Logs manually reviewed to confirm no password, token, or raw health-input values are ever written
