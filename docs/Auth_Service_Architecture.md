# HealthRisk Predictor — Auth Service Architecture (Better Auth)
### Supersedes: TRD v2.0 5.1 (Auth endpoints), 3 (auth-related backend deps), Backend doc 3.1-3.3, Full-Scope Expansion 2.5

**Version:** v1.0 | **Date:** 2026-07-07 | **Stack addition:** Node.js + Better Auth (new third service)

---

## 1. What Changed and Why

Authentication moves out of FastAPI entirely and into a **small, dedicated Node.js service running Better Auth**. FastAPI keeps everything else (ML inference, history, uploads, exports, admin analytics) and is reduced, on the auth side, to one job: **verify tokens issued by the auth service.** This is Option A from the integration decision — the least disruptive path that gets real Better Auth (email/password + Google + native MongoDB support) without rewriting the ML-serving backend.

```
                    +----------------------+
                    |   React SPA            |
                    |   (better-auth/react     |
                    |    client for auth)        |
                    +----------+-------------+
                               |
                 +-------------+-------------------+
                 |                                 |
                 v                                 v
   +------------------------+         +----------------------------+
   |  auth-service (Node)      |         |  FastAPI backend              |
   |  - Better Auth               |         |  - /api/predict/*              |
   |  - email/password               |        |  - /api/history/*               |
   |  - Google OAuth                    |       |  - /api/uploads/*                 |
   |  - MongoDB adapter                    |      |  - /api/export/*                     |
   |  - issues JWT (RS256) + JWKS             |     |  - /api/admin/*                        |
   |  - /api/auth/*                              |    |  - verifies bearer JWT via JWKS          |
   +--------------+---------------------+        |  - never issues or stores passwords        |
                  |                             +--------------------+----------------------+
                  |                                                    |
                  +--------------------+----------------------------------+
                                       v
                          +--------------------------+
                          |   MongoDB Atlas              |
                          |   - user, session,            |
                          |     account, verification       |  (Better Auth's own collections)
                          |   - predictions, uploads,          |  (FastAPI's collections,
                          |     model_metadata                     keyed by the same user id)
                          +--------------------------+
```

Both services share one MongoDB database. Better Auth owns its own collections (`user`, `session`, `account`, `verification` — its default schema); FastAPI's existing collections (`predictions`, `uploads`) are untouched in shape and simply key `user_id` off the same id Better Auth assigns, so there's no separate identity-sync step required.

---

## 2. Why a JWT + JWKS, Not a Shared Secret

Two services need to agree on "is this user really logged in." The simplest option (a shared symmetric secret both services know, HS256) works but means the secret has to be distributed and kept in sync across two codebases/deployments. Instead:

- The auth service is configured with Better Auth's **JWT plugin**, which signs tokens asymmetrically (RS256) and exposes a JWKS (JSON Web Key Set) endpoint at `/api/auth/jwks`.
- FastAPI fetches the public key set from that endpoint (cached, refreshed periodically) and verifies incoming bearer tokens' signatures **without ever holding a secret that could issue a token** — it can only verify, never mint. This is a meaningfully better security boundary: if the FastAPI service were ever compromised, an attacker still couldn't forge new sessions, only misuse ones already issued.
- The auth service's separate **bearer plugin** allows the frontend to send the session as an `Authorization: Bearer <token>` header to both the auth service and FastAPI, rather than relying on cookies working across two different backend origins (cookies get complicated across services on different subdomains; a bearer token sidesteps that entirely).

---

## 3. Auth Service Configuration

```
auth-service/
├── src/
│   ├── auth.js              Better Auth instance (config below)
│   ├── db.js                 MongoDB client connection (shared cluster, own logical access)
│   └── server.js               Express app, mounts Better Auth's handler
├── package.json
├── .env.example
└── Dockerfile
```

```js
// src/auth.js
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { jwt, bearer } from "better-auth/plugins";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI);
await client.connect();
const db = client.db(process.env.MONGO_DB_NAME);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: mongodbAdapter(db, {
    client,
    // Free-tier Atlas M0 / standalone Mongo do not support multi-document
    // transactions reliably in every configuration -- verify against your
    // actual cluster; set false if you hit transaction errors.
    transaction: false,
  }),

  emailAndPassword: {
    enabled: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },

  // Extends Better Auth's default user schema with the two custom fields
  // this project already depends on (TRD v2.0 7 consent, Full-Scope 2.7 admin role)
  user: {
    additionalFields: {
      consentDataStorage: { type: "boolean", required: true, defaultValue: false },
      role: { type: "string", defaultValue: "user" }, // "user" | "admin"
    },
  },

  trustedOrigins: [process.env.FRONTEND_ORIGIN],

  advanced: {
    defaultCookieAttributes: { sameSite: "lax", secure: true, httpOnly: true },
  },

  plugins: [
    bearer(),   // allows Authorization: Bearer <token> instead of cookie-only sessions
    jwt(),      // signs RS256 JWTs, exposes /api/auth/jwks for FastAPI to verify against
  ],
});
```

```js
// src/server.js
import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN, credentials: true }));
app.all("/api/auth/*", toNodeHandler(auth));
app.listen(process.env.PORT || 4000);
```

**Note on the `consentDataStorage` field:** signup on the frontend must set this explicitly true as part of the sign-up call (Better Auth supports passing additional fields at `signUp.email({ ..., consentDataStorage: true })`); FastAPI's prediction-saving logic (TRD v2.0 7) checks this field via the verified token's claims before persisting anything to `predictions`.

---

## 4. FastAPI-Side Changes

### 4.1 Removed
- `security/passwords.py` — deleted. Better Auth owns password hashing entirely; FastAPI never sees or stores a password.
- `security/oauth_google.py` — deleted. Google OAuth is handled entirely by the auth service.
- `routers/auth.py`'s registration/login/OAuth route handlers — deleted. FastAPI no longer exposes `/api/auth/register`, `/api/auth/login`, or `/api/auth/google/*` at all; those now live on the auth service.

### 4.2 Added/Changed
- `security/verify_token.py` (new, replaces the old `jwt.py`'s encode/decode role):
```python
# security/verify_token.py
import httpx
from jose import jwt
from functools import lru_cache

JWKS_URL = f"{settings.AUTH_SERVICE_URL}/api/auth/jwks"

@lru_cache(maxsize=1)
def get_jwks():
    return httpx.get(JWKS_URL, timeout=5).json()

def verify_bearer_token(token: str) -> dict:
    jwks = get_jwks()
    # Standard RS256/JWKS verification -- matches key by `kid` in the token header
    payload = jwt.decode(token, jwks, algorithms=["RS256"], audience=settings.AUTH_SERVICE_URL)
    return payload  # contains sub (user id), email, consentDataStorage, role, etc.
```
- `security/dependencies.py::get_current_user` now calls `verify_bearer_token` instead of decoding a locally-issued JWT — every other route (`predict`, `history`, `uploads`, `export`, `admin`) is unchanged, since they only ever depended on `get_current_user` returning a user id, never on how that id was obtained.
- JWKS response is cached (`lru_cache`, or a short-TTL cache in production) so FastAPI isn't fetching the key set on every single request — refreshed periodically or on verification failure (in case of key rotation).

### 4.3 Unchanged
- Every ownership-check pattern in Backend doc 3.5 (history/upload access) is identical — it still compares the record's `user_id` to the verified token's subject claim, it just gets that claim from a different verification path now.
- Rate limiting, CORS, security headers, logging discipline (Backend doc 4) — all unchanged.

---

## 5. Frontend-Side Changes

Replaces Frontend doc 3.1-3.3 (registration/login/OAuth flows) and the AuthContext internals; 3.4 onward (prediction flow, history flow, upload flow) are unaffected since they only consume a token, not its issuance mechanism.

```js
// src/lib/authClient.js
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_SERVICE_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
```

- **Signup:** `signUp.email({ email, password, name, consentDataStorage: true })`
- **Login:** `signIn.email({ email, password })`
- **Google:** `signIn.social({ provider: "google" })`
- **Session:** `useSession()` gives the current user/session reactively; `AuthContext` becomes a thin wrapper around this hook rather than hand-rolled token state
- **Calling FastAPI:** the Axios instance's request interceptor now pulls the bearer token from `authClient.getSession()` (or the token exposed by the bearer plugin) instead of a custom `/api/auth/login` response — same in-memory-only storage discipline as before (Frontend doc 4.2), just a different source

---

## 6. Deployment

- `auth-service` deploys as its own small service (Render/Railway free tier, same as FastAPI) — one more service, not a bigger one; it's a thin wrapper around Better Auth, not a large codebase
- `docker-compose.yml` gains a third service entry
- Recommended production topology: `app.healthrisk.app` (frontend), `auth.healthrisk.app` (auth-service), `api.healthrisk.app` (FastAPI) — all under one parent domain, so if cookie-based flows are ever needed alongside the bearer-token approach, cookie domain scoping stays simple
- `FRONTEND_ORIGIN` must be listed in **both** the auth-service's `trustedOrigins` and FastAPI's CORS allow-list (Backend doc 4.6) — two places to update if the frontend origin ever changes, documented here so it isn't missed

---

## 7. Security Notes (additions to Backend doc 4)

| Concern | Handling |
|---|---|
| FastAPI can verify but never mint tokens | By design — RS256 + JWKS means a FastAPI compromise doesn't grant token-forging ability |
| JWKS endpoint availability | If the auth service is briefly unreachable when FastAPI's cached JWKS expires, verification fails closed (rejects requests) rather than falling back to an unverified state |
| Two services, one login surface | Rate limiting (Backend doc 4.4) now lives on the auth-service's `/api/auth/sign-in/*` and `/api/auth/sign-up/*` routes instead of FastAPI's old `/api/auth/*` — moved, not duplicated |
| `consentDataStorage` and `role` are custom fields on a third-party auth system | Verified as present on every issued token before FastAPI trusts them — if either field is ever missing from a token (e.g., a Better Auth version change alters the additionalFields contract), FastAPI treats it as `false`/`"user"` (fail closed on consent and on admin privilege), never assumes a permissive default |

---

## 8. Repository Structure Addition

```
healthrisk-predictor/
├── auth-service/          NEW -- Better Auth (Node/Express)
│   ├── src/ (auth.js, db.js, server.js)
│   ├── package.json, .env.example, Dockerfile
├── backend/                 FastAPI -- auth routes removed, verify_token.py added
├── frontend/                  authClient.js added, AuthContext simplified
├── training/
├── models/
├── docs/
```

## 9. What to Verify Before Building (flagged, not assumed)

Better Auth is an actively developed library — the JWT plugin's exact API, the `additionalFields` contract, and the MongoDB adapter's transaction-handling defaults are all worth re-checking against the current docs at build time rather than trusting this document as gospel months from now. Treat this document as the architecture decision and integration shape; treat better-auth.com's own docs as the source of truth for exact function signatures when the code actually gets written.
