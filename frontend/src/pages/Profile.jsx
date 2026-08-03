import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";
import Sidebar from "../components/layout/Sidebar";

/**
 * Profile page — account info, data consent status, and danger zone.
 * Uses page-shell layout with sidebar. Responsive single column.
 */
export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "delete my account") return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      await apiClient.delete("/api/users/me");
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError(
        err.response?.data?.detail || "Failed to delete account. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="page-shell">
      <Sidebar />
      <main className="page-main bg-parchment">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

          {/* Page heading */}
          <div className="mb-8 animate-fade-up">
            <div className="flex items-center gap-3 mb-1">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-1.5 -ml-1.5 rounded-lg text-ink-ghost hover:text-ink hover:bg-parchment-lo transition-all active:scale-[0.95]"
                style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              </button>
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-ink">Profile & Settings</h1>
            </div>
            <p className="text-ink-light text-sm ml-9">Manage your account and data preferences.</p>
          </div>

          {/* Account info card */}
          <section className="card card-hover mb-5 animate-fade-up stagger-1">
            <h2 className="text-[11px] font-semibold text-ink-mid uppercase tracking-wider mb-5 font-mono">
              Account
            </h2>
            <div className="flex items-center gap-4 mb-6">
              {/* Avatar */}
              <div className="relative">
                <span className="w-14 h-14 rounded-full bg-gradient-to-br from-terra to-terra-dark text-white text-xl font-semibold flex items-center justify-center shrink-0 shadow-sm shadow-terra/20">
                  {initials}
                </span>
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-status-low border-2 border-white" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-ink truncate">{user.name}</p>
                <p className="text-sm text-ink-light truncate">{user.email}</p>
                <span className="inline-block mt-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-parchment-lo text-ink-mid border border-border-soft">
                  {user.role}
                </span>
              </div>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-t border-border-soft">
                <dt className="text-ink-light text-xs">Member since</dt>
                <dd className="text-ink text-sm font-medium">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric", month: "long", day: "numeric",
                      })
                    : "—"}
                </dd>
              </div>
              <div className="flex justify-between items-center py-2 border-t border-border-soft">
                <dt className="text-ink-light text-xs">Data storage consent</dt>
                <dd>
                  {user.consentDataStorage ? (
                    <span className="text-status-low font-medium text-sm flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm3.22 4.72a.75.75 0 0 0-1.06 0L7 8.88 5.84 7.72a.75.75 0 0 0-1.06 1.06l1.69 1.69a.75.75 0 0 0 1.06 0l3.69-3.69a.75.75 0 0 0 0-1.06Z" /></svg>
                      Granted
                    </span>
                  ) : (
                    <span className="text-status-high font-medium text-sm">Not granted</span>
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-5 pt-5 border-t border-border-soft">
              <button
                onClick={handleLogout}
                className="text-sm text-ink-mid hover:text-ink transition-all active:scale-[0.97] flex items-center gap-1.5"
                style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
              >
                Sign out of this device
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
              </button>
            </div>
          </section>

          {/* Data & Privacy card */}
          <section className="card card-hover mb-5 animate-fade-up stagger-2">
            <h2 className="text-[11px] font-semibold text-ink-mid uppercase tracking-wider mb-4 font-mono">
              Data & Privacy
            </h2>
            <p className="text-sm text-ink-mid leading-relaxed mb-4">
              Your health assessment data is stored to power the trend charts and
              history features. It is never sold or shared with third parties.
            </p>
            <div className="rounded-xl bg-parchment/60 border border-border-soft p-4 text-sm text-ink-mid">
              <p className="font-medium mb-2 text-ink text-xs uppercase tracking-wide">What we store</p>
              <ul className="space-y-1.5 text-ink-light text-xs">
                {[
                  "Prediction inputs and risk scores (when consented)",
                  "Uploaded medical documents (optional, deletable)",
                  "Name, email, and account creation date",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-ink-ghost mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Danger zone */}
          <section className="rounded-xl border border-status-high/20 bg-white p-6 animate-fade-up stagger-3">
            <h2 className="text-[11px] font-semibold text-status-high uppercase tracking-wider mb-2 font-mono">
              Danger Zone
            </h2>
            <p className="text-sm text-ink-mid mb-4">
              Permanently delete your account. This removes all your predictions,
              uploaded files, and personal data. This action cannot be undone.
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-lg border border-status-high text-status-high text-sm font-medium hover:bg-status-high-dim transition-all active:scale-[0.97]"
              style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
            >
              Delete my account
            </button>
          </section>
        </div>

        {/* Delete confirmation modal */}
        {showDeleteModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
            style={{ background: "rgba(28, 21, 16, 0.45)", backdropFilter: "blur(4px)" }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white border border-border shadow-xl p-6 animate-scale-in">
              <h3 id="delete-modal-title" className="font-display text-xl font-semibold text-ink mb-2">
                Delete account?
              </h3>
              <p className="text-sm text-ink-mid mb-4 leading-relaxed">
                This will permanently delete your account, all prediction history,
                and all uploaded files. Type{" "}
                <strong className="font-mono text-status-high">delete my account</strong>{" "}
                to confirm.
              </p>

              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="delete my account"
                className="input font-mono mb-4"
              />

              {deleteError && (
                <p className="text-sm text-status-high mb-3">{deleteError}</p>
              )}

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirm("");
                    setDeleteError("");
                  }}
                  className="px-4 py-2 text-sm text-ink-mid hover:text-ink transition-all active:scale-[0.97]"
                  style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                >
                  Cancel
                </button>
                <button
                  disabled={deleteConfirm !== "delete my account" || isDeleting}
                  onClick={handleDeleteAccount}
                  className="px-4 py-2 rounded-lg bg-status-high text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97]"
                  style={{ transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)" }}
                >
                  {isDeleting ? "Deleting…" : "Delete permanently"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
