import React, { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import { uploadFile, listUploads, downloadUpload, deleteUpload } from "../api/uploads";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "text/csv"];
const ALLOWED_EXT_LABEL = "PDF, PNG, JPEG, CSV";
const PAGE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const TYPE_ICON = {
  "application/pdf": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  "image/png": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  "image/jpeg": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  "text/csv": (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
};

const TYPE_COLOR = {
  "application/pdf": "var(--status-high)",
  "image/png":       "var(--chart-plum)",
  "image/jpeg":      "var(--chart-plum)",
  "text/csv":        "var(--status-low)",
};

const TYPE_LABEL = {
  "application/pdf": "PDF",
  "image/png":       "PNG",
  "image/jpeg":      "JPEG",
  "text/csv":        "CSV",
};

// ── Upload Queue Item ─────────────────────────────────────────────────────────

function UploadQueueItem({ item, onRemove }) {
  const { file, status, progress, error } = item;

  return (
    <div className="bg-white border border-border rounded-xl p-4">
      <div className="flex items-center gap-3">
        <span className="text-ink-ghost">{TYPE_ICON[file.type] ?? TYPE_ICON["text/csv"]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink truncate">{file.name}</p>
          <p className="text-xs text-ink-ghost">{formatBytes(file.size)}</p>
        </div>
        {status === "done" && (
          <svg className="w-4 h-4 text-status-low shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === "error" && (
          <button onClick={onRemove} className="text-ink-ghost hover:text-status-high transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar */}
      {status === "uploading" && (
        <div className="mt-3">
          <div className="w-full rounded-full overflow-hidden" style={{ height: 4, backgroundColor: "var(--border-soft)" }}>
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${progress}%`, backgroundColor: "var(--terra)" }}
            />
          </div>
          <p className="text-xs text-ink-ghost mt-1 text-right">{progress}%</p>
        </div>
      )}

      {/* Error message */}
      {status === "error" && error && (
        <p className="mt-2 text-xs text-status-high">{error}</p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Uploads() {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue]       = useState([]);         // upload queue
  const [files, setFiles]       = useState([]);         // saved file list
  const [total, setTotal]       = useState(0);
  const [skip, setSkip]         = useState(0);
  const [loading, setLoading]   = useState(true);
  const [listError, setListError] = useState("");
  const [deleting, setDeleting] = useState(null);       // file id being deleted

  // ── Load file list ──────────────────────────────────────────────────────────
  const loadFiles = useCallback(async (skipVal = 0) => {
    setLoading(true);
    setListError("");
    try {
      const data = await listUploads({ skip: skipVal, limit: PAGE_SIZE });
      setFiles(data.items);
      setTotal(data.total);
      setSkip(skipVal);
    } catch {
      setListError("Failed to load files. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFiles(0); }, [loadFiles]);

  // ── File validation ─────────────────────────────────────────────────────────
  function validateFile(file) {
    if (file.size > MAX_BYTES) {
      return `File too large (${formatBytes(file.size)}). Maximum is ${MAX_MB} MB.`;
    }
    // Browser MIME type check (magic-byte check happens server-side)
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `Unsupported type "${file.type}". Allowed: ${ALLOWED_EXT_LABEL}.`;
    }
    return null;
  }

  // ── Upload a single file ────────────────────────────────────────────────────
  async function processFile(file) {
    const id = `${file.name}-${Date.now()}`;
    const validationError = validateFile(file);

    if (validationError) {
      setQueue((q) => [...q, { id, file, status: "error", progress: 0, error: validationError }]);
      return;
    }

    setQueue((q) => [...q, { id, file, status: "uploading", progress: 0, error: null }]);

    try {
      await uploadFile(file, (pct) => {
        setQueue((q) => q.map((item) => item.id === id ? { ...item, progress: pct } : item));
      });
      setQueue((q) => q.map((item) => item.id === id ? { ...item, status: "done" } : item));
      // Refresh file list after successful upload
      loadFiles(0);
      // Auto-remove "done" items after 2 seconds
      setTimeout(() => {
        setQueue((q) => q.filter((item) => item.id !== id));
      }, 2000);
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Upload failed. Please try again.";
      setQueue((q) => q.map((item) => item.id === id ? { ...item, status: "error", error: msg } : item));
    }
  }

  function handleFiles(fileList) {
    Array.from(fileList).forEach(processFile);
  }

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────
  function onDragOver(e)  { e.preventDefault(); setDragging(true);  }
  function onDragLeave()  { setDragging(false); }
  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDelete(fileId) {
    if (!window.confirm("Delete this file? This cannot be undone.")) return;
    setDeleting(fileId);
    try {
      await deleteUpload(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setTotal((t) => t - 1);
    } catch {
      setListError("Failed to delete file. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const hasPrev = skip > 0;
  const hasNext = skip + PAGE_SIZE < total;

  return (
    <div className="flex min-h-screen bg-parchment">
      <Sidebar />

      <main className="flex-1 p-8">
        <header className="mb-8">
          <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-2">
            Medical Documents
          </p>
          <h1 className="font-serif text-3xl text-ink mb-2">Uploads</h1>
          <p className="text-ink-light text-sm">
            Securely store medical reports, scans, and lab results.{" "}
            {total > 0 && <span className="text-ink-mid font-medium">{total} file{total !== 1 ? "s" : ""}</span>}
          </p>
        </header>

        {/* Drop Zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`mb-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 p-10 text-center
            ${dragging
              ? "border-terra bg-terra-dim scale-[1.01]"
              : "border-border hover:border-terra hover:bg-terra-dim"
            }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.csv"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: dragging ? "var(--terra-dim)" : "var(--border-soft)" }}
            >
              <svg
                className="w-6 h-6 transition-colors"
                style={{ color: dragging ? "var(--terra)" : "var(--ink-ghost)" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            <div>
              <p className="text-sm font-semibold text-ink">
                {dragging ? "Drop to upload" : "Drag & drop files here"}
              </p>
              <p className="text-xs text-ink-ghost mt-1">
                or <span className="text-terra underline">click to browse</span>
              </p>
            </div>

            <p className="text-[10px] font-mono text-ink-ghost">
              {ALLOWED_EXT_LABEL} · max {MAX_MB} MB per file
            </p>
          </div>
        </div>

        {/* Upload Queue */}
        {queue.length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-xs font-mono text-ink-ghost uppercase tracking-widest mb-2">
              Uploading
            </p>
            {queue.map((item) => (
              <UploadQueueItem
                key={item.id}
                item={item}
                onRemove={() => setQueue((q) => q.filter((i) => i.id !== item.id))}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {listError && (
          <div className="mb-6 p-4 rounded-lg border border-status-high bg-status-high-dim text-status-high text-sm">
            {listError}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 text-ink-light text-sm py-8">
            <div className="w-4 h-4 border-2 border-terra border-t-transparent rounded-full animate-spin" />
            Loading files…
          </div>
        )}

        {/* Empty state */}
        {!loading && files.length === 0 && !listError && queue.length === 0 && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-xl bg-parchment-lo border border-border flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-ink-ghost" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-ink-mid font-medium mb-1">No files yet</p>
            <p className="text-sm text-ink-ghost">
              Upload a medical report, scan, or lab result above.
            </p>
          </div>
        )}

        {/* File list */}
        {!loading && files.length > 0 && (
          <>
            <div className="space-y-2">
              {files.map((f) => {
                const color = TYPE_COLOR[f.content_type] ?? "var(--ink-mid)";
                const label = TYPE_LABEL[f.content_type] ?? f.content_type;
                const icon  = TYPE_ICON[f.content_type]  ?? TYPE_ICON["text/csv"];

                return (
                  <div
                    key={f.id}
                    className="bg-white border border-border rounded-xl px-5 py-4 flex items-center gap-4 hover:border-border-strong transition-colors"
                  >
                    {/* Type icon */}
                    <span className="shrink-0" style={{ color }}>{icon}</span>

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{f.filename}</p>
                      <p className="text-xs text-ink-ghost mt-0.5">
                        {formatBytes(f.size)} · {formatDate(f.created_at)}
                      </p>
                    </div>

                    {/* Type badge */}
                    <span
                      className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono"
                      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, white)` }}
                    >
                      {label}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Download */}
                      <button
                        onClick={() => downloadUpload(f.id, f.filename)}
                        className="p-2 rounded-lg text-ink-ghost hover:text-terra hover:bg-terra-dim transition-colors"
                        title="Download"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(f.id)}
                        disabled={deleting === f.id}
                        className="p-2 rounded-lg text-ink-ghost hover:text-status-high hover:bg-status-high-dim transition-colors disabled:opacity-40"
                        title="Delete"
                      >
                        {deleting === f.id ? (
                          <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {(hasPrev || hasNext) && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <button
                  disabled={!hasPrev}
                  onClick={() => loadFiles(skip - PAGE_SIZE)}
                  className="px-4 py-2 rounded-lg text-sm border border-border text-ink-mid hover:border-border-strong transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-xs text-ink-ghost font-mono">
                  {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
                </span>
                <button
                  disabled={!hasNext}
                  onClick={() => loadFiles(skip + PAGE_SIZE)}
                  className="px-4 py-2 rounded-lg text-sm border border-border text-ink-mid hover:border-border-strong transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}

        {/* Privacy notice */}
        <p className="mt-8 text-xs text-ink-ghost leading-relaxed max-w-lg">
          Files are stored securely and are only accessible by your account.
          Allowed formats: {ALLOWED_EXT_LABEL}. Maximum file size: {MAX_MB} MB.
        </p>
      </main>
    </div>
  );
}
