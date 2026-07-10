import { z } from "zod";

// ── Auth forms ─────────────────────────────────────────────────────────────

export const signupSchema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters.")
      .max(80, "Name too long."),
    email: z.string().email("Please enter a valid email address."),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
      .regex(/[0-9]/, "Password must contain at least one number."),
    confirmPassword: z.string(),
    consentDataStorage: z
      .boolean()
      .refine((v) => v === true, {
        message:
          "You must read and accept the data storage terms to create an account.",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

// ── Per-disease prediction forms ───────────────────────────────────────────
// These mirror the Pydantic constraints in backend/app/models/prediction.py.
// INVARIANT: Feature names and ranges MUST stay in sync with the backend.

export const diabetesSchema = z.object({
  pregnancies:         z.number().int().min(0).max(20),
  glucose:             z.number().min(0).max(300),
  blood_pressure:      z.number().min(0).max(180),
  skin_thickness:      z.number().min(0).max(100),
  insulin:             z.number().min(0).max(900),
  bmi:                 z.number().min(0).max(70),
  diabetes_pedigree:   z.number().min(0.0).max(2.5),
  age:                 z.number().int().min(1).max(120),
});

export const heartSchema = z.object({
  age:          z.number().int().min(1).max(120),
  sex:          z.number().int().min(0).max(1),
  cp:           z.number().int().min(0).max(3),
  trestbps:     z.number().min(80).max(250),
  chol:         z.number().min(100).max(600),
  fbs:          z.number().int().min(0).max(1),
  restecg:      z.number().int().min(0).max(2),
  thalach:      z.number().min(60).max(220),
  exang:        z.number().int().min(0).max(1),
  oldpeak:      z.number().min(0).max(7),
  slope:        z.number().int().min(0).max(2),
  ca:           z.number().int().min(0).max(4),
  thal:         z.number().int().min(0).max(3),
});

export const tbSchema = z.object({
  age:                 z.number().int().min(1).max(120),
  sex:                 z.enum(["M", "F"]),
  fever:               z.boolean(),
  night_sweats:        z.boolean(),
  cough_weeks:         z.number().int().min(0).max(52),
  hemoptysis:          z.boolean(),
  chest_pain:          z.boolean(),
  dyspnea:             z.boolean(),
  weight_loss_kg:      z.number().min(0).max(50),
  fatigue:             z.boolean(),
  anorexia:            z.boolean(),
  contact_with_tb:     z.boolean(),
  hiv_positive:        z.boolean(),
});

export const cancerSchema = z.object({
  age:              z.number().int().min(1).max(120),
  gender:           z.number().int().min(0).max(1),
  air_pollution:    z.number().int().min(1).max(10),
  alcohol_use:      z.number().int().min(1).max(10),
  dust_allergy:     z.number().int().min(1).max(10),
  occupational_hazards: z.number().int().min(1).max(10),
  genetic_risk:     z.number().int().min(1).max(10),
  chronic_lung_disease: z.number().int().min(1).max(10),
  balanced_diet:    z.number().int().min(1).max(10),
  obesity:          z.number().int().min(1).max(10),
  smoking:          z.number().int().min(1).max(10),
  passive_smoker:   z.number().int().min(1).max(10),
  chest_pain_val:   z.number().int().min(1).max(10),
  coughing_blood:   z.number().int().min(1).max(10),
  fatigue:          z.number().int().min(1).max(10),
  weight_loss:      z.number().int().min(1).max(10),
  shortness_of_breath: z.number().int().min(1).max(10),
  wheezing:         z.number().int().min(1).max(10),
  swallowing_diff:  z.number().int().min(1).max(10),
  clubbing:         z.number().int().min(1).max(10),
  frequent_cold:    z.number().int().min(1).max(10),
  dry_cough:        z.number().int().min(1).max(10),
  snoring:          z.number().int().min(1).max(10),
});

// ── Framingham ─────────────────────────────────────────────────────────────
export const framinghamSchema = z.object({
  age:             z.number().int().min(30).max(79),
  sex:             z.enum(["M", "F"]),
  total_chol:      z.number().min(130).max(400),
  hdl:             z.number().min(20).max(100),
  systolic_bp:     z.number().min(90).max(300),
  smoker:          z.boolean(),
  bp_treated:      z.boolean(),
});
