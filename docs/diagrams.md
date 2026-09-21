# TraceHealth — Software Engineering Diagrams

All diagrams for the TraceHealth Explainable AI Health Screening platform, rendered using Mermaid.

---

## 1. Use Case Diagram

```mermaid
flowchart LR
    subgraph Actors
        G["Guest User"]
        U["Authenticated User"]
        A["Admin"]
        E["External Systems"]
    end

    subgraph UC_Public["Public Use Cases"]
        UC1["View Landing Page"]
        UC2["View Health Resources"]
        UC3["View About Models"]
        UC4["Run Disease Prediction"]
        UC5["Run Symptom Check"]
        UC6["Sign Up"]
        UC7["Log In (Email)"]
        UC8["Log In (Google OAuth)"]
        UC9["Forgot / Reset Password"]
    end

    subgraph UC_Auth["Authenticated Use Cases"]
        UC10["View Dashboard"]
        UC11["View Prediction History"]
        UC12["View Prediction Detail + SHAP"]
        UC13["Delete Prediction"]
        UC14["Upload Medical File"]
        UC15["Download / Delete Upload"]
        UC16["Analyze Uploaded Report"]
        UC17["Export Data (CSV / JSON / PDF)"]
        UC18["Edit Profile"]
        UC19["Delete Account"]
        UC20["Log Out"]
    end

    subgraph UC_Admin["Admin Use Cases"]
        UC21["View Platform Stats"]
        UC22["Browse All Users"]
        UC23["View User Detail"]
        UC24["View Recent Predictions"]
    end

    G --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 & UC8 & UC9

    U --> UC4 & UC5 & UC10 & UC11 & UC12 & UC13
    U --> UC14 & UC15 & UC16 & UC17 & UC18 & UC19 & UC20

    A --> UC21 & UC22 & UC23 & UC24

    E --> |"MongoDB Atlas"| UC4
    E --> |"Google OAuth"| UC8
    E --> |"Gmail SMTP"| UC9
    E --> |"ML Models (sklearn, XGBoost)"| UC4
```

---

## 2. Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS {
        ObjectId _id PK "Auto-generated"
        string name "User's full name"
        string email UK "Unique, indexed"
        string password_hash "bcrypt hash (never exposed)"
        string role "user | admin"
        boolean consentDataStorage "GDPR-style data consent"
        string google_id "Google OAuth ID (nullable)"
        datetime createdAt "Account creation timestamp"
    }

    PREDICTIONS {
        ObjectId _id PK "Auto-generated"
        string user_id FK "References USERS._id"
        string disease "diabetes | heart | tb | cancer"
        dict features "Input feature key-value pairs"
        list models "Array of ModelResult objects"
        float ensemble_probability "Averaged probability 0-1"
        string ensemble_risk_level "Low | Moderate | High"
        datetime created_at "Prediction timestamp"
    }

    UPLOADS_FILES {
        ObjectId _id PK "GridFS file ID"
        string filename "Original client filename"
        string content_type "Validated MIME type"
        int length "File size in bytes"
        datetime uploadDate "GridFS upload timestamp"
        dict metadata "Contains user_id, original_name"
    }

    UPLOADS_CHUNKS {
        ObjectId _id PK "Auto-generated"
        ObjectId files_id FK "References UPLOADS_FILES._id"
        int n "Chunk sequence number"
        binary data "File chunk binary data"
    }

    MODEL_METADATA {
        ObjectId _id PK "Auto-generated"
        string disease "Disease key"
        string model_name "Display name"
        list features "Ordered feature names"
        dict metrics "accuracy, precision, recall, f1"
        string training_date "When model was trained"
    }

    PASSWORD_RESET_TOKENS {
        ObjectId _id PK "Auto-generated"
        string email "User's email"
        string token_hash "SHA-256 hash of reset token"
        datetime expires_at "Token expiry (TTL indexed)"
        datetime created_at "Token creation timestamp"
    }

    USERS ||--o{ PREDICTIONS : "has many"
    USERS ||--o{ UPLOADS_FILES : "uploads many"
    USERS ||--o{ PASSWORD_RESET_TOKENS : "requests"
    UPLOADS_FILES ||--|{ UPLOADS_CHUNKS : "stored as"
    MODEL_METADATA ||--o{ PREDICTIONS : "used by"
```

---

## 3. UML Class Diagram

```mermaid
classDiagram
    class FastAPIApp {
        +lifespan(app)
        +CORSMiddleware
        +SecurityHeadersMiddleware
        +RateLimiter
    }

    class Settings {
        +str MONGO_URI
        +str JWT_SECRET
        +str FRONTEND_ORIGIN
        +str ENVIRONMENT
        +str MODELS_DIR
        +allowed_origins() list
        +is_production() bool
        +cookie_secure() bool
    }

    class Database {
        +init_db()
        +close_db()
        +get_db() AsyncIOMotorDatabase
        +get_gridfs() GridFSBucket
        -_create_indexes()
        -_seed_model_metadata()
    }

    class AuthRouter {
        +signup(SignupRequest) TokenResponse
        +login(LoginRequest) TokenResponse
        +logout() Message
        +me() UserOut
        +refresh() TokenResponse
        +forgot_password(ForgotPasswordRequest) Message
        +reset_password(ResetPasswordRequest) Message
        +google_redirect() RedirectResponse
        +google_callback() RedirectResponse
        +admin_login(LoginRequest) TokenResponse
        +admin_setup() Message
    }

    class PredictRouter {
        +predict(disease, PredictRequest) PredictResponse
        +get_features(disease) FeaturesResponse
    }

    class HistoryRouter {
        +list_history(skip, limit, disease) HistoryList
        +get_history_detail(id) PredictionDoc
        +delete_history(id) Message
    }

    class UploadsRouter {
        +upload_file(file) UploadItem
        +list_uploads(skip, limit) UploadListResponse
        +download_file(file_id) StreamingResponse
        +delete_file(file_id) Message
    }

    class ExportRouter {
        +export_predictions(format, date_range) File
        +export_pdf(date_range, disease) PDF
        +export_single(id, format) File
    }

    class AdminRouter {
        +get_stats() StatsResponse
        +list_users(skip, limit) UserList
        +get_user(user_id) UserDetail
        +recent_predictions(limit) PredictionList
    }

    class SymptomCheckRouter {
        +check_symptoms(SymptomCheckRequest) SymptomCheckResponse
    }

    class ModelLoader {
        +DISEASES: list
        +load_all_models()
        +get_model(disease, model_key) Model
        +get_scaler(disease) Scaler
        +get_features(disease) list
        +is_loaded() bool
    }

    class ModelComparison {
        +compare_models(disease, features) list~ModelResult~
        -_run_single_model(model, scaler, features) ModelResult
        -_compute_shap(model, scaler, features) list~ShapFeature~
    }

    class JWTCore {
        +create_access_token(user_id, role) str
        +create_refresh_token(user_id) str
        +verify_refresh_token(token) dict
        +create_reset_token(email) str
        +verify_reset_token(token) str
    }

    class SecurityDependencies {
        +require_auth(request) dict
        +require_admin(request) dict
        +get_current_user(request) dict|None
        +user_has_consented(user) bool
    }

    FastAPIApp --> Settings
    FastAPIApp --> Database
    FastAPIApp --> AuthRouter
    FastAPIApp --> PredictRouter
    FastAPIApp --> HistoryRouter
    FastAPIApp --> UploadsRouter
    FastAPIApp --> ExportRouter
    FastAPIApp --> AdminRouter
    FastAPIApp --> SymptomCheckRouter
    PredictRouter --> ModelLoader
    PredictRouter --> ModelComparison
    AuthRouter --> JWTCore
    AuthRouter --> SecurityDependencies
    HistoryRouter --> SecurityDependencies
    UploadsRouter --> SecurityDependencies
    ExportRouter --> SecurityDependencies
    AdminRouter --> SecurityDependencies
```

---

## 4. Data Flow Diagram — Level 0 (Context)

```mermaid
flowchart LR
    User(["User / Patient"])
    Admin(["Admin"])
    Google(["Google OAuth"])
    Gmail(["Gmail SMTP"])
    MongoDB[("MongoDB Atlas")]

    User -->|"Health data, credentials, symptoms"| TH["⚕️ TraceHealth System"]
    TH -->|"Risk predictions, SHAP explanations,\nreports, history"| User

    Admin -->|"Admin credentials"| TH
    TH -->|"Platform stats, user list,\nrecent predictions"| Admin

    TH <-->|"OAuth tokens"| Google
    TH -->|"Reset emails"| Gmail
    TH <-->|"CRUD operations"| MongoDB
```

---

## 5. Data Flow Diagram — Level 1 (Subsystems)

```mermaid
flowchart TB
    User(["User"])
    Admin(["Admin"])
    Google(["Google OAuth"])
    Gmail(["Gmail SMTP"])

    subgraph TraceHealth["TraceHealth System"]
        P1["1.0\nAuthentication\nService"]
        P2["2.0\nPrediction\nEngine"]
        P3["3.0\nHistory\nManager"]
        P4["4.0\nFile Upload\nService"]
        P5["5.0\nExport\nService"]
        P6["6.0\nAdmin\nDashboard"]
        P7["7.0\nSymptom\nChecker"]

        DS1[("D1: Users")]
        DS2[("D2: Predictions")]
        DS3[("D3: Uploads\n(GridFS)")]
        DS4[("D4: Model\nMetadata")]
    end

    User -->|"Credentials"| P1
    P1 -->|"JWT tokens, user profile"| User
    P1 <-->|"OAuth flow"| Google
    P1 -->|"Reset email"| Gmail
    P1 <--> DS1

    User -->|"Health features"| P2
    P2 -->|"Risk scores + SHAP"| User
    P2 --> DS2
    P2 <--> DS4

    User -->|"View/delete requests"| P3
    P3 -->|"Prediction list/detail"| User
    P3 <--> DS2

    User -->|"Medical files"| P4
    P4 -->|"File list, downloads"| User
    P4 <--> DS3

    User -->|"Export request"| P5
    P5 -->|"CSV / JSON / PDF"| User
    P5 <--> DS2

    Admin -->|"Admin credentials"| P1
    Admin -->|"Stats queries"| P6
    P6 -->|"Platform stats, user list"| Admin
    P6 <--> DS1
    P6 <--> DS2

    User -->|"Symptom answers"| P7
    P7 -->|"Referral suggestions"| User
```

---

## 6. Data Flow Diagram — Level 2 (Prediction Subsystem Detail)

```mermaid
flowchart TB
    User(["User"])

    subgraph P2["2.0 Prediction Engine"]
        P2_1["2.1\nInput\nValidation"]
        P2_2["2.2\nFeature\nPreprocessing"]
        P2_3["2.3\nModel\nExecution"]
        P2_4["2.4\nSHAP\nComputation"]
        P2_5["2.5\nEnsemble\nAggregation"]
        P2_6["2.6\nHistory\nPersistence"]
    end

    DS_Models[("Model\nArtifacts\n(.joblib)")]
    DS_Scalers[("Feature\nScalers")]
    DS_Predictions[("D2: Predictions")]
    DS_Metadata[("D4: Model\nMetadata")]

    User -->|"disease + features dict"| P2_1
    P2_1 -->|"validated features"| P2_2
    DS_Metadata -->|"expected feature names"| P2_1
    P2_2 -->|"scaled feature vector"| P2_3
    DS_Scalers -->|"scaler params"| P2_2
    P2_3 -->|"3 probability scores"| P2_5
    DS_Models -->|"LR, RF, XGB models"| P2_3
    P2_3 -->|"model + input"| P2_4
    P2_4 -->|"SHAP attributions"| P2_5
    P2_5 -->|"ensemble result"| P2_6
    P2_6 -->|"save if consented"| DS_Predictions
    P2_5 -->|"PredictResponse\n(3 models + ensemble + SHAP)"| User
```

---

## 7. Data Dictionary

### 7.1 `users` Collection

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `_id` | ObjectId | PK, auto-generated | Unique user identifier |
| `name` | String | Required, 2–80 chars | User's full display name |
| `email` | String | Required, unique index | Email address (login credential) |
| `password_hash` | String | Required (null for Google OAuth users) | bcrypt-hashed password (never exposed in API responses) |
| `role` | String | Enum: `"user"`, `"admin"` | Authorization role. Default: `"user"` |
| `consentDataStorage` | Boolean | Required | Whether user consents to storing prediction history |
| `google_id` | String | Nullable, unique if present | Google account ID for OAuth-linked accounts |
| `createdAt` | DateTime | Auto-set on creation | Account registration timestamp (UTC) |

**Indexes:**
- `email` — unique index (prevents duplicate accounts)

---

### 7.2 `predictions` Collection

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `_id` | ObjectId | PK, auto-generated | Unique prediction identifier |
| `user_id` | String | FK → `users._id`, indexed | The user who ran this prediction |
| `disease` | String | Enum: `"diabetes"`, `"heart"`, `"tb"`, `"cancer"` | Disease model used |
| `features` | Object | Required | Input feature key-value pairs (e.g., `{"Glucose": 148, "BMI": 33.6}`) |
| `models` | Array[Object] | Required, exactly 3 items | Results from each ML model (see sub-table below) |
| `ensemble_probability` | Float | Range: 0.0–1.0 | Average probability across all 3 models |
| `ensemble_risk_level` | String | Enum: `"Low"`, `"Moderate"`, `"High"` | Risk classification based on ensemble probability |
| `created_at` | DateTime | Auto-set on creation | Prediction execution timestamp (UTC) |

**Nested: `models[]` sub-document**

| Field | Type | Description |
|-------|------|-------------|
| `model_key` | String | Identifier: `"lr"`, `"rf"`, `"xgb"` |
| `model_name` | String | Display name: `"Logistic Regression"`, `"Random Forest"`, `"XGBoost"` |
| `probability` | Float | Positive-class probability from this model (0.0–1.0) |
| `risk_level` | String | Risk category for this individual model |
| `shap_top` | Array[Object] | Top SHAP feature attributions, sorted by abs value descending |

**Nested: `shap_top[]` sub-document**

| Field | Type | Description |
|-------|------|-------------|
| `feature` | String | Feature name (e.g., `"Glucose"`) |
| `value` | Float | Raw input value (unscaled) |
| `shap_value` | Float | SHAP contribution to prediction |
| `direction` | String | `"increases_risk"` or `"decreases_risk"` |

**Indexes:**
- `(user_id, created_at)` — compound index for fast per-user history queries

---

### 7.3 `uploads.files` Collection (GridFS)

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `_id` | ObjectId | PK, auto-generated | GridFS file identifier |
| `filename` | String | Required | Sanitized original filename |
| `length` | Integer | Auto-set by GridFS | File size in bytes |
| `chunkSize` | Integer | Default: 261120 | GridFS chunk size |
| `uploadDate` | DateTime | Auto-set by GridFS | Upload timestamp |
| `contentType` | String | Validated: PDF, PNG, JPEG, CSV | MIME type verified from magic bytes (not client-supplied) |
| `metadata.user_id` | String | FK → `users._id` | Uploading user's ID |
| `metadata.original_name` | String | — | Client-provided filename (for display only) |

**Indexes:**
- `metadata.user_id` — for listing a user's uploads

### 7.4 `uploads.chunks` Collection (GridFS)

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `_id` | ObjectId | PK, auto-generated | Chunk identifier |
| `files_id` | ObjectId | FK → `uploads.files._id` | Parent file reference |
| `n` | Integer | Sequence number, 0-indexed | Chunk order within the file |
| `data` | Binary | Max 261120 bytes per chunk | Raw file binary data |

---

### 7.5 `model_metadata` Collection

| Field | Type | Constraints | Description |
|-------|------|------------|-------------|
| `_id` | ObjectId | PK, auto-generated | Metadata document ID |
| `disease` | String | Enum: `"diabetes"`, `"heart"`, `"tb"`, `"cancer"` | Which disease this metadata describes |
| `display_name` | String | — | Human-readable disease name |
| `features` | Array[String] | Ordered | Expected input feature names for this disease model |
| `models` | Object | 3 keys: `lr`, `rf`, `xgb` | Per-model evaluation metrics |
| `models.*.accuracy` | Float | 0.0–1.0 | Test set accuracy |
| `models.*.precision` | Float | 0.0–1.0 | Test set precision |
| `models.*.recall` | Float | 0.0–1.0 | Test set recall |
| `models.*.f1` | Float | 0.0–1.0 | Test set F1 score |
| `training_samples` | Integer | — | Number of training samples used |
| `test_samples` | Integer | — | Number of test samples used |

---

## 8. Sequence Diagram — Disease Prediction Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend as React Frontend
    participant API as FastAPI Backend
    participant Auth as Auth Middleware
    participant ML as Model Loader
    participant SHAP as SHAP Engine
    participant DB as MongoDB

    User->>Frontend: Enter health parameters
    User->>Frontend: Click "Run Prediction"

    Frontend->>API: POST /api/predict/{disease}<br/>{features: {...}}
    API->>Auth: Extract JWT from cookie
    Auth-->>API: user_id (or null for guest)

    API->>API: Validate disease key
    API->>ML: get_features(disease)
    ML-->>API: Expected feature names
    API->>API: Validate & order input features

    API->>ML: get_model(disease, "lr")
    API->>ML: get_model(disease, "rf")
    API->>ML: get_model(disease, "xgb")
    ML-->>API: 3 trained models + scaler

    API->>API: Preprocess (scale) features

    loop For each model (LR, RF, XGB)
        API->>ML: model.predict_proba(features)
        ML-->>API: probability score
        API->>SHAP: Compute SHAP values
        SHAP-->>API: Feature attributions
    end

    API->>API: Compute ensemble (average 3 probabilities)
    API->>API: Classify risk level

    alt User is authenticated AND has consent
        API->>DB: predictions.insert_one(result)
        DB-->>API: prediction_id
    end

    API-->>Frontend: PredictResponse {models[], ensemble, shap_top[]}
    Frontend-->>User: Display risk cards + SHAP charts
```

---

## 9. Sequence Diagram — Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend as React Frontend
    participant API as FastAPI Backend
    participant DB as MongoDB
    participant Gmail as Gmail SMTP

    rect rgb(240, 248, 255)
        Note over User, DB: Sign Up Flow
        User->>Frontend: Fill signup form
        Frontend->>API: POST /api/auth/signup<br/>{name, email, password, consent}
        API->>DB: Check email uniqueness
        DB-->>API: No duplicate found
        API->>API: Hash password (bcrypt)
        API->>DB: users.insert_one(user_doc)
        DB-->>API: user_id
        API->>API: Create access + refresh JWT
        API-->>Frontend: Set httpOnly cookies + UserOut
        Frontend-->>User: Redirect to /dashboard
    end

    rect rgb(255, 248, 240)
        Note over User, DB: Login Flow
        User->>Frontend: Enter credentials
        Frontend->>API: POST /api/auth/login<br/>{email, password}
        API->>DB: users.find_one({email})
        DB-->>API: user_doc (with password_hash)
        API->>API: Verify bcrypt hash
        API->>API: Create access + refresh JWT
        API-->>Frontend: Set httpOnly cookies + UserOut
        Frontend-->>User: Redirect to /dashboard
    end

    rect rgb(248, 255, 240)
        Note over User, Gmail: Password Reset Flow
        User->>Frontend: Enter email on forgot-password
        Frontend->>API: POST /api/auth/forgot-password
        API->>API: Generate reset token
        API->>DB: Store token_hash + expiry
        API->>Gmail: Send reset link email
        Gmail-->>User: Email with reset link
        User->>Frontend: Click link, enter new password
        Frontend->>API: POST /api/auth/reset-password<br/>{token, new_password}
        API->>DB: Verify token_hash, check expiry
        API->>API: Hash new password (bcrypt)
        API->>DB: Update user's password_hash
        API-->>Frontend: Success message
    end
```

---

## 10. Activity Diagram — End-to-End User Workflow

```mermaid
flowchart TD
    Start(["Start"]) --> Visit["Visit TraceHealth Landing Page"]
    Visit --> HasAccount{"Has an account?"}

    HasAccount -->|No| Signup["Create Account\n(Email or Google)"]
    HasAccount -->|Yes| Login["Log In\n(Email or Google)"]

    Signup --> Dashboard["View Dashboard"]
    Login --> Dashboard

    Dashboard --> Choose{"What to do?"}

    Choose -->|"Check Symptoms"| Symptom["Answer Symptom\nQuestionnaire"]
    Symptom --> SymResult["View Referral\nSuggestions"]
    SymResult --> RunPred{"Run a prediction?"}
    RunPred -->|Yes| SelectDisease
    RunPred -->|No| Choose

    Choose -->|"Run Prediction"| SelectDisease["Select Disease\n(Diabetes/Heart/TB/Cancer)"]
    SelectDisease --> EnterData["Enter Health\nParameters"]
    EnterData --> Submit["Submit for Prediction"]
    Submit --> ViewResults["View Risk Scores\nfrom 3 ML Models"]
    ViewResults --> ViewSHAP["Explore SHAP\nFeature Impact"]

    ViewSHAP --> SavedQ{"Saved to history?"}
    SavedQ -->|"Yes (consented)"| ViewHistory["View in\nPrediction History"]
    SavedQ -->|"No (guest/no consent)"| Choose

    Choose -->|"View History"| ViewHistory
    ViewHistory --> HistoryAction{"Action?"}
    HistoryAction -->|"View Detail"| HistDetail["View Full Prediction\n+ SHAP Breakdown"]
    HistoryAction -->|"Delete"| DeletePred["Delete Prediction"]
    HistoryAction -->|"Export"| ExportData

    Choose -->|"Upload File"| Upload["Upload Medical\nReport (PDF/Image)"]
    Upload --> Analyze["AI Analyze\nUploaded Report"]
    Analyze --> Choose

    Choose -->|"Export Data"| ExportData["Export Predictions\n(CSV / JSON / PDF)"]
    ExportData --> Download["Download File"]
    Download --> Choose

    Choose -->|"View Resources"| Resources["Browse Health\nResources by Disease"]
    Resources --> Choose

    Choose -->|"Edit Profile"| Profile["Update Name / Email\nor Delete Account"]
    Profile --> Choose

    Choose -->|"Log Out"| Logout["Clear Auth Cookies"]
    Logout --> End(["End"])

    HistDetail --> Choose
    DeletePred --> ViewHistory
```

---

> [!NOTE]
> All diagrams use **Mermaid** syntax and render directly in GitHub, VS Code, Notion, and any Markdown renderer that supports Mermaid. To export as PNG/SVG, use [mermaid.live](https://mermaid.live) or the VS Code Mermaid preview extension.
