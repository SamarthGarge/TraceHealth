# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in HealthRisk Predictor, please report it privately rather than opening a public GitHub issue. Include:

- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any relevant logs or screenshots (with personal data redacted)

We aim to acknowledge reports within 3 business days.

## Scope

This project stores user accounts and health-related prediction history. The full security posture — authentication, access control, data isolation, and OWASP-aligned mitigations — is documented in `docs/Backend.md` §4. Please review that document before assuming a behavior is unintentional; some design choices (e.g., 404 instead of 403 on unauthorized record access) are deliberate.
