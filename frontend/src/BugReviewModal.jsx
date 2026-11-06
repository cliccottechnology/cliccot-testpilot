import { useEffect, useState, useMemo } from "react";
import api from "./api";
import StatusBadge from "./StatusBadge";
import Spinner from "./Spinner";

export default function BugReviewModal({
  bug,
  onClose,
  onUpdated,
  toast,
  role,
  currentUserId,
  users = [],
  bugsList = [],
  onSelectBug,
}) {
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // "overview", "fix", "verify", "reopen", "history"
  const [submitting, setSubmitting] = useState(false);
  const [actionType, setActionType] = useState(null); // "start_progress", "fix", "fix_next", "verify", "reopen", "close"
  const [navigatingBugId, setNavigatingBugId] = useState(null);
  const [assignedBugs, setAssignedBugs] = useState(bugsList || []);

  // Fix form state (Developer)
  const [fixForm, setFixForm] = useState({
    fix_notes: bug.fix_notes || "",
    root_cause: bug.root_cause || "",
    code_changes: bug.code_changes || "",
  });

  // Verify form state (Tester)
  const [verifyForm, setVerifyForm] = useState({
    verification_notes: bug.verification_notes || "",
    close: false,
  });

  // Reopen form state (Tester)
  const [reopenForm, setReopenForm] = useState({
    reopen_reason: "",
    assigned_developer: bug.assigned_developer || "",
  });

  const isTester = role === "Tester" || role === "Admin" || role === "Super Admin";
  const isDeveloper = role === "Developer" || role === "Admin" || role === "Super Admin";
  const isAssignedDev = bug.assigned_developer === currentUserId;

  // Sync bugs list for Developer queue navigation
  useEffect(() => {
    if (bugsList && bugsList.length > 0) {
      setAssignedBugs(bugsList);
    } else if (role === "Developer" && currentUserId) {
      api.get("/bugs/", { params: { assigned_developer: currentUserId, page_size: 50 } })
        .then(r => setAssignedBugs(r.data.results || []))
        .catch(() => {});
    } else {
      api.get("/bugs/", { params: { page_size: 50 } })
        .then(r => setAssignedBugs(r.data.results || []))
        .catch(() => {});
    }
  }, [bugsList, role, currentUserId]);

  // Current index in assigned bugs list
  const currentIndex = useMemo(() => {
    return assignedBugs.findIndex(b => b.id === bug.id);
  }, [assignedBugs, bug.id]);

  const prevBug = currentIndex > 0 ? assignedBugs[currentIndex - 1] : null;
  const nextBug = currentIndex >= 0 && currentIndex < assignedBugs.length - 1 ? assignedBugs[currentIndex + 1] : null;

  const loadHistory = () => {
    setBusy(true);
    api.get("/bug-histories/", { params: { bug: bug.id, page_size: 50 } })
      .then(r => setHistory(r.data.results || []))
      .catch(() => toast("Failed to load bug history"))
      .finally(() => setBusy(false));
  };

  useEffect(() => {
    setFixForm({
      fix_notes: bug.fix_notes || "",
      root_cause: bug.root_cause || "",
      code_changes: bug.code_changes || "",
    });
    setVerifyForm({
      verification_notes: bug.verification_notes || "",
      close: false,
    });
    setReopenForm({
      reopen_reason: "",
      assigned_developer: bug.assigned_developer || "",
    });
    loadHistory();
  }, [bug.id]);

  // Navigate to target bug in queue
  const goToBug = async targetBug => {
    if (!targetBug || navigatingBugId) return;
    setNavigatingBugId(targetBug.id);
    try {
      const res = await api.get(`/bugs/${targetBug.id}/`);
      if (onSelectBug) {
        onSelectBug(res.data);
      }
    } catch {
      toast("Failed to load selected bug");
    } finally {
      setNavigatingBugId(null);
    }
  };

  // 1. Developer: Start Progress
  const handleStartProgress = async () => {
    if (submitting) return;
    setSubmitting(true);
    setActionType("start_progress");
    try {
      await api.post(`/bugs/${bug.id}/start_progress/`);
      toast("▶️ Status updated to 'In Progress'. Happy fixing!");
      onUpdated();
      loadHistory();
    } catch (err) {
      toast(err.response?.data?.error || "Failed to update status");
    } finally {
      setSubmitting(false);
      setActionType(null);
    }
  };

  // 2. Developer: Submit Fix (Mandatory fix_notes description enforced)
  const handleFixSubmit = async (e, moveToNext = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (submitting) return;
    const notes = fixForm.fix_notes.trim();
    if (!notes) {
      toast("⚠️ Required: Every bug fix must include a description of what was changed before submitting.");
      return;
    }
    setSubmitting(true);
    setActionType(moveToNext ? "fix_next" : "fix");
    try {
      await api.post(`/bugs/${bug.id}/fix/`, fixForm);
      toast("✅ Bug marked as 'Fixed' and submitted for Tester verification!");
      onUpdated();
      loadHistory();

      if (moveToNext && nextBug) {
        toast(`Moved to next assigned bug: ${nextBug.code || "BUG-" + nextBug.id}`);
        await goToBug(nextBug);
      } else {
        setActiveTab("overview");
      }
    } catch (err) {
      toast(err.response?.data?.error || "Failed to submit fix");
    } finally {
      setSubmitting(false);
      setActionType(null);
    }
  };

  // 3. Tester Verification
  const handleVerifySubmit = async e => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setActionType("verify");
    try {
      await api.post(`/bugs/${bug.id}/verify/`, verifyForm);
      toast(verifyForm.close ? "Bug verified and closed!" : "Bug marked as Verified!");
      onUpdated();
      loadHistory();
      setActiveTab("overview");
    } catch (err) {
      toast(err.response?.data?.error || "Failed to verify bug");
    } finally {
      setSubmitting(false);
      setActionType(null);
    }
  };

  // 4. Reopen Bug (Tester)
  const handleReopenSubmit = async e => {
    e.preventDefault();
    if (submitting) return;
    if (!reopenForm.reopen_reason.trim()) {
      toast("Please provide a reason why the bug is being reopened.");
      return;
    }
    setSubmitting(true);
    setActionType("reopen");
    try {
      await api.post(`/bugs/${bug.id}/reopen/`, reopenForm);
      toast("Bug reopened and returned to developer!");
      onUpdated();
      loadHistory();
      setActiveTab("overview");
    } catch (err) {
      toast(err.response?.data?.error || "Failed to reopen bug");
    } finally {
      setSubmitting(false);
      setActionType(null);
    }
  };

  // 5. Close Bug
  const handleCloseBug = async () => {
    if (submitting) return;
    if (!confirm("Are you sure you want to close this bug?")) return;
    setSubmitting(true);
    setActionType("close");
    try {
      await api.post(`/bugs/${bug.id}/close_bug/`);
      toast("Bug has been closed.");
      onUpdated();
      loadHistory();
    } catch (err) {
      toast(err.response?.data?.error || "Failed to close bug");
    } finally {
      setSubmitting(false);
      setActionType(null);
    }
  };

  const developers = users.filter(u => u.role === "Developer" || u.role === "Admin");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 820, width: "95%" }}>
        {/* Modal Header with Bug Queue Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <span className="mono" style={{ fontWeight: 800, fontSize: 16, color: "var(--primary)" }}>
                {bug.code || `BUG-${bug.id}`}
              </span>
              <StatusBadge value={bug.status} />
              <StatusBadge value={bug.severity} />
              <StatusBadge value={`${bug.priority} Priority`} />
              {bug.reopen_count > 0 && (
                <span className="badge badge-danger" title={`Reopened ${bug.reopen_count} time(s)`}>
                  🔄 Reopened {bug.reopen_count}x
                </span>
              )}

              {/* Next / Previous Bug Queue Navigator */}
              {assignedBugs.length > 1 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 6, padding: "2px 8px", background: "var(--card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 11.5 }}>
                  <button
                    type="button"
                    disabled={!prevBug || Boolean(navigatingBugId) || submitting}
                    onClick={() => goToBug(prevBug)}
                    className={`btn-sec btn-sm ${navigatingBugId === prevBug?.id ? "is-loading" : ""}`}
                    style={{ padding: "2px 6px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                    title={prevBug ? `Previous: ${prevBug.code || "BUG-" + prevBug.id}` : "No previous bug in queue"}
                  >
                    {navigatingBugId === prevBug?.id && <Spinner size={10} color="var(--primary)" />}
                    ← Prev
                  </button>
                  <span style={{ fontWeight: 600, color: "var(--muted)", margin: "0 4px" }}>
                    Bug {currentIndex >= 0 ? currentIndex + 1 : "?"} of {assignedBugs.length}
                  </span>
                  <button
                    type="button"
                    disabled={!nextBug || Boolean(navigatingBugId) || submitting}
                    onClick={() => goToBug(nextBug)}
                    className={`btn-sec btn-sm ${navigatingBugId === nextBug?.id ? "is-loading" : ""}`}
                    style={{ padding: "2px 6px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}
                    title={nextBug ? `Next: ${nextBug.code || "BUG-" + nextBug.id}` : "No next bug in queue"}
                  >
                    {navigatingBugId === nextBug?.id && <Spinner size={10} color="var(--primary)" />}
                    Next →
                  </button>
                </div>
              )}
            </div>

            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3 }}>
              {bug.title}
            </h3>
            <div style={{ marginTop: 6, fontSize: 13, color: "var(--muted)", display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span>Project: <strong style={{ color: "var(--text-primary)" }}>{bug.project_name || "-"}</strong></span>
              <span>Page: <strong style={{ color: "var(--text-primary)" }}>{bug.page_name || "-"}</strong></span>
              {bug.sub_page_name && <span>Sub Page: <strong style={{ color: "var(--primary)" }}>{bug.sub_page_name}</strong></span>}
              <span>Reported By: <strong style={{ color: "var(--text-primary)" }}>{bug.reporter_name || "-"}</strong></span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--muted)", padding: 4 }}
            title="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Action Tabs */}
        <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <button
            type="button"
            className={`btn-sm ${activeTab === "overview" ? "btn-pri" : "btn-sec"}`}
            onClick={() => setActiveTab("overview")}
          >
            📋 Bug Details
          </button>

          {/* Developer Fix Tab */}
          {isDeveloper && (
            <button
              type="button"
              className={`btn-sm ${activeTab === "fix" ? "btn-pri" : "btn-sec"}`}
              onClick={() => setActiveTab("fix")}
            >
              🛠️ Developer Fix & Submit {bug.status === "Fixed" ? "✓" : ""}
            </button>
          )}

          {/* Tester Verification Tab */}
          {isTester && (
            <button
              type="button"
              className={`btn-sm ${activeTab === "verify" ? "btn-pri" : "btn-sec"}`}
              onClick={() => setActiveTab("verify")}
            >
              ✅ Tester Verification {bug.status === "Verified" || bug.status === "Closed" ? "✓" : ""}
            </button>
          )}

          {/* Reopen Tab (Tester) */}
          {isTester && (
            <button
              type="button"
              className={`btn-sm ${activeTab === "reopen" ? "btn-dng" : "btn-sec"}`}
              onClick={() => setActiveTab("reopen")}
              title="Reopen bug if not fixed properly"
            >
              🔄 Reopen Bug
            </button>
          )}

          <button
            type="button"
            className={`btn-sm ${activeTab === "history" ? "btn-pri" : "btn-sec"}`}
            onClick={() => setActiveTab("history")}
          >
            📜 Audit History ({history.length})
          </button>
        </div>

        {/* Tab 1: Overview & Bug Details */}
        {activeTab === "overview" && (
          <div>
            {/* Quick Status Action Bar */}
            <div style={{ padding: "12px 14px", background: "var(--card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Developer: <b>{bug.developer_name || "Unassigned"}</b></span>
                <span style={{ margin: "0 8px" }}>•</span>
                <span>Tester: <b>{bug.tester_name || "Unassigned"}</b></span>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                {/* 1. Developer Start Working */}
                {isDeveloper && (bug.status === "New" || bug.status === "Assigned" || bug.status === "Reopened") && (
                  <button
                    type="button"
                    className={`btn-pri btn-sm ${submitting && actionType === "start_progress" ? "is-loading" : ""}`}
                    disabled={submitting}
                    onClick={handleStartProgress}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  >
                    {submitting && actionType === "start_progress" ? (
                      <>
                        <Spinner size={12} color="#fff" />
                        <span>Starting…</span>
                      </>
                    ) : (
                      "▶️ Start Working (In Progress)"
                    )}
                  </button>
                )}

                {/* 2. Developer Fix Button */}
                {isDeveloper && bug.status !== "Fixed" && bug.status !== "Verified" && bug.status !== "Closed" && (
                  <button type="button" className="btn-suc btn-sm" disabled={submitting} onClick={() => setActiveTab("fix")}>
                    🛠️ Describe Fix & Mark Fixed
                  </button>
                )}

                {/* Move to Next Bug Quick Button */}
                {nextBug && (
                  <button
                    type="button"
                    className={`btn-sec btn-sm ${navigatingBugId === nextBug.id ? "is-loading" : ""}`}
                    disabled={Boolean(navigatingBugId) || submitting}
                    onClick={() => goToBug(nextBug)}
                    title={`Jump to next bug: ${nextBug.code || "BUG-" + nextBug.id}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                  >
                    {navigatingBugId === nextBug.id && <Spinner size={12} color="var(--primary)" />}
                    Next Bug →
                  </button>
                )}

                {/* Tester Verify Button */}
                {isTester && bug.status === "Fixed" && (
                  <button type="button" className="btn-suc btn-sm" disabled={submitting} onClick={() => setActiveTab("verify")}>
                    ✅ Verify Fix
                  </button>
                )}

                {/* Reopen Button */}
                {isTester && (bug.status === "Fixed" || bug.status === "Verified" || bug.status === "Closed") && (
                  <button type="button" className="btn-dng btn-sm" disabled={submitting} onClick={() => setActiveTab("reopen")}>
                    🔄 Reopen Bug
                  </button>
                )}

                {/* Close Button */}
                {isTester && bug.status !== "Closed" && (
                  <button
                    type="button"
                    className={`btn-sec btn-sm ${submitting && actionType === "close" ? "is-loading" : ""}`}
                    disabled={submitting}
                    onClick={handleCloseBug}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                  >
                    {submitting && actionType === "close" ? (
                      <>
                        <Spinner size={12} color="currentColor" />
                        <span>Closing…</span>
                      </>
                    ) : (
                      "🔒 Close Bug"
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Reopen Warning Banner if reopened */}
            {bug.status === "Reopened" && (
              <div style={{ padding: "12px 14px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--dng-border)", borderRadius: "var(--radius-md)", color: "var(--dng-text)", marginBottom: 16 }}>
                <b style={{ display: "block", marginBottom: 4 }}>⚠️ This bug was REOPENED by Tester (Not fixed properly)</b>
                <p style={{ margin: 0, fontSize: 13 }}>
                  <strong>Reason:</strong> {bug.reopen_reason || "Verification failed on the assigned page."}
                </p>
              </div>
            )}

            {/* Bug Details Description & Steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <b style={{ display: "block", fontSize: 13, marginBottom: 4, color: "var(--text-secondary)" }}>
                  Bug Description (Issue Details):
                </b>
                <div style={{ background: "var(--card)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13.5, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                  {bug.description || "No description provided."}
                </div>
              </div>

              {bug.steps_to_reproduce && (
                <div>
                  <b style={{ display: "block", fontSize: 13, marginBottom: 4, color: "var(--text-secondary)" }}>
                    Steps to Reproduce:
                  </b>
                  <div style={{ background: "var(--card)", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", fontSize: 13, whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>
                    {bug.steps_to_reproduce}
                  </div>
                </div>
              )}

              {/* Developer Fix Notes if available */}
              {bug.fix_notes && (
                <div style={{ padding: "12px 14px", background: "rgba(34, 197, 94, 0.08)", border: "1px solid var(--suc-border)", borderRadius: "var(--radius-md)" }}>
                  <b style={{ display: "block", fontSize: 13, marginBottom: 6, color: "var(--suc-text)" }}>
                    🛠️ Submitted Fix Description (Ready for Tester Verification):
                  </b>
                  <div style={{ fontSize: 13, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                    <strong>Changes / Solution:</strong> {bug.fix_notes}
                  </div>
                  {bug.root_cause && (
                    <div style={{ marginTop: 6, fontSize: 12.5, color: "var(--text-secondary)" }}>
                      <strong>Root Cause:</strong> {bug.root_cause}
                    </div>
                  )}
                  {bug.code_changes && (
                    <div style={{ marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--muted)" }}>
                      <strong>Code Changes:</strong> {bug.code_changes}
                    </div>
                  )}
                </div>
              )}

              {/* Tester Verification Notes if available */}
              {bug.verification_notes && (
                <div style={{ padding: "12px 14px", background: "rgba(99, 102, 241, 0.08)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)" }}>
                  <b style={{ display: "block", fontSize: 13, marginBottom: 4, color: "var(--primary)" }}>
                    ✅ Tester Verification Confirmation:
                  </b>
                  <div style={{ fontSize: 13, color: "var(--text-primary)" }}>
                    {bug.verification_notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Developer Fix & Submit Form */}
        {activeTab === "fix" && (
          <form onSubmit={handleFixSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Context Header: Bug details reminder */}
            <div style={{ padding: "12px 14px", background: "var(--card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                <b>Fixing Bug: <span style={{ color: "var(--primary)" }}>{bug.code}</span> - {bug.title}</b>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span>Status: <StatusBadge value={bug.status} /></span>
                  {bug.status !== "In Progress" && (
                    <button
                      type="button"
                      className={`btn-sec btn-sm ${submitting && actionType === "start_progress" ? "is-loading" : ""}`}
                      onClick={handleStartProgress}
                      disabled={submitting}
                      style={{ fontSize: 11, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}
                      title="Set status to In Progress"
                    >
                      {submitting && actionType === "start_progress" && <Spinner size={10} color="var(--primary)" />}
                      ▶️ Set In Progress
                    </button>
                  )}
                </div>
              </div>
              <div style={{ color: "var(--text-secondary)", fontSize: 12.5, whiteSpace: "pre-wrap", maxHeight: 90, overflowY: "auto", padding: "6px 8px", background: "var(--background)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <strong>Issue Description:</strong> {bug.description || "No description"}
              </div>
              {bug.reopen_reason && (
                <div style={{ marginTop: 6, color: "var(--dng-text)", fontSize: 12 }}>
                  <strong>⚠️ Tester Reopen Note:</strong> {bug.reopen_reason}
                </div>
              )}
            </div>

            {/* Mandatory Fix Description */}
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, marginBottom: 4, color: "var(--text-secondary)" }}>
                Description of Changes / Fixes Made <span style={{ color: "var(--dng-text)" }}>* (Required)</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="Explain what code, logic, or UI changes you made to resolve this bug (e.g. Added input sanitation to prevent SQL injection, corrected authentication token refresh interceptor)..."
                value={fixForm.fix_notes}
                onChange={e => setFixForm({ ...fixForm, fix_notes: e.target.value })}
                style={{ width: "100%", borderColor: !fixForm.fix_notes.trim() ? "var(--border)" : "var(--suc-border)" }}
              />
              <span style={{ fontSize: 11.5, color: "var(--muted)", display: "block", marginTop: 3 }}>
                💡 <b>Required:</b> Every bug fix must include a description of what was changed before submitting.
              </span>
            </div>

            {/* Optional Root Cause */}
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>
                Root Cause Analysis (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="What caused this issue? (e.g. Unhandled undefined state, missing database migration, expired session token)..."
                value={fixForm.root_cause}
                onChange={e => setFixForm({ ...fixForm, root_cause: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>

            {/* Optional Code Changes */}
            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>
                Code Changes (PR / Commit / Modified Files) (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. PR #42 (commit 8f192b): views.py (+12, -4), Resource.jsx"
                value={fixForm.code_changes}
                onChange={e => setFixForm({ ...fixForm, code_changes: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>

            {/* Developer Action Buttons */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
              {/* Submit and Stay */}
              <button
                type="button"
                className={`btn-suc ${submitting && actionType === "fix" ? "is-loading" : ""}`}
                disabled={submitting}
                onClick={e => handleFixSubmit(e, false)}
                title="Mark bug as Fixed with your description and notify the tester"
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {submitting && actionType === "fix" ? (
                  <>
                    <Spinner size={14} color="#fff" />
                    <span>Submitting Fix…</span>
                  </>
                ) : (
                  "✅ Submit Fix for Tester Verification"
                )}
              </button>

              {/* Submit and Move to Next Bug */}
              {nextBug && (
                <button
                  type="button"
                  className={`btn-pri ${submitting && actionType === "fix_next" ? "is-loading" : ""}`}
                  disabled={submitting}
                  onClick={e => handleFixSubmit(e, true)}
                  title={`Submit this fix and immediately open next assigned bug: ${nextBug.code || "BUG-" + nextBug.id}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  {submitting && actionType === "fix_next" ? (
                    <>
                      <Spinner size={14} color="#fff" />
                      <span>Saving & Loading Next…</span>
                    </>
                  ) : (
                    `✅ Submit Fix & Next Bug (${nextBug.code || "BUG-" + nextBug.id}) →`
                  )}
                </button>
              )}

              {/* Skip to Next Bug without submitting */}
              {nextBug && (
                <button
                  type="button"
                  className={`btn-sec btn-sm ${navigatingBugId === nextBug.id ? "is-loading" : ""}`}
                  disabled={submitting || Boolean(navigatingBugId)}
                  onClick={() => goToBug(nextBug)}
                  title="Move to the next bug without submitting this one"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                >
                  {navigatingBugId === nextBug.id && <Spinner size={12} color="var(--primary)" />}
                  Skip to Next Bug →
                </button>
              )}

              <button type="button" className="btn-sec btn-sm" disabled={submitting} onClick={() => setActiveTab("overview")}>
                Back to Details
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: Tester Verification Form */}
        {activeTab === "verify" && (
          <form onSubmit={handleVerifySubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "10px 14px", background: "var(--card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", fontSize: 13 }}>
              <b>Tester Action:</b> Verify developer's fix on page <strong>{bug.page_name || "the page"}</strong> and confirm resolution.
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>
                Tester Verification Notes
              </label>
              <textarea
                rows={3}
                placeholder="Describe your testing steps and confirmation (e.g. Tested on Chrome, Safari; verified discount recalculates correctly)..."
                value={verifyForm.verification_notes}
                onChange={e => setVerifyForm({ ...verifyForm, verification_notes: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={verifyForm.close}
                  onChange={e => setVerifyForm({ ...verifyForm, close: e.target.checked })}
                  style={{ width: "auto", margin: 0 }}
                />
                Also close bug completely (Status: Closed)
              </label>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                type="submit"
                className={`btn-suc ${submitting && actionType === "verify" ? "is-loading" : ""}`}
                disabled={submitting}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {submitting && actionType === "verify" ? (
                  <>
                    <Spinner size={14} color="#fff" />
                    <span>Confirming…</span>
                  </>
                ) : (
                  "✅ Confirm Resolved (Verified)"
                )}
              </button>
              <button type="button" className="btn-dng" disabled={submitting} onClick={() => setActiveTab("reopen")}>
                ❌ Not Fixed? Reopen Bug Instead
              </button>
              <button type="button" className="btn-sec" disabled={submitting} onClick={() => setActiveTab("overview")}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: Reopen Bug Form */}
        {activeTab === "reopen" && (
          <form onSubmit={handleReopenSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ padding: "10px 14px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "var(--radius-md)", border: "1px solid var(--dng-border)", fontSize: 13, color: "var(--dng-text)" }}>
              <b>Reopen Bug:</b> If the bug was not fixed properly, explain what failed during verification. The bug will be reassigned back to a developer.
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>
                Reason for Reopening <span style={{ color: "var(--dng-text)" }}>*</span>
              </label>
              <textarea
                rows={3}
                required
                placeholder="Explain what is still broken or why the fix failed verification..."
                value={reopenForm.reopen_reason}
                onChange={e => setReopenForm({ ...reopenForm, reopen_reason: e.target.value })}
                style={{ width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 4, color: "var(--text-secondary)" }}>
                Assign to Developer
              </label>
              <select
                value={reopenForm.assigned_developer}
                onChange={e => setReopenForm({ ...reopenForm, assigned_developer: e.target.value })}
                style={{ width: "100%" }}
              >
                <option value="">Select Developer...</option>
                {developers.map(d => (
                  <option key={d.id} value={d.id}>{d.username} ({d.role})</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                type="submit"
                className={`btn-dng ${submitting && actionType === "reopen" ? "is-loading" : ""}`}
                disabled={submitting}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {submitting && actionType === "reopen" ? (
                  <>
                    <Spinner size={14} color="#fff" />
                    <span>Reopening Bug…</span>
                  </>
                ) : (
                  "🔄 Reopen Bug & Return to Developer"
                )}
              </button>
              <button type="button" className="btn-sec" disabled={submitting} onClick={() => setActiveTab("overview")}>
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Tab 5: Audit History */}
        {activeTab === "history" && (
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              Bug Activity & Lifecycle Timeline
            </h4>
            {busy ? (
              <div className="loading-container" style={{ padding: "36px 16px" }}>
                <Spinner size={26} color="var(--primary)" strokeWidth={2.75} />
                <p style={{ margin: 0, fontSize: 13 }}>Loading audit history…</p>
              </div>
            ) : !history.length ? (
              <p style={{ color: "var(--muted)", fontSize: 13 }}>No audit history recorded yet.</p>
            ) : (
              <div className="timeline">
                {history.map(h => (
                  <div key={h.id} className="tl-item">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <strong style={{ color: "var(--text-primary)" }}>{h.user_name || "System"}</strong>
                        <span style={{ color: "var(--muted)", fontSize: 12.5 }}>action:</span>
                        <StatusBadge value={h.action} />
                        {h.status_before && (
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>
                            ({h.status_before} → {h.status_after})
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                    {h.notes && (
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
                        "{h.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
