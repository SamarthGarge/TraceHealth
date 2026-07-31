# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` branch | ✅ Active |
| Any tagged release | ✅ Active |
| Older forks / branches | ❌ Not supported |

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Report vulnerabilities privately through **[GitHub Security Advisories](https://github.com/SamarthGarge/TraceHealth/security/advisories/new)**.

Include:
- A description of the vulnerability and its potential impact
- Step-by-step reproduction instructions
- Affected endpoints or components
- Any relevant logs or screenshots (redact all personal data)

We aim to **acknowledge** reports within **3 business days** and provide a **remediation timeline** within **7 business days**.

## Security Architecture

TraceHealth implements the following security measures:

### Authentication & Sessions
- JWT access tokens are stored exclusively in **`httpOnly`, `SameSite=Lax` cookies** — never in `localStorage` or JS memory.
- Short-lived access tokens (default: 60 min) with long-lived refresh tokens (default: 30 days).
- Passwords are hashed server-side using **bcrypt** (passlib) — never stored in plaintext.
- Google OAuth uses server-side exchange; client never touches the OAuth tokens.

### Authorization
- All authenticated routes use `require_auth` FastAPI dependency.
- Admin-only routes additionally verify `role == "admin"`.
- Per-record ownership is enforced (users can only access their own data).
- Returns **404** (not 403) on unauthorized record access to prevent user enumeration.

### Input Validation & File Security
- File uploads validated by **magic-byte inspection** (not just file extension or MIME type header).
- Only PDF, PNG, JPEG, and CSV files are accepted; all others are rejected with HTTP 415.
- File size enforced at 10 MB; size checked while streaming (no full-load into memory first).
- Filenames sanitized — path traversal characters are stripped before storage.

### OWASP Mitigations
- **Rate limiting**: per-IP rate limits on all auth endpoints (`slowapi`).
- **CORS**: only explicitly configured origins are allowed.
- **Security headers**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and a strict `Content-Security-Policy` are set on all responses.
- **Injection**: all database queries use parameterized MongoDB operators — no string interpolation into queries.
- **Constant-time password comparison**: even when a user account doesn't exist, a dummy hash comparison is performed to prevent timing attacks.

### Infrastructure
- All cookies set with `Secure` flag in production (HTTPS only).
- MongoDB Atlas used for managed database hosting — no self-hosted DB to patch.
- Docker images run as non-root users.

## Out of Scope

The following are **not** considered security vulnerabilities for this project:

- Rate limits being bypassed with rotating IPs (per-IP limiting is best-effort for a free-tier deployment).
- Vulnerabilities in ML model predictions (this is an educational tool, not a medical device).
- Social engineering or phishing attacks on end-users.
- Issues in third-party services (MongoDB Atlas, Google OAuth, Render, Vercel).

## Contact

For non-security issues, open a regular [GitHub Issue](https://github.com/SamarthGarge/TraceHealth/issues).  
For security issues, use [GitHub Security Advisories](https://github.com/SamarthGarge/TraceHealth/security/advisories/new).
