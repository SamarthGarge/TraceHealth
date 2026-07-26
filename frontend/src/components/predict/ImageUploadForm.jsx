/**
 * ImageUploadForm.jsx — Drag-and-drop image upload form for vision-based predictions.
 * Used by the TB and cancer disease predict pages.
 *
 * Props:
 *   disease:   "tb" | "cancer"
 *   onResult:  function(resultObject) — called when prediction completes
 */

import React, { useCallback, useRef, useState } from "react";
import apiClient from "../../api/client";

const ACCEPT_TYPES = ["image/jpeg", "image/png"];
const MAX_MB = 10;

const DISEASE_HINT = {
  tb:     "Upload a chest X-ray (frontal view, JPEG or PNG, max 10 MB).",
  cancer: "Upload a lung CT scan image (JPEG or PNG, max 10 MB).",
};

export default function ImageUploadForm({ disease, onResult }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver]   = useState(false);
  const [preview,  setPreview]    = useState(null);   // object URL
  const [file,     setFile]       = useState(null);
  const [loading,  setLoading]    = useState(false);
  const [error,    setError]      = useState("");

  function acceptFile(f) {
    if (!ACCEPT_TYPES.includes(f.type)) {
      setError("Only JPEG and PNG images are accepted.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }
    setError("");
    setFile(f);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(f));
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  }, [preview]);

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) { setError("Please select an image first."); return; }

    setLoading(true);
    setError("");
    const fd = new FormData();
    fd.append("image", file);

    try {
      const res = await apiClient.post(`/api/predict/${disease}/image`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onResult(res.data);
    } catch (err) {
      const msg = err.response?.data?.detail;
      if (err.response?.status === 503) {
        setError(typeof msg === "string" ? msg : "Model not available yet — the vision model needs to be trained first. Run training/train_" + disease + "_image.py.");
      } else {
        setError(typeof msg === "string" ? msg : "Prediction failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-ink-light">{DISEASE_HINT[disease]}</p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer
          ${dragOver
            ? "border-terra bg-terra/5 scale-[1.01]"
            : "border-border hover:border-terra/50 bg-white/60"}
          ${preview ? "cursor-default" : "min-h-[180px] flex items-center justify-center"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={onFileChange}
          className="hidden"
        />

        {!preview ? (
          <div className="flex flex-col items-center gap-3 p-10 text-ink-ghost select-none">
            {/* Upload icon */}
            <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V4m0 0L8 8m4-4l4 4" />
            </svg>
            <p className="text-sm font-medium">Drop an image here</p>
            <p className="text-xs">or <span className="text-terra hover:underline">browse files</span></p>
            <p className="text-[11px] mt-1">JPEG · PNG · max 10 MB</p>
          </div>
        ) : (
          <div className="relative">
            <img
              src={preview}
              alt="Selected X-ray"
              className="w-full max-h-72 object-contain rounded-xl p-2"
            />
            {/* Clear button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clear(); }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white
                flex items-center justify-center hover:bg-black/80 transition"
              title="Remove image"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* File info */}
      {file && (
        <p className="text-xs text-ink-ghost font-mono">
          {file.name} — {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-status-high bg-status-high-dim border border-status-high px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!file || loading}
        className="w-full py-2.5 rounded-xl bg-terra text-white text-sm font-semibold
          hover:bg-terra-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Analysing…
          </span>
        ) : "Run Image Prediction"}
      </button>
    </form>
  );
}
