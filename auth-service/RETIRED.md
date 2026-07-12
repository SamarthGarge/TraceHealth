# auth-service — RETIRED

This directory has been retired. Authentication is now handled directly by the
FastAPI backend (`backend/`) using:

- **Email/password** — `passlib[bcrypt]` for hashing, `python-jose` for JWTs
- **Google OAuth** — standard OAuth2 redirect flow via `authlib`
- **Sessions** — JWT stored in an `httpOnly` cookie

This folder can be safely deleted. It is kept here only for git history reference.
