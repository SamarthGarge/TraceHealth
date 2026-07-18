"""
Per-disease data preprocessing for TraceHealth training scripts.

Each function takes a CSV filepath, loads/cleans the data, and returns:
    (X_scaled, y, feature_names, scaler)

The returned scaler is a fitted StandardScaler that must be saved alongside the
trained models so the backend can apply the same transform at inference time.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler


# ── Diabetes ───────────────────────────────────────────────────────────────────

def preprocess_diabetes(filepath):
    """
    Preprocess the Pima Indians Diabetes dataset (diabetes.csv).

    Columns: Pregnancies, Glucose, BloodPressure, SkinThickness, Insulin, BMI,
             DiabetesPedigreeFunction, Age, Outcome

    Cleaning:
        - Glucose, BloodPressure, SkinThickness, Insulin, BMI can have 0 values
          that are clinically impossible → replaced with column median.
        - StandardScaler applied to all features.
    """
    df = pd.read_csv(filepath)

    # Columns where 0 is clinically impossible — treat as missing
    zero_invalid = ["Glucose", "BloodPressure", "SkinThickness", "Insulin", "BMI"]
    for col in zero_invalid:
        df[col] = df[col].replace(0, np.nan)
        df[col] = df[col].fillna(df[col].median())

    feature_cols = [c for c in df.columns if c != "Outcome"]
    X = df[feature_cols].values
    y = df["Outcome"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    print(f"  Diabetes -- {len(df)} rows, {len(feature_cols)} features, "
          f"pos={y.sum():.0f} neg={len(y) - y.sum():.0f}")

    return X_scaled, y, feature_cols, scaler


# ── Heart Disease ──────────────────────────────────────────────────────────────

def preprocess_heart(filepath):
    """
    Preprocess the Cleveland Heart Disease dataset (heart_cleveland_upload.csv).

    Columns: age, sex, cp, trestbps, chol, fbs, restecg, thalach, exang,
             oldpeak, slope, ca, thal, condition

    Cleaning:
        - No missing values in this dataset.
        - StandardScaler applied to all features.
    """
    df = pd.read_csv(filepath)

    feature_cols = [c for c in df.columns if c != "condition"]
    X = df[feature_cols].values
    y = df["condition"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    print(f"  Heart -- {len(df)} rows, {len(feature_cols)} features, "
          f"pos={y.sum():.0f} neg={len(y) - y.sum():.0f}")

    return X_scaled, y, feature_cols, scaler


# ── Tuberculosis ───────────────────────────────────────────────────────────────

def preprocess_tb(filepath):
    """
    Preprocess the Tuberculosis Symptoms dataset (tuberculosis_symptoms.csv).

    The dataset contains ~1000 rows of TB-symptomatic patients with 13 binary
    symptom columns but **no explicit diagnosis target**. All rows appear to
    represent TB-positive cases.

    Strategy — Synthetic Negative Generation:
        1. All original rows → positive class (TB = 1)
        2. Generate ~500 synthetic "healthy controls" where each symptom is
           sampled independently from Bernoulli(p=0.15).
        3. Merge positives + negatives, shuffle.

    This gives the classifier real positive examples and statistically plausible
    negatives, producing meaningful SHAP feature attributions.

    Columns dropped: 'no' (row index), 'name' (PII).
    Gender encoded: Male → 1, Female → 0.
    Long column names shortened for SHAP readability.
    """
    df = pd.read_csv(filepath)

    # Drop non-feature columns
    df = df.drop(columns=["no", "name"], errors="ignore")

    # Clean column names — strip whitespace
    df.columns = [c.strip() for c in df.columns]

    # Encode gender
    df["gender"] = (
        df["gender"].str.strip().map({"Male": 1, "Female": 0}).fillna(0).astype(int)
    )

    # Rename verbose symptom columns to concise snake_case names
    rename_map = {
        "fever for two weeks": "fever_2wk",
        "coughing blood": "cough_blood",
        "sputum mixed with blood": "sputum_blood",
        "night sweats": "night_sweats",
        "chest pain": "chest_pain",
        "back pain in certain parts": "back_pain",
        "shortness of breath": "shortness_breath",
        "weight loss": "weight_loss",
        "body feels tired": "fatigue",
        "lumps that appear around the armpits and neck": "lymph_lumps",
        "cough and phlegm continuously for two weeks to four weeks": "cough_phlegm_2_4wk",
        "swollen lymph nodes": "swollen_lymph",
        "loss of appetite": "loss_appetite",
    }
    df = df.rename(columns=rename_map)

    feature_cols = list(df.columns)  # All remaining columns are features
    n_positives = len(df)

    # ── Generate synthetic negative cases ──────────────────────────────────
    n_negatives = int(n_positives * 0.5)  # ~500 controls
    rng = np.random.RandomState(42)

    # Symptom columns (everything except gender)
    symptom_cols = [c for c in feature_cols if c != "gender"]

    negatives = pd.DataFrame()
    negatives["gender"] = rng.choice([0, 1], size=n_negatives)
    for col in symptom_cols:
        # Low probability of each symptom in healthy controls
        negatives[col] = rng.binomial(1, 0.15, size=n_negatives)

    # Reorder columns to match feature_cols order
    negatives = negatives[feature_cols]

    # Merge: positives (label = 1), negatives (label = 0)
    X_pos = df[feature_cols].values
    X_neg = negatives[feature_cols].values
    X = np.vstack([X_pos, X_neg])
    y = np.concatenate([np.ones(n_positives), np.zeros(n_negatives)])

    # Shuffle
    shuffle_idx = rng.permutation(len(y))
    X = X[shuffle_idx]
    y = y[shuffle_idx]

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    print(f"  TB -- {n_positives} real positives + {n_negatives} synthetic negatives "
          f"= {len(y)} total, {len(feature_cols)} features")

    return X_scaled, y, feature_cols, scaler


# ── Lung Cancer ────────────────────────────────────────────────────────────────

def preprocess_cancer(filepath):
    """
    Preprocess the Lung Cancer Survey dataset (survey_lung_cancer.csv).

    Columns: GENDER, AGE, SMOKING, YELLOW_FINGERS, ANXIETY, PEER_PRESSURE,
             CHRONIC DISEASE, FATIGUE, ALLERGY, WHEEZING, ALCOHOL CONSUMING,
             COUGHING, SHORTNESS OF BREATH, SWALLOWING DIFFICULTY, CHEST PAIN,
             LUNG_CANCER

    Cleaning:
        - Strip whitespace from column names.
        - Replace spaces with underscores in column names.
        - Encode GENDER: M/MALE → 1, F/FEMALE → 0.
        - If symptom columns use 1/2 encoding (common variant), remap to 0/1.
        - Encode target: YES → 1, NO → 0.
        - StandardScaler applied.
    """
    df = pd.read_csv(filepath)

    # Clean column names — strip whitespace, replace spaces with underscores
    df.columns = [c.strip().replace(" ", "_") for c in df.columns]

    # Encode gender
    df["GENDER"] = (
        df["GENDER"]
        .str.strip()
        .str.upper()
        .map({"M": 1, "MALE": 1, "F": 0, "FEMALE": 0})
        .fillna(0)
        .astype(int)
    )

    # Encode target
    df["LUNG_CANCER"] = (
        df["LUNG_CANCER"]
        .str.strip()
        .str.upper()
        .map({"YES": 1, "NO": 0})
        .fillna(0)
        .astype(int)
    )

    # For symptom columns, remap 1/2 → 0/1 if the dataset uses that encoding
    symptom_cols = [
        c for c in df.columns if c not in ("GENDER", "AGE", "LUNG_CANCER")
    ]
    for col in symptom_cols:
        col_min, col_max = df[col].min(), df[col].max()
        if col_min >= 1 and col_max == 2:
            df[col] = df[col] - 1  # 1 → 0, 2 → 1

    feature_cols = [c for c in df.columns if c != "LUNG_CANCER"]
    X = df[feature_cols].values
    y = df["LUNG_CANCER"].values

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    print(f"  Cancer -- {len(df)} rows, {len(feature_cols)} features, "
          f"pos={y.sum():.0f} neg={len(y) - y.sum():.0f}")

    return X_scaled, y, feature_cols, scaler
