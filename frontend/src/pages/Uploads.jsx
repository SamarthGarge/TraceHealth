import React, { useCallback, useEffect, useRef, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import { uploadFile, listUploads, downloadUpload, deleteUpload, analyzeUpload } from "../api/uploads";

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_TYPES = ["application/pdf", "image/png", "image/jpeg", "text/csv"];
const ALLOWED_EXT_LABEL = "PDF, PNG, JPEG, CSV";
const PAGE_SIZE = 20;
const ANALYZABLE = ["application/pdf", "image/png", "image/jpeg"];

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

const STATUS_COLOR = {
  normal:   { bg: "rgba(77,122,96,0.1)",   text: "#4D7A60" },
  low:      { bg: "rgba(91,124,153,0.12)", text: "#5B7C99" },
  high:     { bg: "rgba(184,134,46,0.12)", text: "#B8862E" },
  critical: { bg: "rgba(178,58,58,0.12)",  text: "#B23A3A" },
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
      {status === "uploading" && (
        <div className="mt-3">
          <div className="w-full rounded-full overflow-hidden" style={{ height: 4, backgroundColor: "var(--border-soft)" }}>
            <div className="h-full rounded-full transition-all duration-200" style={{ width: `${progress}%`, backgroundColor: "var(--terra)" }} />
          </div>
          <p className="text-xs text-ink-ghost mt-1 text-right">{progress}%</p>
        </div>
      )}
      {status === "error" && error && <p className="mt-2 text-xs text-status-high">{error}</p>}
    </div>
  );
}

// ── Analysis Panel ────────────────────────────────────────────────────────────

function AnalysisPanel({ result, onClose }) {
  const overall = result.overall_status;
  const markers = result.markers ?? [];
  const general = result.general_advice ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30 backdrop-blur-sm">
      <div className="bg-parchment rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="sticky top-0 bg-parchment border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-0.5">AI Report Analysis</p>
            <h2 className="font-serif text-xl text-ink">{result.filename}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-ink-ghost hover:text-ink hover:bg-border-soft transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Overall status */}
          <div className="rounded-xl border border-border bg-white p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-terra-dim flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-terra" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-mono text-ink-ghost uppercase tracking-widest mb-0.5">Overall Status</p>
              <p className="font-semibold text-ink text-base">{overall}</p>
              {!result.text_extracted && (
                <p className="text-xs text-status-high mt-1">⚠ No readable text was found. Ensure the file is not a scanned image with poor quality.</p>
              )}
            </div>
          </div>

          {/* Detected markers */}
          {markers.length > 0 ? (
            <div>
              <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-3">
                Detected Markers ({markers.length})
              </p>
              <div className="space-y-4">
                {markers.map((m, i) => {
                  const colors = STATUS_COLOR[m.status] ?? STATUS_COLOR.normal;
                  return (
                    <div key={i} className="bg-white border border-border rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-sm text-ink">{m.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-ink-mid">{m.value}</span>
                          <span
                            className="text-[10px] font-semibold font-mono px-2 py-0.5 rounded-full capitalize"
                            style={{ backgroundColor: colors.bg, color: colors.text }}
                          >
                            {m.status}
                          </span>
                        </div>
                      </div>

                      {/* Advice */}
                      <ul className="space-y-1 mb-3">
                        {m.advice.map((a, j) => (
                          <li key={j} className="text-xs text-ink-mid flex gap-2">
                            <span className="shrink-0 text-terra">›</span>
                            {a}
                          </li>
                        ))}
                      </ul>

                      {/* Recommended foods */}
                      {m.foods?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-ink-ghost mb-1.5">Recommended Foods</p>
                          <div className="flex flex-wrap gap-1.5">
                            {m.foods.map((food, j) => (
                              <span
                                key={j}
                                className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-parchment-lo text-ink-mid"
                              >
                                {food}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-ink-ghost text-sm">
              {result.text_extracted
                ? "No specific health markers were detected in this document."
                : "Could not extract text from this file. Try uploading a clearer scan or a text-based PDF."}
            </div>
          )}

          {/* General advice */}
          <div>
            <p className="text-xs font-mono tracking-widest text-ink-ghost uppercase mb-3">General Wellness Tips</p>
            <ul className="space-y-2">
              {general.map((tip, i) => (
                <li key={i} className="text-xs text-ink-mid flex gap-2">
                  <span className="shrink-0 text-terra">✦</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-ink-ghost leading-relaxed border-t border-border pt-4">
            {result.disclaimer}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Uploads() {
  const inputRef = useRef(null);
  const [dragging,   setDragging]   = useState(false);
  const [queue,      setQueue]      = useState([]);
  const [files,      setFiles]      = useState([]);
  const [total,      setTotal]      = useState(0);
  const [skip,       setSkip]       = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [listError,  setListError]  = useState("");
  const [deleting,   setDeleting]   = useState(null);
  const [analyzing,  setAnalyzing]  = useState(null);   // file id being analyzed
  const [analysis,   setAnalysis]   = useState(null);   // analysis result to show in panel
  const [analyzeErr, setAnalyzeErr] = useState({});     // { fileId: errorMsg }

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
    if (file.size > MAX_BYTES) return `File too large (${formatBytes(file.size)}). Maximum is ${MAX_MB} MB.`;
    if (!ALLOWED_TYPES.includes(file.type)) return `Unsupported type "${file.type}". Allowed: ${ALLOWED_EXT_LABEL}.`;
    return null;
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
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
      loadFiles(0);
      setTimeout(() => { setQueue((q) => q.filter((item) => item.id !== id)); }, 2000);
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Upload failed. Please try again.";
      setQueue((q) => q.map((item) => item.id === id ? { ...item, status: "error", error: msg } : item));
    }
  }

  function handleFiles(fileList) { Array.from(fileList).forEach(processFile); }

  // ── Drag-and-drop ───────────────────────────────────────────────────────────
  function onDragOver(e)  { e.preventDefault(); setDragging(true); }
  function onDragLeave()  { setDragging(false); }
  function onDrop(e) { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }

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

  // ── Analyze ─────────────────────────────────────────────────────────────────
  async function handleAnalyze(fileId) {
    setAnalyzing(fileId);
    setAnalyzeErr((prev) => ({ ...prev, [fileId]: null }));
    try {
      const result = await analyzeUpload(fileId);
      setAnalysis(result);
    } catch (err) {
      const msg = err?.response?.data?.detail ?? "Analysis failed. Please try again.";
      setAnalyzeErr((prev) => ({ ...prev, [fileId]: msg }));
    } finally {
      setAnalyzing(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  const hasPrev = skip > 0;
  const hasNext = skip + PAGE_SIZE < total;

  return (
    <div className="page-shell">
      <Sidebar />

      <main className="page-main bg-parchment">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="mb-6 sm:mb-8 animate-fade-up">
          <p className="text-[10px] font-mono tracking-widest text-ink-ghost uppercase mb-2">Medical Documents</p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink mb-2">Uploads</h1>
          <p className="text-ink-light text-sm">
            Securely store and analyze medical reports, scans, and lab results.{" "}
            {total > 0 && <span className="text-ink-mid font-medium">{total} file{total !== 1 ? "s" : ""}</span>}
          </p>
        </header>

        {/* Drop Zone */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`mb-5 sm:mb-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all p-6 sm:p-10 text-center active:scale-[0.99] animate-fade-up
            ${dragging ? "border-terra bg-terra-dim scale-[1.01]" : "border-border hover:border-terra hover:bg-terra-dim"}`}
          style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)", transitionDuration: "200ms", animationDelay: "50ms" }}
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
            <p className="text-[10px] font-mono text-ink-ghost">{ALLOWED_EXT_LABEL} · max {MAX_MB} MB per file</p>
          </div>
        </div>

        {/* AI Analyze banner */}
        <div className="mb-6 rounded-xl border border-border bg-white px-5 py-4 flex items-start gap-4">
          <div className="w-9 h-9 rounded-lg bg-terra-dim flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-terra" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink mb-0.5">AI Report Analysis</p>
            <p className="text-xs text-ink-mid leading-relaxed">
              Upload a blood test, lab report, or medical scan (PDF or image) and click{" "}
              <strong>Analyze ✦</strong> to extract health markers and get personalised dietary
              and lifestyle recommendations — powered by OCR and a curated health-advice engine.
            </p>
          </div>
        </div>

        {/* Upload Queue */}
        {queue.length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-xs font-mono text-ink-ghost uppercase tracking-widest mb-2">Uploading</p>
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
            <p className="text-sm text-ink-ghost">Upload a medical report, scan, or lab result above to get started.</p>
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
                const canAnalyze = ANALYZABLE.includes(f.content_type);

                return (
                  <div
                    key={f.id}
                    className="bg-white border border-border rounded-xl px-5 py-4 hover:border-border-strong transition-colors"
                  >
                    <div className="flex items-center gap-4">
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
                        {/* Analyze button — only for PDF/image */}
                        {canAnalyze && (
                          <button
                            onClick={() => handleAnalyze(f.id)}
                            disabled={analyzing === f.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-terra-dim text-terra
                              hover:bg-terra hover:text-white transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                            title="Analyze with AI"
                          >
                            {analyzing === f.id ? (
                              <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            )}
                            {analyzing === f.id ? "Analyzing…" : "Analyze ✦"}
                          </button>
                        )}

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

                    {/* Per-file analyze error */}
                    {analyzeErr[f.id] && (
                      <p className="mt-2 text-xs text-status-high pl-9">{analyzeErr[f.id]}</p>
                    )}
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
          AI analysis is performed in real-time and no report data is retained after analysis.
        </p>
        </div>
      </main>

      {/* Analysis result panel */}
      {analysis && <AnalysisPanel result={analysis} onClose={() => setAnalysis(null)} />}
    </div>
  );
}
