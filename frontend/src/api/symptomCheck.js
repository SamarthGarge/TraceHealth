/**
 * symptomCheck.js — API call for the symptom triage endpoint.
 * Public — no auth required.
 */
import apiClient from "./client";

/**
 * Submit symptom flags and get ranked disease referrals.
 *
 * @param {Record<string, boolean>} symptoms  - symptom_id → true/false
 * @returns {Promise<{referrals: DiseaseReferral[], summary: string}>}
 */
export async function checkSymptoms(symptoms) {
  const res = await apiClient.post("/api/symptom-check", { symptoms });
  return res.data;
}
