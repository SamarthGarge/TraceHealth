# Contributing to HealthRisk Predictor

## Ground Rules

1. **Ownership checks are mandatory.** Any new route touching `predictions` or `uploads` must verify the record's `user_id` matches the authenticated user before returning data. See `docs/Backend.md` §4.3.
2. **No secrets in source.** `.env` files are git-ignored; never commit real credentials, even temporarily.
3. **Feature order lock.** If you touch `training/preprocessing.py`, `models/model_metadata.json`, or any per-disease frontend form, verify all three still agree on field order. See `docs/TRD.md` §5.2.
4. **Copy the template, don't reinvent it.** A new disease module should follow the existing Predict page/route/schema pattern (`docs/TRD.md` §7.1) rather than introducing a new structure.

## Development Setup
See the root `README.md` "Getting Started" section.

## Before Opening a PR
- [ ] Backend: `pytest` passes
- [ ] Frontend: `npm run lint` passes
- [ ] No new dependency added without a note in the PR description explaining why
- [ ] If your change touches auth, uploads, or history routes, re-read `docs/Backend.md` §4 and confirm your change doesn't weaken any listed control

## Reporting Security Issues
Do not open a public issue for a security vulnerability — see `SECURITY.md`.
