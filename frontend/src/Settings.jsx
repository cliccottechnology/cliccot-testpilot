import { useState } from "react";
import StatusBadge from "./StatusBadge";
import Spinner from "./Spinner";

export default function Settings({ me, dark, setDark, toast }) {
  const [orgName, setOrgName] = useState(localStorage.getItem("org_name") || "Cliccot QA Labs");
  const [timezone, setTimezone] = useState(localStorage.getItem("org_tz") || "UTC+05:30 (India Standard Time)");
  const [notificationsEnabled, setNotificationsEnabled] = useState(localStorage.getItem("notif_enabled") !== "false");
  const [autoRefresh, setAutoRefresh] = useState(localStorage.getItem("auto_refresh") !== "false");
  const [saving, setSaving] = useState(false);

  const saveSettings = e => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    localStorage.setItem("org_name", orgName);
    localStorage.setItem("org_tz", timezone);
    localStorage.setItem("notif_enabled", notificationsEnabled);
    localStorage.setItem("auto_refresh", autoRefresh);
    setTimeout(() => {
      setSaving(false);
      toast("Settings saved successfully!");
    }, 400);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-wrap">
          <h2>Application & Workspace Settings</h2>
          <p>Manage workspace configuration, display theme, account profile, and platform preferences.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Workspace Configuration */}
        <div className="card">
          <div className="card-head">
            <h4>🏢 Workspace Profile</h4>
          </div>
          <form onSubmit={saveSettings} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 6 }}>
              Organization / Company Name
              <input
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                placeholder="e.g. Cliccot QA Labs"
                required
              />
            </label>

            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 6 }}>
              Default Timezone
              <select value={timezone} onChange={e => setTimezone(e.target.value)}>
                <option>UTC+05:30 (India Standard Time)</option>
                <option>UTC+00:00 (Greenwich Mean Time / UTC)</option>
                <option>UTC-05:00 (Eastern Time - US & Canada)</option>
                <option>UTC-08:00 (Pacific Time - US & Canada)</option>
                <option>UTC+01:00 (Central European Time)</option>
              </select>
            </label>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={e => setNotificationsEnabled(e.target.checked)}
                />
                Enable in-app defect assignment notifications
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={e => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh dashboard and execution counters
              </label>
            </div>

            <button
              type="submit"
              className={`btn-pri ${saving ? "is-loading" : ""}`}
              disabled={saving}
              style={{ alignSelf: "flex-start", marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {saving ? (
                <>
                  <Spinner size={14} color="#fff" />
                  <span>Saving Preferences…</span>
                </>
              ) : (
                "Save Preferences"
              )}
            </button>
          </form>
        </div>

        {/* Display & Appearance */}
        <div className="card">
          <div className="card-head">
            <h4>🎨 Appearance & Theme</h4>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <b style={{ display: "block", fontSize: 13, marginBottom: 8 }}>Color Mode</b>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className={!dark ? "btn-pri" : "btn-sec"}
                  onClick={() => setDark(false)}
                  style={{ flex: 1, padding: "12px 16px" }}
                >
                  ☀️ Light Mode
                </button>
                <button
                  type="button"
                  className={dark ? "btn-pri" : "btn-sec"}
                  onClick={() => setDark(true)}
                  style={{ flex: 1, padding: "12px 16px" }}
                >
                  🌙 Dark Mode
                </button>
              </div>
            </div>

            <div style={{ padding: 14, background: "var(--card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <b style={{ fontSize: 13, color: "var(--text-primary)", display: "block", marginBottom: 4 }}>Design System Token Guidelines</b>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.5 }}>
                Cliccot TestFlow standardizes all colors using CSS custom properties. Dark mode automatically inverts surfaces, borders, chart palettes, and text contrast.
              </p>
            </div>
          </div>
        </div>

        {/* User Account Profile */}
        <div className="card">
          <div className="card-head">
            <h4>👤 Authenticated Profile</h4>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, var(--secondary), var(--primary))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>
              {me?.username?.slice(0, 2).toUpperCase() || "US"}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16 }}>{me?.username}</h3>
              <div style={{ marginTop: 6 }}><StatusBadge value={me?.role} /></div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: "var(--text-secondary)" }}>
            <div><b>User ID:</b> #{me?.id}</div>
            <div><b>Role Privileges:</b> {me?.role === "Super Admin" ? "Full administrative write access across all workspaces" : "Role-governed permissions"}</div>
            <div><b>Session Status:</b> Authenticated (JWT active)</div>
          </div>
        </div>

        {/* System & Architecture Info */}
        <div className="card">
          <div className="card-head">
            <h4>⚙️ Platform & Environment Info</h4>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
              <span style={{ color: "var(--muted)" }}>Platform Version:</span>
              <b>v1.2.0 (Professional Edition)</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
              <span style={{ color: "var(--muted)" }}>Backend Engine:</span>
              <b>Django 6.1.2 + Django REST Framework</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
              <span style={{ color: "var(--muted)" }}>Frontend Framework:</span>
              <b>React 18.3 + Vite + Recharts</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 6 }}>
              <span style={{ color: "var(--muted)" }}>Authentication:</span>
              <b>SimpleJWT (Bearer Token Authorization)</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 6 }}>
              <span style={{ color: "var(--muted)" }}>API Health:</span>
              <StatusBadge value="Active" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
