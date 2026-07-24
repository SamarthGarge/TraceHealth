/**
 * uploads.js — API layer for the file upload endpoints.
 * Uses the shared axios client (withCredentials, 401 auto-retry).
 */
import apiClient from "./client";

/**
 * Upload a file with progress reporting.
 *
 * @param {File} file            - browser File object from input/drop
 * @param {function} onProgress  - called with (percent: number) during upload
 * @returns {Promise<UploadItem>}
 */
export async function uploadFile(file, onProgress) {
  const form = new FormData();
  form.append("file", file, file.name);

  const res = await apiClient.post("/api/uploads", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress(evt) {
      if (evt.total) {
        onProgress?.(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
  return res.data;
}

/**
 * List the authenticated user's uploads.
 *
 * @param {object} params
 * @param {number} [params.skip=0]
 * @param {number} [params.limit=20]
 * @returns {Promise<{items, total, skip, limit}>}
 */
export async function listUploads({ skip = 0, limit = 20 } = {}) {
  const res = await apiClient.get("/api/uploads", { params: { skip, limit } });
  return res.data;
}

/**
 * Trigger a browser download for an uploaded file.
 * Uses a hidden <a> element trick — avoids opening in a new tab.
 *
 * @param {string} fileId    - GridFS file ID
 * @param {string} filename  - original filename (for the download dialog)
 */
export async function downloadUpload(fileId, filename) {
  const res = await apiClient.get(`/api/uploads/${fileId}`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Delete an uploaded file.
 *
 * @param {string} fileId
 * @returns {Promise<{message: string}>}
 */
export async function deleteUpload(fileId) {
  const res = await apiClient.delete(`/api/uploads/${fileId}`);
  return res.data;
}
