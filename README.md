# HealthRisk Predictor

Explainable, multi-disease risk screening web application — Diabetes, Heart Disease, Tuberculosis, and Lung Cancer — combining tabular ML (Logistic Regression, Random Forest, XGBoost), computer vision (CNN + Grad-CAM for TB X-ray and Lung Cancer CT/histopathology), a clinical Framingham risk score, OCR/NLP document extraction, a free-text symptom router, and a full-stack architecture with accounts, history, uploads, data export, and admin analytics.

> **Educational tool only.** This application does not provide medical diagnoses. Always consult a qualified healthcare professional for medical concerns.

## Architecture

- **Frontend:** React 18 + Vite, Tailwind CSS
- **Auth service:** Node.js + Better Auth (email/password + Google OAuth), MongoDB adapter, issues RS256 JWTs
- **Backend:** FastAPI (Python) — ML inference, history, uploads, export, admin analytics; verifies (never issues) auth tokens via the auth-service's JWKS endpoint
- **Database:** MongoDB Atlas (shared by auth-service and backend)
- **Tabular ML:** scikit-learn, XGBoost, SHAP
- **Vision ML:** PyTorch (transfer learning), Grad-CAM
- **NLP:** scikit-learn TF-IDF + Logistic Regression (symptom routing)
- **OCR:** Tesseract / pdfplumber
- **Email:** plain SMTP (free — Gmail app password or a free-tier relay)

Three services, one shared database — see `docs/Auth_Service_Architecture.md` for exactly how auth is split out and why, `docs/TRD.md` for the core backend/ML architecture, and `docs/Full_Scope_Expansion.md` for every full-scope addition (vision pipeline, Framingham, OCR, symptom checker, export, admin analytics, email).

## Repository Structure

```
healthrisk-predictor/
├── auth-service/  Node.js + Better Auth (email/password + Google, MongoDB adapter)
├── frontend/      React SPA
├── backend/       FastAPI REST API (ML, history, uploads, export, admin)
├── training/      Offline ML training pipeline (tabular models, vision CNNs, symptom classifier)
├── models/        Trained model artifacts + metadata (generated, not hand-written)
├── docs/          PRD, TRD, Auth Service Architecture, Full-Scope Expansion, and all other specs
└── .github/       CI workflows (one per service)
```

## Getting Started

### Prerequisites
- Node.js 18+ (frontend and auth-service)
- Python 3.11+ (backend and training)
- A MongoDB Atlas connection string (free M0 tier), shared by auth-service and backend
- A Google OAuth client ID/secret (free)
- Free SMTP credentials (a Gmail app password, or a free-tier relay like Brevo/Mailjet)
- Tesseract OCR installed locally (`apt install tesseract-ocr` / `brew install tesseract`)
- GPU access recommended (not required) for training the vision models — a free-tier notebook (e.g., Colab) works well for the one-time training step

### 1. Train the models (one-time, offline)
```bash
cd training
pip install -r requirements.txt --break-system-packages

# Tabular models
python train_diabetes.py
python train_heart.py
python train_tb.py
python train_cancer.py

# Vision models (see docs/Datasets.md for image dataset download links —
# large files are git-ignored and must be downloaded manually)
python train_tb_image.py
python train_cancer_image.py

# Symptom classifier
python train_symptom_classifier.py
```

### 2. Run the auth service
```bash
cd auth-service
cp .env.example .env   # fill in Mongo URI, BETTER_AUTH_SECRET, Google OAuth, frontend origin
npm install
npm run dev
```

### 3. Run the backend
```bash
cd backend
cp .env.example .env   # fill in Mongo URI, AUTH_SERVICE_URL, SMTP credentials, admin seed email
pip install -r requirements.txt --break-system-packages
uvicorn app.main:app --reload
```

### 4. Run the frontend
```bash
cd frontend
cp .env.example .env   # fill in VITE_API_BASE_URL and VITE_AUTH_SERVICE_URL
npm install
npm run dev
```

## Documentation

| Document | Purpose |
|---|---|
| `docs/PRD.md` | Product requirements |
| `docs/TRD.md` | Core technical architecture |
| `docs/Auth_Service_Architecture.md` | **How auth works**: Better Auth (Node) + FastAPI JWT/JWKS verification |
| `docs/Full_Scope_Expansion.md` | Every full-scope addition: vision pipeline, Framingham, OCR, symptom checker, export, admin, email |
| `docs/Implementation_Plan.md` | Phased build plan |
| `docs/UI_Design_System_v2_DataLens.md` / `_v3_Happly.md` | Visual design system options |
| `docs/Screen_Inventory.md` | Full screen/route inventory |
| `docs/Datasets.md` | All dataset sources and licensing |
| `docs/Frontend.md` | Frontend architecture, flows, and security |
| `docs/Backend.md` | Backend architecture, flows, and security |
| `docs/Project_Structure.md` | Directory-by-directory structure guide |

## Security

This project stores user accounts, health-related prediction history, uploaded documents, and diagnostic images. Authentication itself is delegated to Better Auth (`docs/Auth_Service_Architecture.md`); FastAPI's own security posture — access control, data isolation, OWASP-aligned mitigations — is in `docs/Backend.md` §4 and `docs/Full_Scope_Expansion.md` §5. See `SECURITY.md` for how to report a vulnerability.

## License

See `LICENSE`. Third-party datasets retain their own licenses — see `docs/Datasets.md`.
