import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "./api";
import { RES } from "./resources";
import BugReviewModal from "./BugReviewModal";
import StatusBadge from "./StatusBadge";
import Spinner from "./Spinner";

const BADGE_COLUMNS = new Set(["status", "priority", "severity", "role", "is_active"]);

const DELETED_COLS = {
  projects: ["name", "status", "created_by_user", "deleted_by_user", "deleted_at"],
  pages: ["name", "sub_page_name", "project_name", "created_by_user", "deleted_by_user", "deleted_at"],
  bugs: ["code", "title", "project_name", "page_name", "severity", "deleted_by_user", "deleted_at"],
  users: ["username", "email", "role", "created_by_user", "deleted_by_user", "deleted_at"],
};

export default function Resource({ name, toast, role, currentUserId }) {
  const cfg = RES[name];
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [tab, setTab] = useState("active"); // "active" | "deleted"
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(null);
  const [opts, setOpts] = useState({ project: [], projects: [], page: [], pages: [], users: [] });
  const [loadingOpts, setLoadingOpts] = useState(false);
  const [busy, setBusy] = useState(true);
  const [selectedBug, setSelectedBug] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [permDeletingId, setPermDeletingId] = useState(null);
  const [confirmPermanent, setConfirmPermanent] = useState(null);
  const [loadingBugId, setLoadingBugId] = useState(null);

  // Filters for Bugs & Pages
  const [filterProject, setFilterProject] = useState(searchParams.get("project") || "");
  const [filterPage, setFilterPage] = useState(searchParams.get("page_id") || searchParams.get("page") || "");
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterMyBugs, setFilterMyBugs] = useState(false);
  const [filterRole, setFilterRole] = useState("");

  const isSuperAdmin = role === "Super Admin";
  const canWrite = name === "users" ? isSuperAdmin : role !== "Viewer";

  // Sync url query params
  useEffect(() => {
    const proj = searchParams.get("project");
    const pg = searchParams.get("page_id") || searchParams.get("page");
    const st = searchParams.get("status");
    if (proj) setFilterProject(proj);
    if (pg) setFilterPage(pg);
    if (st) setFilterStatus(st);
  }, [searchParams]);

  // Load relation options (projects, pages, users) - ALWAYS fresh from API
  const loadOptions = useCallback(() => {
    setLoadingOpts(true);
    const p1 = api.get("/projects/", { params: { page_size: 100 } })
      .then(r => {
        const projs = r.data.results || [];
        setOpts(o => ({ ...o, project: projs, projects: projs }));
        return projs;
      })
      .catch(() => []);

    const p2 = api.get("/pages/", { params: { page_size: 100 } })
      .then(r => {
        const pgs = r.data.results || [];
        setOpts(o => ({ ...o, page: pgs, pages: pgs }));
        return pgs;
      })
      .catch(() => []);

    const p3 = api.get("/users/", { params: { page_size: 100 } })
      .then(r => {
        const users = r.data.results || [];
        setOpts(o => ({
          ...o,
          users,
          assigned_developer: users.filter(u => u.role === "Developer" || u.role === "Admin"),
          assigned_tester: users.filter(u => u.role === "Tester" || u.role === "Admin"),
        }));
        return users;
      })
      .catch(() => []);

    Promise.all([p1, p2, p3]).finally(() => setLoadingOpts(false));
  }, []);

  // Fetch options whenever active resource route changes
  useEffect(() => {
    loadOptions();
  }, [name, loadOptions]);

  // Fetch resource records with active filters
  const load = useCallback(() => {
    setBusy(true);
    const isDeleted = tab === "deleted";
    const params = { page, search: q, is_deleted: isDeleted };

    if (name === "bugs") {
      if (filterProject) params.project = filterProject;
      if (filterPage) params.page_id = filterPage;
      if (filterStatus) params.status = filterStatus;
      if (filterSeverity) params.severity = filterSeverity;
      if (filterMyBugs && currentUserId) {
        if (role === "Developer") {
          params.assigned_developer = currentUserId;
        } else if (role === "Tester") {
          params.assigned_tester = currentUserId;
        }
      }
    } else if (name === "pages") {
      if (filterProject) params.project = filterProject;
    } else if (name === "users") {
      if (filterRole) params.role = filterRole;
    }

    // 1. Fetch current tab dataset
    api.get(`/${name}/`, { params })
      .then(r => {
        setRows(r.data.results || []);
        const total = r.data.count || 0;
        setCount(total);
        if (isDeleted) {
          setDeletedCount(total);
        } else {
          setActiveCount(total);
        }
      })
      .catch(() => toast("Failed to load records"))
      .finally(() => setBusy(false));

    // 2. Query opposite count to keep badge in sync
    api.get(`/${name}/`, { params: { is_deleted: !isDeleted, page_size: 1 } })
      .then(r => {
        const otherCount = r.data.count || 0;
        if (isDeleted) {
          setActiveCount(otherCount);
        } else {
          setDeletedCount(otherCount);
        }
      })
      .catch(() => {});
  }, [name, page, q, tab, filterProject, filterPage, filterStatus, filterSeverity, filterMyBugs, filterRole, currentUserId, role]);

  useEffect(() => {
    setPage(1);
    setTab("active");
    setRows([]);
    setCount(0);
    setActiveCount(0);
    setDeletedCount(0);
    setForm(null);
    setSelectedBug(null);
    setConfirmPermanent(null);
  }, [name]);

  useEffect(load, [load]);

  // Open Record Modal (ensures relations are freshly loaded)
  const openForm = (init = {}) => {
    loadOptions();
    setForm(init);
  };

  // Open Bug Creation Form with pre-filled defaults
  const openNewBugModal = (customProjId, customPageId) => {
    loadOptions();
    const init = {
      severity: "Minor",
      priority: "Medium",
      status: "New",
    };
    if (customProjId || filterProject) {
      init.project = Number(customProjId || filterProject);
    }
    if (customPageId || filterPage) {
      init.page = Number(customPageId || filterPage);
    }
    if (role === "Tester" && currentUserId) {
      init.assigned_tester = currentUserId;
    }
    setForm(init);
  };

  // Open bug modal if newBug query param is present
  useEffect(() => {
    if (name === "bugs" && searchParams.get("newBug")) {
      const proj = searchParams.get("project");
      const pg = searchParams.get("page_id") || searchParams.get("page");
      openNewBugModal(proj, pg);
      const next = new URLSearchParams(searchParams);
      next.delete("newBug");
      setSearchParams(next, { replace: true });
    }
  }, [name, searchParams]);

  // Fetch detailed bug and open review modal
  const openBugModal = async bugRow => {
    if (loadingBugId) return;
    setLoadingBugId(bugRow.id);
    try {
      const res = await api.get(`/bugs/${bugRow.id}/`);
      setSelectedBug(res.data);
    } catch {
      setSelectedBug(bugRow);
    } finally {
      setLoadingBugId(null);
    }
  };

  // Save Record (Create or Edit)
  const save = async e => {
    e.preventDefault();
    if (saving) return;

    // If bug status is Fixed, ensure fix_notes is provided (fallback to steps_to_reproduce if entered there)
    if (name === "bugs" && form.status === "Fixed") {
      let notes = (form.fix_notes || "").trim();
      if (!notes) {
        if ((form.steps_to_reproduce || "").trim()) {
          notes = form.steps_to_reproduce.trim();
          form.fix_notes = notes;
        } else {
          toast("⚠️ Required: Please enter a Description of Changes Made before marking as Fixed.");
          return;
        }
      }
    }

    const d = Object.fromEntries(
      Object.entries(form).filter(([, v]) => v !== "" && v !== undefined)
    );
    setSaving(true);
    try {
      if (form.id) {
        await api.patch(`/${name}/${form.id}/`, d);
        toast("Record updated successfully");
      } else {
        await api.post(`/${name}/`, d);
        toast(name === "bugs" ? "Bug created and assigned to developer!" : "Record created successfully");
      }
      setForm(null);
      load();
      loadOptions(); // refresh relation caches
    } catch (err) {
      const errData = err.response?.data;
      const msg = typeof errData === "object" ? Object.values(errData).flat().join(" ") : "Save failed";
      toast(String(msg).slice(0, 160));
    } finally {
      setSaving(false);
    }
  };

  // Delete Record (Soft delete to Delete History, or Permanent delete)
  const del = async (id, isPermanent = false) => {
    if (deletingId || permDeletingId) return;
    if (!isPermanent) {
      if (!confirm("Move this record to Delete History? You can restore it at any time.")) return;
      setDeletingId(id);
    } else {
      setPermDeletingId(id);
    }

    try {
      const url = isPermanent ? `/${name}/${id}/permanent/` : `/${name}/${id}/`;
      const res = await api.delete(url, { params: isPermanent ? { permanent: true } : {} });
      toast(res.data?.detail || (isPermanent ? "Record permanently deleted." : "Record moved to Delete History."));
      load();
      loadOptions();
    } catch (e) {
      const err = e.response?.data?.detail || "Delete operation failed.";
      toast(`⚠️ ${err}`);
    } finally {
      setDeletingId(null);
      setPermDeletingId(null);
      setConfirmPermanent(null);
    }
  };

  // Restore Record from Delete History
  const restoreRecord = async id => {
    if (restoringId) return;
    setRestoringId(id);
    try {
      const res = await api.post(`/${name}/${id}/restore/`);
      toast(res.data?.detail || "Record restored successfully!");
      load();
      loadOptions();
    } catch (e) {
      const err = e.response?.data?.detail || "Restore operation failed.";
      toast(`⚠️ ${err}`);
    } finally {
      setRestoringId(null);
    }
  };

  // Render Table Cells with contextual styling
  const renderCell = (col, val, row) => {
    if (col === "sub_page_name") {
      return val ? (
        <span style={{ fontWeight: 600, color: "var(--pri)" }}>{val}</span>
      ) : (
        <span style={{ color: "var(--tx-muted)" }}>-</span>
      );
    }
    if (col === "code") {
      return (
        <span
          className="mono"
          style={{ fontWeight: 800, color: "var(--pri)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
          onClick={() => openBugModal(row)}
          title="Click to view bug fix & verification details"
        >
          {loadingBugId === row.id && <Spinner size={12} color="var(--pri)" />}
          {val || "-"}
        </span>
      );
    }
    if (col === "reopen_count") {
      if (val > 0) {
        return <span className="badge badge-danger">Reopened {val}x</span>;
      }
      return <span style={{ color: "var(--tx-muted)" }}>0</span>;
    }
    if (col === "pages_count" || col === "bugs_count" || col === "open_bugs_count") {
      const isPositive = Number(val) > 0;
      return (
        <span style={{ fontWeight: 600, color: col === "open_bugs_count" && isPositive ? "var(--dng-text)" : "var(--tx-primary)" }}>
          {val ?? 0}
        </span>
      );
    }
    if (col === "created_by_user") {
      const creator = val || (row.created_by_name ? { username: row.created_by_name } : null);
      if (!creator) {
        return (
          <div className="creator-cell" title="System Administrator">
            <div className="creator-avatar creator-avatar-system">⚙️</div>
            <div className="creator-text">
              <span className="creator-name">System Admin</span>
              <span className="creator-role-tag">Super Admin</span>
            </div>
          </div>
        );
      }

      const displayName = creator.full_name || creator.username || "User";
      const initials = (creator.first_name && creator.last_name)
        ? `${creator.first_name[0]}${creator.last_name[0]}`.toUpperCase()
        : (displayName.slice(0, 2)).toUpperCase();
      const roleText = creator.role || "Member";
      const roleSlug = (creator.role || "default").toLowerCase().replace(/\s+/g, "-");

      return (
        <div className="creator-cell" title={creator.email ? `${displayName} (${creator.email})` : displayName}>
          <div className={`creator-avatar creator-role-${roleSlug}`}>
            {initials}
          </div>
          <div className="creator-text">
            <span className="creator-name">{displayName}</span>
            <div className="creator-meta">
              <span className={`creator-role-badge role-${roleSlug}`}>
                {roleText}
              </span>
              {creator.username && creator.username !== displayName && (
                <span className="creator-username">@{creator.username}</span>
              )}
            </div>
          </div>
        </div>
      );
    }
    if (col === "deleted_by_user") {
      const deleter = val || (row.deleted_by_name ? { username: row.deleted_by_name } : null);
      if (!deleter) {
        return (
          <div className="creator-cell" title="System / Admin Deletion">
            <div className="creator-avatar creator-avatar-system">🗑️</div>
            <div className="creator-text">
              <span className="creator-name">Admin</span>
              <span className="creator-role-tag">Super Admin</span>
            </div>
          </div>
        );
      }

      const displayName = deleter.full_name || deleter.username || "User";
      const initials = (deleter.first_name && deleter.last_name)
        ? `${deleter.first_name[0]}${deleter.last_name[0]}`.toUpperCase()
        : (displayName.slice(0, 2)).toUpperCase();
      const roleText = deleter.role || "Member";
      const roleSlug = (deleter.role || "default").toLowerCase().replace(/\s+/g, "-");

      return (
        <div className="creator-cell" title={deleter.email ? `${displayName} (${deleter.email})` : displayName}>
          <div className={`creator-avatar creator-role-${roleSlug}`}>
            {initials}
          </div>
          <div className="creator-text">
            <span className="creator-name">{displayName}</span>
            <div className="creator-meta">
              <span className={`creator-role-badge role-${roleSlug}`}>
                {roleText}
              </span>
              {deleter.username && deleter.username !== displayName && (
                <span className="creator-username">@{deleter.username}</span>
              )}
            </div>
          </div>
        </div>
      );
    }
    if (col === "deleted_at") {
      if (!val) return <span style={{ color: "var(--tx-muted)" }}>-</span>;
      const d = new Date(val);
      const dateStr = d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
      const timeStr = d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tx-primary)" }}>{dateStr}</span>
          <span style={{ fontSize: 11, color: "var(--tx-muted)" }}>{timeStr}</span>
        </div>
      );
    }
    if (BADGE_COLUMNS.has(col)) {
      return <StatusBadge value={val} />;
    }
    if (val === true) return <StatusBadge value={true} />;
    if (val === false) return <StatusBadge value={false} />;
    if (val === null || val === undefined || val === "") return <span style={{ color: "var(--tx-faint)" }}>-</span>;
    if (col === "created_at") {
      return <span style={{ fontSize: 12.5, color: "var(--tx-secondary)" }}>{String(val).slice(0, 10)}</span>;
    }
    return String(val);
  };

  // Available sub-pages for selected project and page in bug form
  const subPageOptions = useMemo(() => {
    if (name !== "bugs") return [];
    const allPages = opts.page || opts.pages || [];
    const projectPages = allPages.filter(p => !form?.project || String(p.project) === String(form.project) || String(p.project_id) === String(form.project));

    if (form?.page) {
      const selectedPageObj = projectPages.find(p => String(p.id) === String(form.page));
      const pageBaseName = selectedPageObj ? selectedPageObj.name : "";

      const matching = projectPages
        .filter(p => p.name === pageBaseName && p.sub_page_name && p.sub_page_name.trim())
        .map(p => p.sub_page_name.trim());

      const uniqueMatching = Array.from(new Set(matching));
      if (uniqueMatching.length > 0) return uniqueMatching;
    }

    const allSub = projectPages
      .filter(p => p.sub_page_name && p.sub_page_name.trim())
      .map(p => p.sub_page_name.trim());
    return Array.from(new Set(allSub));
  }, [name, form?.project, form?.page, opts.page, opts.pages]);

  // Filtered pages for the bug creation form based on selected project
  const formPages = useMemo(() => {
    const allPages = opts.page || opts.pages || [];
    if (!form?.project) return allPages;
    return allPages.filter(p => String(p.project) === String(form.project) || String(p.project_id) === String(form.project));
  }, [form?.project, opts.page, opts.pages]);

  // Columns to display based on active records tab vs delete history tab
  const displayCols = useMemo(() => {
    return tab === "deleted" ? (DELETED_COLS[name] || cfg.cols) : cfg.cols;
  }, [tab, name, cfg.cols]);

  return (
    <div className="page">
      {/* Module Header */}
      <div className="page-header">
        <div className="page-title-wrap">
          <h2>{cfg.title}</h2>
          <p>
            {tab === "deleted"
              ? `Deleted records archive for ${cfg.title.toLowerCase()}. Review who deleted each item and restore when needed.`
              : name === "bugs"
              ? "Testers can create bugs and assign them to developers. Developers fix issues, and testers verify or reopen."
              : cfg.desc || `Manage and view ${cfg.title.toLowerCase()}`}
          </p>
        </div>
        {tab === "active" ? (
          canWrite && (
            <button
              className="btn-pri"
              onClick={() => {
                if (name === "bugs") {
                  openNewBugModal();
                } else {
                  const init = {};
                  if (name === "pages") {
                    if (filterProject) {
                      init.project = Number(filterProject);
                    } else if (opts.project?.length) {
                      init.project = opts.project[0].id;
                    }
                    init.status = "Active";
                  }
                  openForm(init);
                }
              }}
            >
              <span>+</span> {name === "bugs" ? "🐛 Report Bug & Assign Dev" : name === "users" ? "Create New User Role" : `New ${cfg.title.replace(/s$/, "")}`}
            </button>
          )
        ) : (
          <button
            type="button"
            className="btn-sec"
            onClick={() => { setTab("active"); setPage(1); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span>←</span>
            <span>Back to Active {cfg.title}</span>
          </button>
        )}
      </div>

      {/* Module View Tabs (Active Records vs Delete History) */}
      <div className="module-view-tabs">
        <button
          type="button"
          className={`module-tab ${tab === "active" ? "active" : ""}`}
          onClick={() => { setTab("active"); setPage(1); }}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-label">Active {cfg.title}</span>
          <span className="tab-badge">{tab === "active" ? count : activeCount}</span>
        </button>

        <button
          type="button"
          className={`module-tab ${tab === "deleted" ? "active tab-deleted" : ""}`}
          onClick={() => { setTab("deleted"); setPage(1); }}
        >
          <span className="tab-icon">🗑️</span>
          <span className="tab-label">Delete History</span>
          <span className={`tab-badge ${deletedCount > 0 ? "tab-badge-danger" : ""}`}>
            {tab === "deleted" ? count : deletedCount}
          </span>
        </button>
      </div>

      {/* Delete History Information Banner */}
      {tab === "deleted" && (
        <div className="delete-history-banner">
          <div className="dh-icon">🗑️</div>
          <div className="dh-text">
            <b>Delete History Audit & Recovery Center ({cfg.title})</b>
            <span>
              All deleted {cfg.title.toLowerCase()} are archived here with deletion details (who deleted & timestamp). You can restore any record back to active records at any time or permanently delete it.
            </span>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: "12px 16px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          {/* Search box */}
          <div style={{ display: "flex", gap: 8, flex: "1 1 240px", maxWidth: 360 }}>
            <input
              className="search-bar"
              placeholder={`Search ${cfg.title.toLowerCase()}…`}
              value={q}
              onChange={e => {
                setQ(e.target.value);
                setPage(1);
              }}
              style={{ width: "100%", padding: "7px 12px" }}
            />
            {q && (
              <button className="btn-sec btn-sm" onClick={() => setQ("")}>
                Clear
              </button>
            )}
          </div>

          {/* Module-Specific Filter Dropdowns */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* Project Filter (for Bugs and Pages) */}
            {(name === "bugs" || name === "pages") && (
              <select
                value={filterProject}
                onChange={e => {
                  setFilterProject(e.target.value);
                  setFilterPage("");
                  setPage(1);
                }}
                style={{ padding: "6px 10px", fontSize: 13 }}
              >
                <option value="">All Projects</option>
                {(opts.project || opts.projects || []).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}

            {/* Page Filter (for Bugs) */}
            {name === "bugs" && (
              <select
                value={filterPage}
                onChange={e => {
                  setFilterPage(e.target.value);
                  setPage(1);
                }}
                style={{ padding: "6px 10px", fontSize: 13 }}
              >
                <option value="">All Pages</option>
                {(opts.page || opts.pages || [])
                  .filter(pg => !filterProject || String(pg.project) === String(filterProject))
                  .map(pg => (
                    <option key={pg.id} value={pg.id}>
                      {pg.sub_page_name ? `${pg.name} > ${pg.sub_page_name}` : pg.name}
                    </option>
                  ))}
              </select>
            )}

            {/* Status Filter (for Bugs) */}
            {name === "bugs" && (
              <select
                value={filterStatus}
                onChange={e => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                style={{ padding: "6px 10px", fontSize: 13 }}
              >
                <option value="">All Statuses</option>
                {["New", "Assigned", "In Progress", "Fixed", "Reopened", "Verified", "Closed"].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            {/* Severity Filter (for Bugs) */}
            {name === "bugs" && (
              <select
                value={filterSeverity}
                onChange={e => {
                  setFilterSeverity(e.target.value);
                  setPage(1);
                }}
                style={{ padding: "6px 10px", fontSize: 13 }}
              >
                <option value="">All Severities</option>
                {["Critical", "Major", "Minor", "Trivial"].map(sev => (
                  <option key={sev} value={sev}>{sev}</option>
                ))}
              </select>
            )}

            {/* My Bugs Toggle (for Bugs) */}
            {name === "bugs" && currentUserId && (
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--tx-secondary)", cursor: "pointer", marginLeft: 4 }}>
                <input
                  type="checkbox"
                  checked={filterMyBugs}
                  onChange={e => {
                    setFilterMyBugs(e.target.checked);
                    setPage(1);
                  }}
                  style={{ width: "auto", margin: 0 }}
                />
                <b>{role === "Developer" ? "My Assigned Bugs" : "My QA Bugs"}</b>
              </label>
            )}

            {/* Role Filter (for Users) */}
            {name === "users" && (
              <select
                value={filterRole}
                onChange={e => {
                  setFilterRole(e.target.value);
                  setPage(1);
                }}
                style={{ padding: "6px 10px", fontSize: 13 }}
              >
                <option value="">All Roles</option>
                {["Developer", "Tester", "Admin", "Super Admin"].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}

            {/* Reset Filter Button */}
            {(filterProject || filterPage || filterStatus || filterSeverity || filterMyBugs || filterRole) && (
              <button
                type="button"
                className="btn-sec btn-sm"
                onClick={() => {
                  setFilterProject("");
                  setFilterPage("");
                  setFilterStatus("");
                  setFilterSeverity("");
                  setFilterMyBugs(false);
                  setFilterRole("");
                  setSearchParams({});
                }}
              >
                Reset Filters
              </button>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              className={`btn-sec btn-sm ${busy ? "is-loading" : ""}`}
              disabled={busy}
              onClick={() => {
                load();
                loadOptions();
              }}
              title="Refresh records from server"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {busy ? <Spinner size={12} color="var(--pri)" /> : <span>🔄</span>}
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Record Creation & Edit Modal */}
      {form && (
        <div className="modal-backdrop" onClick={() => setForm(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 680, width: "95%" }}>
            <div className="card-head" style={{ borderBottom: "1px solid var(--border-default)", paddingBottom: 12, marginBottom: 16 }}>
              <div>
                <h4 style={{ margin: 0 }}>
                  {form.id
                    ? (name === "users" ? "Edit User Role" : `Edit ${cfg.title.replace(/s$/, "")}`)
                    : name === "bugs"
                    ? "Report Bug & Assign to Developer"
                    : name === "users"
                    ? "Create New User Role"
                    : `Create New ${cfg.title.replace(/s$/, "")}`}
                </h4>
                {name === "users" && !form.id && (
                  <span style={{ fontSize: 12, color: "var(--tx-muted)", display: "block", marginTop: 4 }}>
                    Define a new user account and assign their role (Developer, Tester, Admin, Super Admin).
                  </span>
                )}
                {name === "bugs" && !form.id && (
                  <span style={{ fontSize: 12, color: "var(--tx-muted)", display: "block", marginTop: 4 }}>
                    Create defect report as <b>{role}</b> and assign a developer to resolve it.
                  </span>
                )}
                {name === "pages" && !form.id && (
                  <span style={{ fontSize: 12, color: "var(--tx-muted)", display: "block", marginTop: 4 }}>
                    Define an application page and link it to an existing project.
                  </span>
                )}
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setForm(null)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: saving ? "not-allowed" : "pointer", color: "var(--tx-muted)" }}
              >
                ✕
              </button>
            </div>

            {name === "bugs" && !form.id && (
              <div style={{ padding: "8px 12px", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-default)", marginBottom: 14, fontSize: 12.5, color: "var(--tx-secondary)" }}>
                💡 <b>Tip:</b> Select the Project first to view its specific Pages. Assign a Developer who will receive an alert to fix this issue.
              </div>
            )}

            <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
              {cfg.fields.map(x => {
                // Hide fix_notes when reporting a new bug (only show when editing or when status is Fixed)
                if (name === "bugs" && x.k === "fix_notes" && !form.id && form.status !== "Fixed") {
                  return null;
                }
                const isFixNotes = name === "bugs" && x.k === "fix_notes";
                const isFixNotesRequired = isFixNotes && form.status === "Fixed";
                // If it's page in bug form, use project-filtered pages
                let selectOptions = [];
                if (name === "bugs" && x.k === "page") {
                  selectOptions = formPages;
                } else if (x.k === "project" || x.r === "projects") {
                  selectOptions = opts.project || opts.projects || [];
                } else if (x.k === "page" || x.r === "pages") {
                  selectOptions = opts.page || opts.pages || [];
                } else if (x.k === "assigned_developer") {
                  selectOptions = opts.assigned_developer || (opts.users || []).filter(u => u.role === "Developer" || u.role === "Admin" || u.role === "Super Admin");
                } else if (x.k === "assigned_tester") {
                  selectOptions = opts.assigned_tester || (opts.users || []).filter(u => u.role === "Tester" || u.role === "Admin" || u.role === "Super Admin");
                } else {
                  selectOptions = opts[x.k] || opts[x.r] || [];
                }

                return (
                  <label key={x.k} style={{ gridColumn: x.t === "area" ? "1 / -1" : "auto", display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, fontWeight: 600, color: "var(--tx-secondary)", ...(isFixNotes ? { background: "rgba(34, 197, 94, 0.08)", padding: "10px 14px", borderRadius: "var(--radius-md)", border: isFixNotesRequired && !form.fix_notes?.trim() ? "1px solid var(--dng-border)" : "1px solid var(--suc-border)" } : {}) }}>
                    <span>
                      {isFixNotes ? "🛠️ " + x.l : x.l}
                      {(x.k === "title" || x.k === "name" || x.k === "project" || x.k === "username" || isFixNotesRequired) && (
                        <span style={{ color: "var(--dng-text)" }}> * {isFixNotesRequired ? "(Required when Fixed)" : ""}</span>
                      )}
                      {name === "bugs" && x.k === "assigned_developer" && (
                        <span style={{ fontSize: 11, color: "var(--pri)", fontWeight: 500, marginLeft: 6 }}>(Will fix issue)</span>
                      )}
                      {name === "bugs" && x.k === "assigned_tester" && (
                        <span style={{ fontSize: 11, color: "var(--wrn-text)", fontWeight: 500, marginLeft: 6 }}>(Will verify fix)</span>
                      )}
                    </span>
                    {name === "bugs" && x.k === "sub_page_name" ? (
                      <div>
                        <select
                          value={form.sub_page_name ?? ""}
                          style={{ width: "100%" }}
                          onChange={e => {
                            const val = e.target.value;
                            const matchPage = formPages.find(p => p.sub_page_name === val);
                            if (matchPage) {
                              setForm({ ...form, sub_page_name: val, page: matchPage.id });
                            } else {
                              setForm({ ...form, sub_page_name: val });
                            }
                          }}
                        >
                          <option value="">
                            {!form.project
                              ? "← Select Project first"
                              : !form.page
                              ? "← Select Page first"
                              : !subPageOptions.length
                              ? "(None / Main Page)"
                              : "Select Sub Page (Optional)…"}
                          </option>
                          {subPageOptions.map(sp => (
                            <option key={sp} value={sp}>{sp}</option>
                          ))}
                        </select>
                        <span style={{ fontSize: 11, color: "var(--tx-muted)", display: "block", marginTop: 3 }}>
                          {!subPageOptions.length && form.page
                            ? "No sub-pages defined for this page"
                            : "Select sub-page section if applicable"}
                        </span>
                      </div>
                    ) : x.t === "area" ? (
                      <textarea
                        rows={3}
                        required={x.k === "description"}
                        value={form[x.k] ?? ""}
                        onChange={e => setForm({ ...form, [x.k]: e.target.value })}
                        placeholder={`Enter ${x.l.toLowerCase()}…`}
                      />
                    ) : x.t === "select" ? (
                      <select
                        value={form[x.k] ?? ""}
                        onChange={e => setForm({ ...form, [x.k]: e.target.value })}
                      >
                        <option value="">Select {x.l}…</option>
                        {x.o.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : x.t === "fk" ? (
                      <div>
                        <select
                          value={form[x.k] ?? ""}
                          required={x.k === "project"}
                          style={{ width: "100%" }}
                          onChange={e => {
                            const val = e.target.value;
                            if (name === "bugs" && x.k === "project") {
                              setForm({ ...form, project: val, page: "", sub_page_name: "" });
                            } else if (name === "bugs" && x.k === "page") {
                              const selPage = formPages.find(p => String(p.id) === String(val));
                              setForm({
                                ...form,
                                page: val,
                                sub_page_name: selPage?.sub_page_name || ""
                              });
                            } else {
                              setForm({ ...form, [x.k]: val });
                            }
                          }}
                        >
                          <option value="">
                            {loadingOpts
                              ? "⏳ Loading projects…"
                              : name === "bugs" && x.k === "page" && !form.project
                              ? "← Select Project first"
                              : (!selectOptions.length && (x.k === "project" || x.r === "projects"))
                              ? "⚠️ No projects found (Create a project first)"
                              : `Select ${x.l}…`}
                          </option>
                          {selectOptions.map(o => (
                            <option key={o.id} value={o.id}>
                              {o.sub_page_name
                                ? `${o.name} > ${o.sub_page_name}`
                                : (o.display_name || o.name || o.username || o.title || `Item #${o.id}`)}
                              {o.role ? ` (${o.role})` : ""}
                            </option>
                          ))}
                        </select>
                        {(!selectOptions.length && (x.k === "project" || x.r === "projects")) && !loadingOpts && (
                          <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--dng-text)" }}>
                            No projects exist yet.{" "}
                            <a
                              href="/projects"
                              onClick={ev => {
                                ev.preventDefault();
                                setForm(null);
                                navigate("/projects");
                              }}
                              style={{ fontWeight: 700, textDecoration: "underline", color: "var(--pri)" }}
                            >
                              Create a Project first
                            </a>.
                          </div>
                        )}
                      </div>
                    ) : (
                      <input
                        type={x.t}
                        required={x.k === "title" || x.k === "name" || x.k === "username"}
                        value={form[x.k] ?? ""}
                        onChange={e => setForm({ ...form, [x.k]: e.target.value })}
                        placeholder={`Enter ${x.l.toLowerCase()}…`}
                      />
                    )}
                  </label>
                );
              })}

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                <button type="button" className="btn-sec" disabled={saving} onClick={() => setForm(null)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn-pri ${saving ? "is-loading" : ""}`}
                  disabled={saving}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                >
                  {saving ? (
                    <>
                      <Spinner size={14} color="#fff" />
                      <span>{form.id ? "Saving Changes…" : "Creating Record…"}</span>
                    </>
                  ) : (
                    form.id ? (name === "users" ? "Save Role Changes" : "Update Changes") : name === "bugs" ? "🚀 Create Bug & Assign Developer" : name === "users" ? "Create New User Role" : "Save Record"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main SaaS Data Table */}
      <div className="card tw">
        {busy ? (
          <div className="loading-container">
            <Spinner size={34} color="var(--pri)" strokeWidth={3} />
            <p style={{ margin: 0, fontWeight: 500 }}>Loading {cfg.title.toLowerCase()}…</p>
          </div>
        ) : !rows.length ? (
          <div className="table-empty" style={{ padding: "40px 16px" }}>
            <span style={{ fontSize: 36 }}>{tab === "deleted" ? "🎉" : "📂"}</span>
            <p style={{ marginTop: 10, fontSize: 14, fontWeight: 600, color: "var(--tx-primary)" }}>
              {tab === "deleted"
                ? `No deleted ${cfg.title.toLowerCase()} found in history.`
                : `No records found in ${cfg.title}.`}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "var(--tx-muted)" }}>
              {tab === "deleted"
                ? "When items are deleted, they will be archived here with recovery options."
                : "Get started by creating your first entry."}
            </p>
            {canWrite && tab === "active" && (
              <button
                className="btn-pri btn-sm"
                style={{ marginTop: 14 }}
                onClick={() => {
                  if (name === "bugs") {
                    openNewBugModal();
                  } else {
                    const init = {};
                    if (name === "pages") {
                      if (filterProject) {
                        init.project = Number(filterProject);
                      } else if (opts.project?.length) {
                        init.project = opts.project[0].id;
                      }
                      init.status = "Active";
                    }
                    openForm(init);
                  }
                }}
              >
                + {name === "bugs" ? "Report Bug & Assign Dev" : name === "users" ? "Create New User Role" : `Create First ${cfg.title.replace(/s$/, "")}`}
              </button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {displayCols.map(c => (
                  <th key={c}>
                    {c === "created_by_user"
                      ? "Created By User"
                      : c === "deleted_by_user"
                      ? "Deleted By (User)"
                      : c === "deleted_at"
                      ? "Deletion Date & Time"
                      : c === "project_name"
                      ? "Project"
                      : c === "page_name"
                      ? "Page"
                      : c === "sub_page_name"
                      ? "Sub Page"
                      : c.replace(/_/g, " ")}
                  </th>
                ))}
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  {displayCols.map(c => (
                    <td key={c}>{renderCell(c, r[c], r)}</td>
                  ))}
                  <td style={{ textAlign: "right" }}>
                    {tab === "deleted" ? (
                      <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap", alignItems: "center" }}>
                        {canWrite && (
                          <>
                            <button
                              type="button"
                              className={`btn-suc btn-sm ${restoringId === r.id ? "is-loading" : ""}`}
                              disabled={restoringId === r.id || permDeletingId === r.id}
                              onClick={() => restoreRecord(r.id)}
                              title="Restore this record back to active records"
                              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                            >
                              {restoringId === r.id ? (
                                <>
                                  <Spinner size={12} color="#fff" />
                                  <span>Restoring…</span>
                                </>
                              ) : (
                                <>
                                  <span>♻️</span>
                                  <span>Restore</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              className={`btn-dng btn-sm ${permDeletingId === r.id ? "is-loading" : ""}`}
                              disabled={restoringId === r.id || permDeletingId === r.id}
                              onClick={() => setConfirmPermanent(r)}
                              title="Permanently remove from database (Cannot be undone)"
                              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                            >
                              {permDeletingId === r.id ? (
                                <>
                                  <Spinner size={12} color="var(--dng-text)" />
                                  <span>Deleting…</span>
                                </>
                              ) : (
                                <>
                                  <span>🗑️</span>
                                  <span>Delete Permanently</span>
                                </>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: "inline-flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        {/* Projects Custom Actions */}
                        {name === "projects" && (
                          <>
                            <button
                              type="button"
                              className="btn-sec btn-sm"
                              onClick={() => navigate(`/pages?project=${r.id}`)}
                              title="View all pages under this project"
                            >
                              📄 Pages ({r.pages_count || 0})
                            </button>
                            <button
                              type="button"
                              className="btn-sec btn-sm"
                              onClick={() => navigate(`/bugs?project=${r.id}`)}
                              title="View all bugs under this project"
                            >
                              🐛 Bugs ({r.bugs_count || 0})
                            </button>
                          </>
                        )}

                        {/* Pages Custom Actions */}
                        {name === "pages" && (
                          <>
                            <button
                              type="button"
                              className="btn-sec btn-sm"
                              onClick={() => navigate(`/bugs?page_id=${r.id}`)}
                              title="View all bugs linked to this page"
                            >
                              🐛 Bugs ({r.bugs_count || 0})
                            </button>
                            {canWrite && (
                              <button
                                type="button"
                                className="btn-pri btn-sm"
                                onClick={() => {
                                  navigate(`/bugs?newBug=1&project=${r.project}&page=${r.id}`);
                                }}
                                title="Report a bug directly on this page"
                              >
                                + Report Bug
                              </button>
                            )}
                          </>
                        )}

                        {/* Bugs Custom Action (Review & History Action Center) */}
                        {name === "bugs" && (
                          <button
                            type="button"
                            className={`btn-pri btn-sm ${loadingBugId === r.id ? "is-loading" : ""}`}
                            disabled={loadingBugId === r.id || deletingId === r.id}
                            onClick={() => openBugModal(r)}
                            title="Open developer fix, tester verification, or reopen modal"
                            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                          >
                            {loadingBugId === r.id ? (
                              <>
                                <Spinner size={12} color="#fff" />
                                <span>Loading…</span>
                              </>
                            ) : (
                              "🔍 Actions & History"
                            )}
                          </button>
                        )}

                        {canWrite && (
                          <button
                            type="button"
                            className="btn-sec btn-sm"
                            disabled={deletingId === r.id}
                            onClick={() => openForm(r)}
                            title="Edit Record"
                          >
                            Edit
                          </button>
                        )}

                        {canWrite && (
                          <button
                            type="button"
                            className={`btn-dng btn-sm ${deletingId === r.id ? "is-loading" : ""}`}
                            disabled={deletingId === r.id || (name === "users" && r.id === currentUserId)}
                            onClick={() => del(r.id)}
                            title={name === "users" && r.id === currentUserId ? "You cannot delete your own account" : "Delete Record (Move to Delete History)"}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
                          >
                            {deletingId === r.id ? (
                              <>
                                <Spinner size={12} color="var(--dng-text)" />
                                <span>Deleting…</span>
                              </>
                            ) : (
                              "Delete"
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Bar */}
      <div className="pagination-bar">
        <span>
          Page <b>{page}</b> of <b>{Math.max(1, Math.ceil(count / 10))}</b> · Total <b>{count}</b> records
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn-sec btn-sm"
            disabled={busy || page < 2}
            onClick={() => setPage(page - 1)}
          >
            ← Previous
          </button>
          <button
            type="button"
            className="btn-sec btn-sm"
            disabled={busy || page * 10 >= count}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      </div>

      {/* Dedicated Bug Action Center Modal */}
      {selectedBug && (
        <BugReviewModal
          bug={selectedBug}
          onClose={() => setSelectedBug(null)}
          onUpdated={() => {
            load();
            api.get(`/bugs/${selectedBug.id}/`)
              .then(res => setSelectedBug(res.data))
              .catch(() => {});
          }}
          toast={toast}
          role={role}
          currentUserId={currentUserId}
          users={opts.users || []}
          bugsList={rows}
          onSelectBug={nextBug => setSelectedBug(nextBug)}
        />
      )}

      {/* Permanent Deletion Confirmation Modal */}
      {confirmPermanent && (
        <div className="modal-backdrop" onClick={() => setConfirmPermanent(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "var(--dng-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                ⚠️
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--tx-primary)" }}>
                  Permanent Deletion
                </h3>
                <span style={{ fontSize: 12, color: "var(--tx-muted)" }}>
                  This action cannot be undone
                </span>
              </div>
            </div>

            <p style={{ fontSize: 14, color: "var(--tx-secondary)", lineHeight: 1.55, margin: "14px 0 22px" }}>
              Are you sure you want to permanently delete{" "}
              <b style={{ color: "var(--tx-primary)" }}>
                {confirmPermanent.name || confirmPermanent.title || confirmPermanent.username || `Record #${confirmPermanent.id}`}
              </b>?
              {" "}This record will be permanently purged from the database and will no longer be recoverable.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="btn-sec"
                disabled={permDeletingId === confirmPermanent.id}
                onClick={() => setConfirmPermanent(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn-dng ${permDeletingId === confirmPermanent.id ? "is-loading" : ""}`}
                disabled={permDeletingId === confirmPermanent.id}
                onClick={() => del(confirmPermanent.id, true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {permDeletingId === confirmPermanent.id ? (
                  <>
                    <Spinner size={14} color="#fff" />
                    <span>Purging Record…</span>
                  </>
                ) : (
                  <>
                    <span>🗑️</span>
                    <span>Confirm Permanent Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
