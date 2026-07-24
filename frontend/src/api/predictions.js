/**
 * predictions.js — API calls for the prediction and history endpoints.
 * All functions wrap the shared axios client (withCredentials, 401 auto-retry).
 */
import apiClient from "./client";

// ── Prediction ────────────────────────────────────────────────────────────────

/**
 * Fetch the ordered list of expected feature names for a disease.
 * Used to dynamically build the prediction form.
 * @param {string} disease - "diabetes" | "heart" | "tb" | "cancer"
 * @returns {Promise<{disease, features, count}>}
 */
export async function getFeatures(disease) {
  const res = await apiClient.get(`/api/predict/${disease}/features`);
  return res.data;
}

/**
 * Run all 3 models on the provided features and return predictions + SHAP.
 * Works for guests; prediction is persisted only for authenticated + consented users.
 * @param {string} disease
 * @param {Record<string, number>} features - feature name → numeric value
 * @returns {Promise<PredictResponse>}
 */
export async function runPrediction(disease, features) {
  const res = await apiClient.post(`/api/predict/${disease}`, { features });
  return res.data;
}

// ── History ───────────────────────────────────────────────────────────────────

/**
 * List the authenticated user's prediction history.
 * @param {object} params
 * @param {number} [params.skip=0]
 * @param {number} [params.limit=20]
 * @param {string} [params.disease]   - optional disease filter
 * @returns {Promise<{items, total, skip, limit}>}
 */
export async function getHistory({ skip = 0, limit = 20, disease } = {}) {
  const params = { skip, limit };
  if (disease) params.disease = disease;
  const res = await apiClient.get("/api/history", { params });
  return res.data;
}

/**
 * Fetch full detail for a single prediction (includes SHAP + all model results).
 * @param {string} id - MongoDB ObjectId string
 */
export async function getHistoryDetail(id) {
  const res = await apiClient.get(`/api/history/${id}`);
  return res.data;
}

/**
 * Delete a prediction from history.
 * @param {string} id
 */
export async function deleteHistoryItem(id) {
  const res = await apiClient.delete(`/api/history/${id}`);
  return res.data;
}
