/**
 * useHistory — Phase 4
 *
 * React Query hook for fetching the current user's prediction history
 * from GET /api/history and GET /api/history/:id.
 *
 * Implemented in Phase 4 alongside backend/app/routers/history.py.
 *
 * Planned API shape:
 *   const { records, isLoading, error } = useHistory({ disease, page, limit });
 *   const { record, isLoading } = useHistoryDetail(id);
 */

// TODO (Phase 4): implement with @tanstack/react-query
// import { useQuery } from "@tanstack/react-query";
// import apiClient from "../api/client";

export function useHistory() {
  throw new Error("useHistory: not yet implemented — build in Phase 4");
}

export function useHistoryDetail() {
  throw new Error("useHistoryDetail: not yet implemented — build in Phase 4");
}
