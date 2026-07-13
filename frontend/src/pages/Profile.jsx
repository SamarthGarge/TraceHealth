import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/client";

/**
 * Profile page — account info, data consent status, and danger zone.
 * Danger Zone: delete account with type-to-confirm modal.
 *
 * Phase 5 will add: uploads list, download history export.
 * This page is fully wired for Phase 1 (auth info + logout + delete).
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

  return (
    <div className="min-h-screen bg-parchment">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-ink mb-1">Profile & Settings</h1>
          <p className="text-ink-light text-sm">Manage your account and data preferences.</p>
        </div>

        {/* Account info card */}
        <section className="rounded-xl border border-border bg-white p-6 mb-6">
          <h2 className="text-sm font-semibold text-ink-mid uppercase tracking-wide mb-4">
            Account
          </h2>
          <div className="flex items-center gap-4 mb-6">
            {/* Avatar */}
            <span className="w-14 h-14 rounded-full bg-terra text-white text-xl font-semibold flex items-center justify-center shrink-0">
              {user.name
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </span>
            <div>
              <p className="font-medium text-ink">{user.name}</p>
              <p className="text-sm text-ink-light">{user.email}</p>
              <span className="inline-block mt-1 text-[11px] font-mono px-2 py-0.5 rounded bg-parchment-lo text-ink-mid border border-border">
                {user.role}
              </span>
            </div>
          </div>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-light">Member since</dt>
              <dd className="text-ink">
                {user.createdAt
                  ? new Date(user.createdAt).toLocaleDateString("en-IN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-light">Data storage consent</dt>
              <dd>
                {user.consentDataStorage ? (
                  <span className="text-status-low font-medium">✓ Granted</span>
                ) : (
                  <span className="text-status-high font-medium">✗ Not granted</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-6 pt-6 border-t border-border-soft">
            <button
              onClick={handleLogout}
              className="text-sm text-ink-mid hover:text-ink transition-colors"
            >
              Sign out of this device →
            </button>
          </div>
        </section>

        {/* Data & Privacy card */}
        <section className="rounded-xl border border-border bg-white p-6 mb-6">
          <h2 className="text-sm font-semibold text-ink-mid uppercase tracking-wide mb-4">
            Data & Privacy
          </h2>
          <p className="text-sm text-ink-mid leading-relaxed mb-4">
            Your health assessment data is stored to power the trend charts and
            history features. It is never sold or shared with third parties.
          </p>
          <div className="rounded-lg bg-parchment-lo border border-border p-4 text-sm text-ink-mid">
            <p className="font-medium mb-1">What we store</p>
            <ul className="list-disc list-inside space-y-1 text-ink-light text-xs">
              <li>Prediction inputs and risk scores (when consented)</li>
              <li>Uploaded medical documents (optional, deletable)</li>
              <li>Name, email, and account creation date</li>
            </ul>
          </div>
          <p className="mt-4 text-xs text-ink-ghost font-mono">
            File upload management coming in Phase 5.
          </p>
        </section>

        {/* Danger zone */}
        <section className="rounded-xl border border-status-high/30 bg-white p-6">
          <h2 className="text-sm font-semibold text-status-high uppercase tracking-wide mb-2">
            Danger Zone
          </h2>
          <p className="text-sm text-ink-mid mb-4">
            Permanently delete your account. This removes all your predictions,
            uploaded files, and personal data. This action cannot be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-lg border border-status-high text-status-high text-sm hover:bg-status-high-dim transition-colors"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-border shadow-xl p-6">
            <h3 id="delete-modal-title" className="font-serif text-xl text-ink mb-2">
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
              className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono mb-4 focus:outline-none focus:border-status-high"
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
                className="px-4 py-2 text-sm text-ink-mid hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleteConfirm !== "delete my account" || isDeleting}
                onClick={handleDeleteAccount}
                className="px-4 py-2 rounded-lg bg-status-high text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
