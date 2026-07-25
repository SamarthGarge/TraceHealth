/**
 * export.js — API helpers for downloading prediction data.
 * Uses blob-based download to trigger the browser's save dialog.
 */
import apiClient from "./client";

/**
 * Download the user's full prediction history.
 *
 * @param {object} opts
 * @param {"csv"|"json"} [opts.format="csv"]
 * @param {string}       [opts.disease]        - optional filter
 */
export async function exportAllPredictions({ format = "csv", disease } = {}) {
  const params = { format };
  if (disease) params.disease = disease;

  const res = await apiClient.get("/api/export/predictions", {
    params,
    responseType: "blob",
  });

  _triggerDownload(res);
}

/**
 * Download a single prediction record.
 *
 * @param {string}           id
 * @param {"csv"|"json"}     [format="json"]
 */
export async function exportSinglePrediction(id, format = "json") {
  const res = await apiClient.get(`/api/export/predictions/${id}`, {
    params: { format },
    responseType: "blob",
  });
  _triggerDownload(res);
}

/** Extract filename from Content-Disposition and trigger browser download. */
function _triggerDownload(res) {
  const cd = res.headers["content-disposition"] ?? "";
  const match = cd.match(/filename="?([^"]+)"?/);
  const filename = match?.[1] ?? "tracehealth_export";

  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
