/**
 * models.js — API calls for model metadata (leaderboard / accuracy data).
 * Public endpoint — no auth required.
 */
import apiClient from "./client";

/**
 * Fetch model metadata for all 4 diseases.
 * Used on the Dashboard and Insights pages.
 * @returns {Promise<{metadata: Array}>}
 */
export async function getModelsMetadata() {
  const res = await apiClient.get("/api/models/metadata");
  return res.data;
}

/**
 * Fetch model metadata for a single disease.
 * @param {string} disease - "diabetes" | "heart" | "tb" | "cancer"
 */
export async function getDiseaseMetadata(disease) {
  const res = await apiClient.get(`/api/models/metadata/${disease}`);
  return res.data;
}
