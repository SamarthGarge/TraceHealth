/**
 * usePredictions — Phase 3
 *
 * React Query hook for fetching the current user's saved prediction history
 * and posting new predictions to POST /api/predict/:disease.
 *
 * Implemented in Phase 3 alongside backend/app/routers/predict.py.
 *
 * Planned API shape:
 *   const { predictions, isLoading, error } = usePredictions({ disease, limit });
 *   const { mutate: runPrediction, isPending } = useRunPrediction(disease);
 */

// TODO (Phase 3): implement with @tanstack/react-query
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import apiClient from "../api/client";

export function usePredictions() {
  throw new Error("usePredictions: not yet implemented — build in Phase 3");
}

export function useRunPrediction() {
  throw new Error("useRunPrediction: not yet implemented — build in Phase 3");
}
