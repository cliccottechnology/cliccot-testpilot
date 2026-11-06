import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import api from "./api";
import StatusBadge from "./StatusBadge";
import BugReviewModal from "./BugReviewModal";
import Spinner from "./Spinner";

const STATUS_COLORS = {
  New: "var(--accent, #00AEBB)",
  Assigned: "var(--primary, #06375F)",
  "In Progress": "#f59e0b",
  Fixed: "var(--secondary, #1D4B76)",
  Reopened: "#f43f5e",
  Verified: "#10b981",
  Closed: "var(--muted, #8CAFC4)",
};

const SEVERITY_COLORS = {
  Critical: "#ef4444",
  Major: "#f97316",
  Minor: "var(--accent, #00AEBB)",
  Trivial: "var(--muted, #8CAFC4)",
};

export default function Dashboard({ role, currentUserId, toast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionBugId, setActionBugId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedBug, setSelectedBug] = useState(null);
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  const loadData = () => {
    setLoading(true);
    const params = selectedProject ? { project: selectedProject } : {};
    api.get("/dashboard/", { params })
      .then(r => setData(r.data))
      .catch(() => {
        toast?.("Failed to refresh dashboard data");
      })
      .finally(() => setLoading(false));
  };

  const openBugModal = async bugId => {
    if (actionBugId) return;
    setActionBugId(bugId);
    try {
      const res = await api.get(`/bugs/${bugId}/`);
      setSelectedBug(res.data);
    } catch {
      toast?.("Failed to load defect details");
    } finally {
      setActionBugId(null);
    }
  };

  useEffect(() => {
    api.get("/projects/", { params: { page_size: 100 } })
      .then(r => setProjects(r.data.results || []))
      .catch(() => {});
    api.get("/users/", { params: { page_size: 100 } })
      .then(r => setUsers(r.data.results || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedProject]);

  // Derived calculation metrics
  const resolutionRate = useMemo(() => {
    if (!data || !data.total_bugs) return 0;
    return Math.round(((data.resolved_bugs || 0) / data.total_bugs) * 100);
  }, [data]);

  const activeWorkloadRatio = useMemo(() => {
    if (!data || !data.total_bugs) return 0;
    return Math.round(((data.open_bugs || 0) / data.total_bugs) * 100);
  }, [data]);

  const totalUrgentIssues = useMemo(() => {
    if (!data) return 0;
    return (data.reopened_bugs || 0) + (data.critical_bugs || 0);
  }, [data]);

  const tooltipStyle = {
    backgroundColor: "var(--surface)",
    borderColor: "var(--border)",
    borderRadius: "8px",
    color: "var(--text-primary)",
    boxShadow: "var(--shadow-md)",
    padding: "8px 12px",
    fontSize: "12px",
    fontWeight: "600",
  };

  if (!data) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 380, gap: 16, color: "var(--muted)" }}>
        <Spinner size={38} color="var(--primary)" strokeWidth={3} />
        <div style={{ textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>Loading QA & Defect Intelligence…</p>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>Aggregating real-time metrics across projects and workloads</p>
        </div>
      </div>
    );
  }

  const selectedProjectObj = projects.find(p => String(p.id) === String(selectedProject));

  return (
    <div className="page dash-container">
      {/* Executive Hero Banner & Command Bar */}
      <div className="dash-hero">
        <div className="dash-hero-title-area">
          <div className="dash-hero-badge-row">
            <span className="dash-live-badge">
              <span className="dash-live-dot" /> Live QA Engine
            </span>
            {role && (
              <span className="badge badge-neutral" style={{ fontSize: 11 }}>
                Role: <strong>{role}</strong>
              </span>
            )}
            {selectedProjectObj && (
              <span className="badge badge-info" style={{ fontSize: 11 }}>
                Scoped to: <strong>{selectedProjectObj.name}</strong>
              </span>
            )}
          </div>
          <h2 className="dash-hero-title">
            <span>🛡️</span> Defect Intelligence & QA Command Center
          </h2>
          <p className="dash-hero-subtitle">
            Real-time tracking of test results, active bug fixes, QA verifications, and quality health across all engineering modules.
          </p>
        </div>

        {/* Global Dashboard Controls */}
        <div className="dash-hero-actions">
          {/* Project Selector Filter */}
          <div className="dash-project-filter" title="Filter entire dashboard by Project">
            <span style={{ fontSize: 14 }}>📁</span>
            <select
              value={selectedProject}
              onChange={e => setSelectedProject(e.target.value)}
              aria-label="Filter dashboard by project"
            >
              <option value="">All Projects ({data.projects_count})</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Quick Refresh Button with Spinner */}
          <button
            type="button"
            className={`btn-sec ${loading ? "is-loading" : ""}`}
            disabled={loading}
            onClick={loadData}
            title="Refresh all metrics"
            style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
          >
            {loading ? <Spinner size={14} color="var(--primary)" /> : <span>🔄</span>}
            <span>{loading ? "Syncing…" : "Refresh"}</span>
          </button>

          {/* Report Bug CTA */}
          <button
            type="button"
            className="btn-pri"
            onClick={() => navigate("/bugs")}
            title="Log a new defect into the tracking system"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700 }}
          >
            <span>🐛</span>
            <span>+ Report Defect</span>
          </button>
        </div>
      </div>

      {/* 4-Tier Hero KPI Cards */}
      <div className="dash-kpi-grid">
        {/* Card 1: Total Defects */}
        <div
          className="dash-kpi-card kpi-indigo"
          onClick={() => navigate("/bugs")}
          title="View all registered defects"
        >
          <div className="dash-kpi-header">
            <span className="dash-kpi-title">TOTAL DEFECTS</span>
            <div className="dash-kpi-icon">📋</div>
          </div>
          <div className="dash-kpi-body">
            <div className="dash-kpi-number">{data.total_bugs}</div>
          </div>
          <div className="dash-kpi-footer">
            <span className="dash-kpi-tag">
              <span style={{ color: "var(--suc-text)" }}>{data.resolved_bugs}</span> resolved
            </span>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
              {resolutionRate}% rate
            </span>
          </div>
        </div>

        {/* Card 2: Active Workload */}
        <div
          className="dash-kpi-card kpi-amber"
          onClick={() => navigate("/bugs")}
          title="View open and in-progress defects"
        >
          <div className="dash-kpi-header">
            <span className="dash-kpi-title">ACTIVE WORKLOAD</span>
            <div className="dash-kpi-icon">⚡</div>
          </div>
          <div className="dash-kpi-body">
            <div className="dash-kpi-number">{data.open_bugs}</div>
          </div>
          <div className="dash-kpi-footer">
            <span className="dash-kpi-tag">
              <span style={{ color: "var(--wrn-text)" }}>{data.in_progress_bugs || 0}</span> in progress
            </span>
            <span style={{ fontWeight: 600, color: "var(--muted)" }}>
              {activeWorkloadRatio}% of total
            </span>
          </div>
        </div>

        {/* Card 3: Ready for QA Verification */}
        <div
          className="dash-kpi-card kpi-emerald"
          onClick={() => navigate("/bugs")}
          title="View bugs marked Fixed awaiting QA sign-off"
        >
          <div className="dash-kpi-header">
            <span className="dash-kpi-title">READY FOR QA</span>
            <div className="dash-kpi-icon">🔬</div>
          </div>
          <div className="dash-kpi-body">
            <div className="dash-kpi-number">{data.fixed_bugs}</div>
          </div>
          <div className="dash-kpi-footer">
            <span className="dash-kpi-tag" style={{ color: data.fixed_bugs > 0 ? "var(--suc-text)" : "var(--muted)" }}>
              {data.fixed_bugs > 0 ? "● Awaiting Verification" : "Queue is clear"}
            </span>
            <span className="badge badge-success" style={{ fontSize: 11, padding: "2px 6px" }}>
              Fixed
            </span>
          </div>
        </div>

        {/* Card 4: High Attention Blockers (Critical + Reopened) */}
        <div
          className="dash-kpi-card kpi-rose"
          onClick={() => navigate("/bugs")}
          title="View critical defects and reopened issues"
        >
          <div className="dash-kpi-header">
            <span className="dash-kpi-title">ATTENTION REQUIRED</span>
            <div className="dash-kpi-icon">🚨</div>
          </div>
          <div className="dash-kpi-body">
            <div className="dash-kpi-number" style={{ color: totalUrgentIssues > 0 ? "var(--dng-text)" : "var(--text-primary)" }}>
              {totalUrgentIssues}
            </div>
          </div>
          <div className="dash-kpi-footer">
            <span className="dash-kpi-tag" style={{ color: "var(--dng-text)" }}>
              {data.critical_bugs || 0} Critical
            </span>
            <span className="badge badge-danger" style={{ fontSize: 11, padding: "2px 6px" }}>
              {data.reopened_bugs || 0} Reopened
            </span>
          </div>
        </div>
      </div>

      {/* Operational Scope & Quality Health Strip */}
      <div className="dash-strip">
        <div className="dash-strip-item" onClick={() => navigate("/projects")} title="Manage projects">
          <div className="dash-strip-icon">📁</div>
          <div className="dash-strip-content">
            <div className="dash-strip-val">{data.projects_count}</div>
            <div className="dash-strip-label">Active Projects</div>
          </div>
        </div>

        <div className="dash-strip-item" onClick={() => navigate("/pages")} title="Manage pages">
          <div className="dash-strip-icon">📄</div>
          <div className="dash-strip-content">
            <div className="dash-strip-val">{data.pages_count}</div>
            <div className="dash-strip-label">Tracked Pages</div>
          </div>
        </div>

        <div className="dash-strip-item" onClick={() => navigate("/bugs")} title="View resolved defects">
          <div className="dash-strip-icon">✅</div>
          <div className="dash-strip-content">
            <div className="dash-strip-val">{data.resolved_bugs}</div>
            <div className="dash-strip-label">Verified & Closed</div>
          </div>
        </div>

        <div className="dash-strip-item" title="Overall Defect Resolution Rate">
          <div className="dash-strip-icon">📊</div>
          <div className="dash-strip-content">
            <div className="dash-strip-val" style={{ color: resolutionRate >= 70 ? "var(--suc-text)" : "var(--wrn-text)" }}>
              {resolutionRate}%
            </div>
            <div className="dash-strip-label">QA Resolution Efficiency</div>
          </div>
        </div>
      </div>

      {/* Donut Analytics: Status & Severity Distributions */}
      <div className="dash-analytics-grid">
        {/* Status Distribution Donut Card */}
        <div className="dash-chart-card">
          <div className="dash-chart-card-head">
            <h4 className="dash-chart-card-title">
              <span>📊</span> Defects by Lifecycle Status
            </h4>
            <span className="badge badge-neutral">{data.total_bugs} Total</span>
          </div>

          {!data.status_distribution?.length ? (
            <div className="dash-empty-state">
              <div className="dash-empty-icon">📈</div>
              <p className="dash-empty-title">No status records yet</p>
              <p className="dash-empty-desc">Create bugs to view live status distribution.</p>
            </div>
          ) : (
            <div className="dash-chart-wrap">
              <div className="dash-chart-donut-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.status_distribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={3}
                      stroke="var(--surface)"
                      strokeWidth={2}
                    >
                      {data.status_distribution.map((entry, index) => (
                        <Cell key={`cell-status-${index}`} fill={STATUS_COLORS[entry.name] || "var(--muted, #8CAFC4)"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="dash-donut-center">
                  <span className="dash-donut-center-val">{data.total_bugs}</span>
                  <span className="dash-donut-center-lbl">Defects</span>
                </div>
              </div>

              {/* Status Breakdown Legend List */}
              <div className="dash-legend-list">
                {data.status_distribution.map(item => {
                  const pct = data.total_bugs > 0 ? Math.round((item.value / data.total_bugs) * 100) : 0;
                  return (
                    <div key={item.name} className="dash-legend-item">
                      <div className="dash-legend-name">
                        <span
                          className="dash-legend-dot"
                          style={{ background: STATUS_COLORS[item.name] || "#94a3b8" }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <div className="dash-legend-values">
                        <span className="dash-legend-count">{item.value}</span>
                        <span className="dash-legend-pct">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Severity & Risk Distribution Card */}
        <div className="dash-chart-card">
          <div className="dash-chart-card-head">
            <h4 className="dash-chart-card-title">
              <span>⚠️</span> Severity & Risk Breakdown
            </h4>
            <span className={`badge ${data.critical_bugs > 0 ? "badge-danger" : "badge-success"}`}>
              {data.critical_bugs > 0 ? `${data.critical_bugs} Critical` : "No Critical"}
            </span>
          </div>

          {!data.severity_distribution?.length ? (
            <div className="dash-empty-state">
              <div className="dash-empty-icon">🛡️</div>
              <p className="dash-empty-title">No severity data available</p>
              <p className="dash-empty-desc">Defects will appear categorized by impact level.</p>
            </div>
          ) : (
            <div className="dash-chart-wrap">
              <div className="dash-chart-donut-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.severity_distribution}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={62}
                      outerRadius={92}
                      paddingAngle={3}
                      stroke="var(--surface)"
                      strokeWidth={2}
                    >
                      {data.severity_distribution.map((entry, index) => (
                        <Cell key={`cell-sev-${index}`} fill={SEVERITY_COLORS[entry.name] || "var(--muted, #8CAFC4)"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="dash-donut-center">
                  <span className="dash-donut-center-val" style={{ color: data.critical_bugs > 0 ? "var(--dng-text)" : "var(--text-primary)" }}>
                    {data.critical_bugs || 0}
                  </span>
                  <span className="dash-donut-center-lbl">Critical</span>
                </div>
              </div>

              {/* Severity Breakdown Legend List */}
              <div className="dash-legend-list">
                {data.severity_distribution.map(item => {
                  const pct = data.total_bugs > 0 ? Math.round((item.value / data.total_bugs) * 100) : 0;
                  return (
                    <div key={item.name} className="dash-legend-item">
                      <div className="dash-legend-name">
                        <span
                          className="dash-legend-dot"
                          style={{ background: SEVERITY_COLORS[item.name] || "#94a3b8" }}
                        />
                        <span>{item.name}</span>
                      </div>
                      <div className="dash-legend-values">
                        <span className="dash-legend-count">{item.value}</span>
                        <span className="dash-legend-pct">{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Queues: Tester Verification & Reopened Defect Alert */}
      <div className="dash-queues-grid">
        {/* Tester Verification Queue */}
        <div className="dash-queue-card">
          <div className="dash-queue-header">
            <h4 className="dash-queue-title">
              <span>✅</span> Tester Verification Queue
            </h4>
            <span className={`badge ${data.tester_queue?.length ? "badge-success" : "badge-neutral"}`}>
              {data.tester_queue?.length || 0} Ready for QA
            </span>
          </div>

          {!data.tester_queue?.length ? (
            <div className="dash-empty-state">
              <div className="dash-empty-icon" style={{ background: "var(--suc-bg)", color: "var(--suc-text)" }}>
                ✓
              </div>
              <p className="dash-empty-title">All Fixed Defects Verified</p>
              <p className="dash-empty-desc">No bugs currently awaiting tester verification. Great job team!</p>
            </div>
          ) : (
            <div className="dash-queue-list">
              {data.tester_queue.map(b => (
                <div key={b.id} className="dash-queue-item">
                  <div className="dash-queue-item-top">
                    <div className="dash-queue-item-title-wrap">
                      <div className="dash-queue-code-row">
                        <span className="dash-bug-code">BUG-{String(b.id).padStart(4, "0")}</span>
                        <StatusBadge value={b.severity} />
                        {b.priority && <StatusBadge value={b.priority} />}
                      </div>
                      <h5 className="dash-queue-item-title">{b.title}</h5>
                    </div>

                    <button
                      type="button"
                      className={`btn-suc btn-sm ${actionBugId === b.id ? "is-loading" : ""}`}
                      disabled={actionBugId === b.id}
                      onClick={() => openBugModal(b.id)}
                      title="Open verification dialog to confirm fix or reopen"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                    >
                      {actionBugId === b.id ? (
                        <>
                          <Spinner size={13} color="#fff" />
                          <span>Loading…</span>
                        </>
                      ) : (
                        <>
                          <span>✓</span>
                          <span>Verify Fix</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="dash-queue-meta-row">
                    {b.project__name && (
                      <span className="dash-meta-chip">
                        <span>📁</span> {b.project__name}
                      </span>
                    )}
                    {b.page__name && (
                      <span className="dash-meta-chip">
                        <span>📄</span> {b.page__name}
                      </span>
                    )}
                    <span className="dash-meta-chip">
                      <span className="dash-dev-avatar-sm">
                        {(b.assigned_developer__username || "U").slice(0, 2).toUpperCase()}
                      </span>
                      <span>Dev: {b.assigned_developer__username || "Unassigned"}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reopened Defect Attention Queue */}
        <div className="dash-queue-card queue-reopened">
          <div className="dash-queue-header">
            <h4 className="dash-queue-title" style={{ color: "var(--dng-text)" }}>
              <span>🔄</span> Reopened Defects Queue
            </h4>
            <span className={`badge ${data.reopened_queue?.length ? "badge-danger" : "badge-neutral"}`}>
              {data.reopened_queue?.length || 0} Requires Re-fix
            </span>
          </div>

          {!data.reopened_queue?.length ? (
            <div className="dash-empty-state">
              <div className="dash-empty-icon" style={{ background: "var(--card)", color: "var(--primary)" }}>
                ✨
              </div>
              <p className="dash-empty-title">Zero Reopened Defects</p>
              <p className="dash-empty-desc">Bug fixes are passing verification cleanly on the first pass.</p>
            </div>
          ) : (
            <div className="dash-queue-list">
              {data.reopened_queue.map(b => (
                <div key={b.id} className="dash-queue-item">
                  <div className="dash-queue-item-top">
                    <div className="dash-queue-item-title-wrap">
                      <div className="dash-queue-code-row">
                        <span className="dash-bug-code" style={{ borderColor: "rgba(244, 63, 94, 0.3)", color: "var(--dng-text)" }}>
                          BUG-{String(b.id).padStart(4, "0")}
                        </span>
                        <StatusBadge value={b.severity} />
                        <span className="badge badge-danger">
                          Reopened {b.reopen_count ? `${b.reopen_count}x` : "1x"}
                        </span>
                      </div>
                      <h5 className="dash-queue-item-title">{b.title}</h5>
                    </div>

                    <button
                      type="button"
                      className={`btn-pri btn-sm ${actionBugId === b.id ? "is-loading" : ""}`}
                      disabled={actionBugId === b.id}
                      onClick={() => openBugModal(b.id)}
                      title="Review tester notes and submit re-fix"
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}
                    >
                      {actionBugId === b.id ? (
                        <>
                          <Spinner size={13} color="#fff" />
                          <span>Opening…</span>
                        </>
                      ) : (
                        <>
                          <span>🛠️</span>
                          <span>Review & Fix</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Highlighted Reason Callout */}
                  <div className="dash-reopen-reason-box">
                    <strong>Tester Feedback:</strong> "{b.reopen_reason || "Verification failed during testing; defect reproduced."}"
                  </div>

                  <div className="dash-queue-meta-row">
                    {b.project__name && (
                      <span className="dash-meta-chip">
                        <span>📁</span> {b.project__name}
                      </span>
                    )}
                    {b.page__name && (
                      <span className="dash-meta-chip">
                        <span>📄</span> {b.page__name}
                      </span>
                    )}
                    <span className="dash-meta-chip">
                      <span className="dash-dev-avatar-sm" style={{ background: "rgba(244, 63, 94, 0.15)", color: "#f43f5e" }}>
                        {(b.assigned_developer__username || "U").slice(0, 2).toUpperCase()}
                      </span>
                      <span>Assigned: {b.assigned_developer__username || "Unassigned"}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Developer Workload & Recent Activity Feed */}
      <div className="dash-bottom-grid">
        {/* Developer Workload & Velocity */}
        <div className="card tw">
          <div className="card-head" style={{ borderBottom: "1px solid var(--border)", padding: "14px 18px" }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>👥</span> Developer Workload & Velocity
            </h4>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {data.dev_workload?.length || 0} Active Devs
            </span>
          </div>

          {!data.dev_workload?.length ? (
            <div className="dash-empty-state">
              <div className="dash-empty-icon">👥</div>
              <p className="dash-empty-title">No developers registered</p>
              <p className="dash-empty-desc">Developer assignment statistics will populate here.</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Developer</th>
                    <th>Active</th>
                    <th>Fixed</th>
                    <th>Reopened</th>
                    <th>Resolved</th>
                    <th style={{ width: 120 }}>Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dev_workload.map(d => {
                    const devTotal = d.total || (d.open + d.fixed + d.resolved);
                    const devPct = devTotal > 0 ? Math.round((d.resolved / devTotal) * 100) : 0;
                    return (
                      <tr key={d.id}>
                        <td>
                          <div className="dash-dev-row">
                            <div className="dash-dev-avatar">
                              {d.username.slice(0, 2).toUpperCase()}
                            </div>
                            <strong>{d.username}</strong>
                          </div>
                        </td>
                        <td><StatusBadge value={`${d.open} Open`} /></td>
                        <td><StatusBadge value={`${d.fixed} Fixed`} /></td>
                        <td>
                          {d.reopened > 0 ? (
                            <span className="badge badge-danger">{d.reopened} Reopened</span>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>-</span>
                          )}
                        </td>
                        <td>
                          <span style={{ color: "var(--suc-text)", fontWeight: 700 }}>
                            {d.resolved} Done
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 600 }}>
                              <span style={{ color: "var(--muted)" }}>{devPct}%</span>
                            </div>
                            <div className="dash-progress-track">
                              <div
                                className="dash-progress-fill"
                                style={{
                                  width: `${devPct}%`,
                                  background: devPct >= 70 ? "var(--suc-solid)" : devPct >= 40 ? "var(--primary)" : "var(--wrn-solid)",
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Live Defect Audit Activity Trail */}
        <div className="card">
          <div className="card-head" style={{ borderBottom: "1px solid var(--border)", padding: "14px 18px" }}>
            <h4 style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>🕒</span> Recent Defect Activity
            </h4>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Live audit log</span>
          </div>

          {!data.recent_history?.length ? (
            <div className="dash-empty-state">
              <div className="dash-empty-icon">📝</div>
              <p className="dash-empty-title">No recent activity</p>
              <p className="dash-empty-desc">Audit logs of defect updates will stream here in real time.</p>
            </div>
          ) : (
            <div className="dash-activity-list">
              {data.recent_history.map(h => (
                <div key={h.id} className="dash-activity-item">
                  <div className="dash-activity-avatar">
                    {(h.user__username || "S").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="dash-activity-main">
                    <div className="dash-activity-line">
                      <span className="dash-activity-user">{h.user__username || "System"}</span>
                      <StatusBadge value={h.action} />
                      <span
                        className="dash-activity-bug-tag"
                        onClick={() => openBugModal(h.bug__id || h.bug_id)}
                        title="Click to view bug"
                      >
                        BUG-{String(h.bug__id || h.bug_id).padStart(4, "0")}
                      </span>
                    </div>

                    {h.notes && (
                      <p className="dash-activity-notes">{h.notes}</p>
                    )}

                    <div className="dash-activity-time">
                      <span>🕒</span>
                      <span>
                        {new Date(h.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {" · "}
                        {new Date(h.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Connected Bug Review Modal */}
      {selectedBug && (
        <BugReviewModal
          bug={selectedBug}
          onClose={() => setSelectedBug(null)}
          onUpdated={() => {
            loadData();
            api.get(`/bugs/${selectedBug.id}/`)
              .then(res => setSelectedBug(res.data))
              .catch(() => {});
          }}
          toast={toast || (() => {})}
          role={role}
          currentUserId={currentUserId}
          users={users}
          bugsList={(data.tester_queue || []).concat(data.reopened_queue || [])}
          onSelectBug={nextBug => setSelectedBug(nextBug)}
        />
      )}
    </div>
  );
}
