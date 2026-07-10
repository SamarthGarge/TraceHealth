# HealthRisk Predictor — Dataset Inventory (v2.0 — Full Scope)

**Version:** v2.0 | **Companion to:** PRD v2.0, TRD v2.0, Full-Scope Expansion v3.0 | **Date:** 2026-07-06 | **Supersedes:** Dataset Inventory v1.0

---

## 1. How to Read This Document

Following the Full-Scope Expansion (v3.0), every dataset previously logged as "future/out-of-scope" is now an active MVP dataset. There is no longer a scope split in this document — everything below is used by a real training script or a real feature, not gathered for later. The one non-dataset addition, the Framingham Risk Score, is included for completeness even though it's a formula, not a trained model.

---

## 2. Tabular Datasets (Structured ML Models)

| Disease | Dataset | Source | Format | Size | Target Variable |
|---|---|---|---|---|---|
| Diabetes | Pima Indians Diabetes Database | [kaggle.com/datasets/uciml/pima-indians-diabetes-database](https://www.kaggle.com/datasets/uciml/pima-indians-diabetes-database) | CSV | 768 rows, 8 features + target | `Outcome` (0/1) |
| Heart Disease | Heart Disease Cleveland UCI (re-processed) | [kaggle.com/datasets/cherngs/heart-disease-cleveland-uci](https://www.kaggle.com/datasets/cherngs/heart-disease-cleveland-uci) | CSV | 303 rows, 13 features + target | `condition`/`target` (0/1) |
| Tuberculosis | Tuberculosis Symptoms Dataset | [kaggle.com/datasets/victorcaelina/tuberculosis-symptoms](https://www.kaggle.com/datasets/victorcaelina/tuberculosis-symptoms) | CSV | ~1,000 rows, 13 binary symptom features + demographics | TB diagnosis (0/1) |
| Lung Cancer | Survey Lung Cancer | [kaggle.com/datasets/ajisofyan/survey-lung-cancer](https://www.kaggle.com/datasets/ajisofyan/survey-lung-cancer) | CSV | 309 rows, 15 lifestyle/symptom features + target | `LUNG_CANCER` (Yes/No) |

## 3. Image Datasets (CNN Vision Models — Full-Scope Expansion §2.1)

| Disease | Dataset | Source | Format | Size | Used For |
|---|---|---|---|---|---|
| Tuberculosis | TB Chest X-ray Database | [kaggle.com/datasets/tawsifurrahman/tuberculosis-tb-chest-xray-dataset](https://www.kaggle.com/datasets/tawsifurrahman/tuberculosis-tb-chest-xray-dataset) | PNG | ~3,500 TB + ~3,500 normal chest X-rays | `tb_xray_model` (binary CNN) |
| Lung Cancer | IQ-OTH/NCCD Lung Cancer Dataset | [kaggle.com/datasets/hamdallak/the-iqothnccd-lung-cancer-dataset](https://www.kaggle.com/datasets/hamdallak/the-iqothnccd-lung-cancer-dataset) | JPEG (from DICOM) | 1,097–1,190 CT slices, 110 cases (benign/malignant/normal) | `cancer_image_model` — CT variant |
| Lung Cancer | Lung and Colon Cancer Histopathological Images (LC25000) | [kaggle.com/datasets/andrewmvd/lung-and-colon-cancer-histopathological-images](https://www.kaggle.com/datasets/andrewmvd/lung-and-colon-cancer-histopathological-images) | JPEG | 25,000 images, 5 classes (only the 3 lung classes used: adenocarcinoma, squamous cell carcinoma, benign) | `cancer_image_model` — histopathology variant |

**Note on class imbalance:** the IQ-OTH/NCCD dataset is imbalanced (55 normal, 40 malignant, 15 benign cases) — the training script must apply class weighting or oversampling, not just report accuracy on the imbalanced set as-is.

## 4. Text/NLP Dataset (Symptom Checker — Full-Scope Expansion §2.4)

| Purpose | Dataset | Source | Format | Size |
|---|---|---|---|---|
| Free-text symptom description -> disease routing suggestion | Symptom2Disease | [kaggle.com/datasets/niyarrbarman/symptom2disease](https://www.kaggle.com/datasets/niyarrbarman/symptom2disease) | CSV (text + label) | 1,200 rows, 24 disease labels (only the 4 in-scope diseases are used as routing targets; other labels are used as negative/other-disease examples so the classifier can say "none of these 4" too) |

## 5. Clinical Formula (Not a Dataset — Full-Scope Expansion §2.2)

| Item | Source | Notes |
|---|---|---|
| Framingham 10-Year CHD Risk Score | Published Framingham Heart Study coefficients (D'Agostino et al., general cardiovascular risk profile) | No training data required — implemented as a direct formula (`core/framingham.py`), not a trained model. Reference coefficients are publicly published in the peer-reviewed Framingham general CVD risk literature. |

---

## 6. Where These Live in the Repository

```
training/data/raw/
├── tabular/
│   ├── diabetes.csv
│   ├── heart_disease.csv
│   ├── tuberculosis_symptoms.csv
│   └── lung_cancer_survey.csv
├── images/
│   ├── tb_chest_xray/            (downloaded manually — multi-GB, git-ignored)
│   ├── iqothnccd_ct/               (downloaded manually — git-ignored)
│   └── lc25000_histopathology/       (downloaded manually — git-ignored; only lung_* classes used)
└── text/
    └── symptom2disease.csv
```
All large binary datasets (`images/`) remain git-ignored regardless of scope status — that was always a size/practicality decision, not a scope decision. Each image folder keeps its `SOURCES.md` pointing to the download link so a fresh clone can reconstruct the dataset locally.

## 7. Licensing Note

All datasets are public and permissively licensed for research/portfolio use (Kaggle/UCI/CC-style terms). The Framingham formula coefficients are published, peer-reviewed, and freely reimplementable — this project does not use any proprietary risk-calculator library. Verify each Kaggle dataset's specific license tag before any commercial redistribution (not a concern for this project's educational scope, but worth knowing).

## 8. Summary Table — Full Scope Status

| Dataset | Modality | Status |
|---|---|---|
| Pima Indians Diabetes | Tabular | In scope |
| Heart Disease Cleveland UCI | Tabular | In scope |
| Tuberculosis Symptoms | Tabular | In scope |
| Survey Lung Cancer | Tabular | In scope |
| TB Chest X-ray Database | Image | In scope |
| IQ-OTH/NCCD Lung Cancer CT | Image | In scope |
| LC25000 Histopathology (lung classes) | Image | In scope |
| Symptom2Disease | Text/NLP | In scope |
| Framingham coefficients | Formula (not a dataset) | In scope |
