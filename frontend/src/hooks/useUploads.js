/**
 * useUploads — Phase 5
 *
 * React Query hooks for medical document upload and retrieval.
 * Talks to POST /api/uploads (multipart/form-data) and GET /api/uploads.
 * GridFS on the backend stores the binary files.
 *
 * Implemented in Phase 5 alongside backend/app/routers/uploads.py.
 *
 * Planned API shape:
 *   const { uploads, isLoading } = useUploads();
 *   const { mutate: uploadFile, isPending, progress } = useUploadFile();
 *   const { mutate: deleteUpload } = useDeleteUpload();
 */

// TODO (Phase 5): implement with @tanstack/react-query
// import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// import apiClient from "../api/client";

export function useUploads() {
  throw new Error("useUploads: not yet implemented — build in Phase 5");
}

export function useUploadFile() {
  throw new Error("useUploadFile: not yet implemented — build in Phase 5");
}

export function useDeleteUpload() {
  throw new Error("useDeleteUpload: not yet implemented — build in Phase 5");
}
