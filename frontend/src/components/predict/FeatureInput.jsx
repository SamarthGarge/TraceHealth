import React from "react";

/**
 * FeatureInput — labeled numeric input for a single model feature.
 * Shows the feature name as a label and an optional unit hint.
 */

// Human-readable labels & units for known feature keys
const FEATURE_META = {
  // Diabetes
  Pregnancies:              { label: "Pregnancies",                   unit: "" },
  Glucose:                  { label: "Glucose",                       unit: "mg/dL" },
  BloodPressure:            { label: "Blood Pressure",                unit: "mmHg" },
  SkinThickness:            { label: "Skin Thickness",                unit: "mm" },
  Insulin:                  { label: "Insulin",                       unit: "µU/mL" },
  BMI:                      { label: "BMI",                           unit: "kg/m²" },
  DiabetesPedigreeFunction: { label: "Diabetes Pedigree Function",    unit: "" },
  Age:                      { label: "Age",                           unit: "years" },
  // Heart
  age:                      { label: "Age",                           unit: "years" },
  sex:                      { label: "Sex (1=M, 0=F)",               unit: "" },
  cp:                       { label: "Chest Pain Type (0–3)",         unit: "" },
  trestbps:                 { label: "Resting Blood Pressure",        unit: "mmHg" },
  chol:                     { label: "Serum Cholesterol",             unit: "mg/dL" },
  fbs:                      { label: "Fasting Blood Sugar >120",      unit: "(0/1)" },
  restecg:                  { label: "Resting ECG (0–2)",             unit: "" },
  thalach:                  { label: "Max Heart Rate",                unit: "bpm" },
  exang:                    { label: "Exercise Induced Angina",       unit: "(0/1)" },
  oldpeak:                  { label: "ST Depression",                 unit: "" },
  slope:                    { label: "Slope of ST (0–2)",             unit: "" },
  ca:                       { label: "Major Vessels (0–4)",           unit: "" },
  thal:                     { label: "Thalassemia (0–3)",             unit: "" },
  // TB
  gender:                   { label: "Gender (1=M, 0=F)",             unit: "" },
  fever_2wk:                { label: "Fever ≥2 weeks",                unit: "(0/1)" },
  cough_blood:              { label: "Cough with Blood",              unit: "(0/1)" },
  sputum_blood:             { label: "Sputum with Blood",             unit: "(0/1)" },
  night_sweats:             { label: "Night Sweats",                  unit: "(0/1)" },
  chest_pain:               { label: "Chest Pain",                    unit: "(0/1)" },
  back_pain:                { label: "Back Pain",                     unit: "(0/1)" },
  shortness_breath:         { label: "Shortness of Breath",           unit: "(0/1)" },
  weight_loss:              { label: "Weight Loss",                   unit: "(0/1)" },
  fatigue:                  { label: "Fatigue",                       unit: "(0/1)" },
  lymph_lumps:              { label: "Lymph Lumps",                   unit: "(0/1)" },
  cough_phlegm_2_4wk:       { label: "Cough with Phlegm 2–4 wks",    unit: "(0/1)" },
  swollen_lymph:            { label: "Swollen Lymph Nodes",           unit: "(0/1)" },
  loss_appetite:            { label: "Loss of Appetite",              unit: "(0/1)" },
  // Cancer
  GENDER:                   { label: "Gender (M/F → 1/0)",            unit: "" },
  AGE:                      { label: "Age",                           unit: "years" },
  SMOKING:                  { label: "Smoking",                       unit: "(1/2)" },
  YELLOW_FINGERS:           { label: "Yellow Fingers",                unit: "(1/2)" },
  ANXIETY:                  { label: "Anxiety",                       unit: "(1/2)" },
  PEER_PRESSURE:            { label: "Peer Pressure",                 unit: "(1/2)" },
  CHRONIC_DISEASE:          { label: "Chronic Disease",               unit: "(1/2)" },
  FATIGUE:                  { label: "Fatigue",                       unit: "(1/2)" },
  ALLERGY:                  { label: "Allergy",                       unit: "(1/2)" },
  WHEEZING:                 { label: "Wheezing",                      unit: "(1/2)" },
  ALCOHOL_CONSUMING:        { label: "Alcohol Consuming",             unit: "(1/2)" },
  COUGHING:                 { label: "Coughing",                      unit: "(1/2)" },
  SHORTNESS_OF_BREATH:      { label: "Shortness of Breath",           unit: "(1/2)" },
  SWALLOWING_DIFFICULTY:    { label: "Swallowing Difficulty",         unit: "(1/2)" },
  CHEST_PAIN:               { label: "Chest Pain",                    unit: "(1/2)" },
};

export default function FeatureInput({ name, value, onChange, error }) {
  const meta = FEATURE_META[name] ?? { label: name, unit: "" };

  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-xs font-medium text-ink-mid">
        {meta.label}
        {meta.unit && (
          <span className="font-mono text-ink-ghost">{meta.unit}</span>
        )}
      </label>
      <input
        id={`feature-${name}`}
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className={`w-full px-3 py-2 rounded-lg border text-sm bg-white text-ink placeholder-ink-ghost
          focus:outline-none focus:ring-2 focus:ring-terra focus:border-transparent transition
          ${error ? "border-status-high" : "border-border hover:border-border-strong"}`}
        placeholder="0"
      />
      {error && <p className="text-xs text-status-high">{error}</p>}
    </div>
  );
}
