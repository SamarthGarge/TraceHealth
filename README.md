# TraceHealth

> **Educational tool only.** This application does not provide medical diagnoses. Always consult a qualified healthcare professional for medical concerns.

Explainable, multi-disease health risk screening — Diabetes, Heart Disease, Tuberculosis, and Lung Cancer — combining tabular ML (Logistic Regression, Random Forest, XGBoost), computer vision (CNN + Grad-CAM for TB X-ray and Lung Cancer CT), OCR-powered AI Report Analysis, a free-text symptom router, and a full-stack architecture with accounts, history, file uploads, PDF export, and admin analytics.

## Features

| Feature | Description |
|---------|-------------|
| 🧠 **Multi-model Predictions** | Logistic Regression, Random Forest, and XGBoost run simultaneously |
| 📊 **SHAP Explainability** | Every prediction shows which factors drove the score |
| 🖼️ **Image-based Screening** | Upload TB X-rays or lung CT scans for CNN + Grad-CAM analysis |
| 🔬 **AI Report Analysis** | Upload a lab report (PDF/image); OCR extracts markers and gives dietary recommendations |
| 💬 **Symptom Checker** | Free-text symptom input routes to the most likely condition |
| 📜 **History & Export** | Full prediction history with CSV, JSON, and PDF export |
| 🔒 **Privacy First** | httpOnly JWT cookies, per-user data isolation, explicit consent required |
| ⚡ **Persistent Sessions** | Zustand + localStorage — no re-login on page refresh |

## Architecture

- **Frontend:** React 18 + Vite, Tailwind CSS, Zustand (persistent auth state)
- **Backend:** FastAPI (Python) — ML inference, auth, history, uploads, OCR analysis, export, admin
- **Database:** MongoDB Atlas (M0 free tier)
- **Tabular ML:** scikit-learn, XGBoost, SHAP
- **Vision ML:** PyTorch (transfer learning), Grad-CAM
- **OCR/NLP:** Tesseract, pdfplumber, rule-based health marker engine
- **Auth:** JWT httpOnly cookies — no external auth service

## Repository Structure

```
TraceHealth/
├── frontend/      React SPA (Vite + Tailwind + Zustand)
├── backend/       FastAPI REST API (ML, auth, uploads, OCR, export, admin)
├── training/      Offline ML training pipeline
├── models/        Trained model artifacts (git-ignored, generated locally)
├── docs/          PRD, TRD, Backend and Frontend architecture docs
└── .github/       CI workflows (backend + frontend)
```

## Getting Started

### Prerequisites

- Node.js 20+ (frontend)
- Python 3.11+ (backend and training)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) connection string (free M0 tier)
- Tesseract OCR installed locally (`apt install tesseract-ocr` / `brew install tesseract` / [Windows installer](https://github.com/UB-Mannheim/tesseract/wiki))
- GPU access recommended (not required) for training vision models — a free Colab notebook works

### Option A — Docker (recommended for production)

```bash
# 1. Clone the repo
git clone https://github.com/SamarthGarge/TraceHealth.git
cd TraceHealth

# 2. Configure environment variables
cp backend/.env.example backend/.env
# Edit backend/.env — fill in MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# 3. Train models (one-time — see training/ folder)
# OR copy pre-trained models into the models/ directory

# 4. Start all services
VITE_API_BASE_URL=http://localhost:8000 docker compose up --build

# App will be available at http://localhost (nginx on port 80)
```

### Option B — Local Development

#### 1. Train the models (one-time, offline)
```bash
cd training
pip install -r requirements.txt

# Tabular models
python train_diabetes.py && python train_heart.py
python train_tb.py && python train_cancer.py

# Vision models (see docs/Datasets.md for image dataset download links)
python train_tb_image.py
python train_cancer_image.py

# Symptom classifier
python train_symptom_classifier.py
```

#### 2. Run the backend
```bash
cd backend
cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

#### 3. Run the frontend
```bash
cd frontend
cp .env.example .env   # set VITE_API_BASE_URL=http://localhost:8000
npm install
npm run dev
```

### First-time Admin Setup

After starting the backend with `ADMIN_EMAIL` and `ADMIN_PASSWORD` set in `.env`:

```bash
curl -X POST http://localhost:8000/api/auth/admin/setup
```

Then sign in at `/admin/login` using those credentials.

## Deployment (Vercel + Render)

### Backend → Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Connect your GitHub repository.
3. Set **Root Directory** to `backend`.
4. Set **Runtime** to `Docker`.
5. Add all environment variables from `backend/.env.example` in the Render dashboard.
6. Deploy. Copy the service URL (e.g., `https://tracehealth-api.onrender.com`).

### Frontend → Vercel
1. Import the repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Add environment variable: `VITE_API_BASE_URL` = your Render backend URL.
4. Deploy.

## Documentation

| Document | Purpose |
|---------|---------|
| `docs/PRD.md` | Product requirements |
| `docs/TRD.md` | Core technical architecture |
| `docs/Backend.md` | Backend architecture, API, security |
| `docs/Frontend.md` | Frontend architecture, flows |
| `docs/Datasets.md` | Dataset sources and licensing |
| `SECURITY.md` | Security policy and vulnerability reporting |

## Security

This project stores user accounts, health-related prediction history, uploaded documents, and diagnostic images. All security measures — httpOnly JWT cookies, bcrypt password hashing, rate limiting, magic-byte file validation, OWASP-aligned headers, and per-user data isolation — are documented in [`SECURITY.md`](SECURITY.md) and `docs/Backend.md §4`.

## License

See [`LICENSE`](LICENSE). Third-party datasets retain their own licenses — see `docs/Datasets.md`.
