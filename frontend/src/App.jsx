import { useEffect, useState, useCallback } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import api from "./api";
import Dashboard from "./Dashboard";
import Resource from "./Resource";
import { RES } from "./resources";
import StatusBadge from "./StatusBadge";
import Spinner from "./Spinner";

const NAV_ITEMS = [
  { path: "", label: "Dashboard", icon: "📊", desc: "Overview & Analytics" },
  { path: "projects", label: "Projects", icon: "📁", desc: "Manage Projects" },
  { path: "pages", label: "Pages", icon: "📄", desc: "Project Pages" },
  { path: "bugs", label: "Bugs", icon: "🐛", desc: "Defects & Reopen Flow" },
  { path: "users", label: "User Roles", icon: "👥", desc: "Developer, Tester, Admin", superAdminOnly: true },
];

const ROUTE_INFO = {
  "": { section: "Overview", title: "Bug Management Dashboard" },
  "projects": { section: "Projects", title: "Project Management" },
  "pages": { section: "Pages", title: "Page Specifications" },
  "bugs": { section: "Defects", title: "Bug Tracker & Resolution Lifecycle" },
  "users": { section: "Team", title: "User Roles (Developer, Tester, Admin)" },
};

function Login({ onLoginSuccess, dark, setDark }) {
  const isRemembered = localStorage.getItem("remember_me") === "true";
  const [f, setF] = useState({
    username: isRemembered ? (localStorage.getItem("remembered_username") || "") : "",
    password: isRemembered ? (localStorage.getItem("remembered_password") || "") : ""
  });
  const [rememberMe, setRememberMe] = useState(isRemembered);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const nav = useNavigate();

  const go = async () => {
    if (loading) return;
    setErr("");
    setLoading(true);
    const username = f.username.trim();
    const password = f.password.trim();

    try {
      const { data } = await axios.post(`${api.defaults.baseURL}/auth/token/`, {
        username,
        password
      });

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      if (rememberMe) {
        localStorage.setItem("remember_me", "true");
        localStorage.setItem("remembered_username", username);
        localStorage.setItem("remembered_password", password);
      } else {
        localStorage.removeItem("remember_me");
        localStorage.removeItem("remembered_username");
        localStorage.removeItem("remembered_password");
      }

      const meRes = await axios.get(`${api.defaults.baseURL}/me/`, {
        headers: { Authorization: `Bearer ${data.access}` }
      });

      onLoginSuccess(meRes.data);
      nav("/");
    } catch (e) {
      console.error("Login failed:", e);
      let serverMsg = "";
      if (!e.response) {
        serverMsg = `Unable to connect to backend server (${api.defaults.baseURL}). Please verify your network connection and ensure the backend service is running.`;
      } else if (typeof e.response.data === "string" && (e.response.data.includes("<!DOCTYPE") || e.response.data.includes("<html"))) {
        serverMsg = `Backend endpoint error (${e.response.status}) at ${api.defaults.baseURL}. Please verify the backend service is operational.`;
      } else if (e.response.data?.detail) {
        serverMsg = e.response.data.detail;
      } else if (e.response.data && typeof e.response.data === "object") {
        serverMsg = Object.entries(e.response.data).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ");
      } else {
        serverMsg = e.message || "Invalid username or password.";
      }
      setErr(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <form className="login" onSubmit={e => { e.preventDefault(); go(); }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <button
            type="button"
            className="btn-sec btn-sm"
            onClick={() => setDark(!dark)}
            title="Toggle Light / Dark mode"
          >
            {dark ? "☀️ Light" : "🌙 Dark"}
          </button>
        </div>

        <div className="login-brand">
          <div className="login-brand-logo">🐛</div>
          <h2>BugFlow</h2>
          <p>Simple Bug Management System</p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: "var(--tx-secondary)" }}>
            Username
          </label>
          <input
            placeholder="Enter username"
            value={f.username}
            onChange={e => setF({ ...f, username: e.target.value })}
            autoComplete="username"
            required
          />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, marginBottom: 6, color: "var(--tx-secondary)" }}>
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPw ? "text" : "password"}
              placeholder="Enter password"
              value={f.password}
              onChange={e => setF({ ...f, password: e.target.value })}
              autoComplete="current-password"
              style={{ width: "100%", paddingRight: 60, marginBottom: 0 }}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                position: "absolute",
                right: 6,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--tx-muted)",
                fontSize: 12,
                fontWeight: 600,
                padding: "4px 8px",
                cursor: "pointer"
              }}
            >
              {showPw ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Remember Me Option */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--tx-secondary)", cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer", accentColor: "var(--pri)", margin: 0 }}
            />
            <span style={{ fontWeight: 500 }}>Remember me</span>
          </label>
        </div>

        {err && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--dng-border)",
              borderRadius: "var(--radius-md)",
              color: "var(--dng-text)",
              fontSize: 13,
              fontWeight: 500,
              marginBottom: 14
            }}
          >
            ⚠️ {err}
          </div>
        )}

        <button
          type="submit"
          className={`btn-pri ${loading ? "is-loading" : ""}`}
          style={{ width: "100%", padding: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          disabled={loading}
        >
          {loading ? (
            <>
              <Spinner size={16} color="#fff" />
              <span>Authenticating…</span>
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>
    </div>
  );
}

export default function App() {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState("");
  const [dark, setDark] = useState(localStorage.theme === "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const load = useCallback(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      setReady(true);
      return;
    }
    api.get("/me/")
      .then(r => setMe(r.data))
      .catch(() => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        setMe(null);
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    localStorage.theme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toast = t => {
    setMsg(t);
    setTimeout(() => setMsg(""), 3500);
  };

  const currentKey = location.pathname.replace(/^\//, "");
  const routeMeta = ROUTE_INFO[currentKey] || { section: "Platform", title: "Overview" };

  if (!ready) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 14, color: "var(--tx-muted)" }}>
        <Spinner size={34} color="var(--pri)" strokeWidth={3} />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Loading Bug Management System…</p>
      </div>
    );
  }

  if (!me) {
    return (
      <Routes>
        <Route path="*" element={<Login onLoginSuccess={user => setMe(user)} dark={dark} setDark={setDark} />} />
      </Routes>
    );
  }

  return (
    <div className="layout">
      {/* Mobile Backdrop */}
      <div
        className={`sidebar-backdrop ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Clean Sidebar */}
      <nav className={`side ${sidebarOpen ? "open" : ""}`}>
        <div className="side-brand">
          <div className="brand-logo-mark" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
            🐛
          </div>
          <div className="side-brand-text">
            <h2>BugFlow</h2>
            <span>Bug Management</span>
          </div>
        </div>

        {/* 4 Main Modules Navigation */}
        <div className="side-nav-container">
          <div className="nav-group">
            <div className="nav-group-title">Main Modules</div>
            <div className="nav-group-list">
              {NAV_ITEMS
                .filter(item => !item.superAdminOnly || me.role === "Super Admin")
                .map(item => (
                <NavLink
                  key={item.path}
                  to={"/" + item.path}
                  end={item.path === ""}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        <div className="side-footer">
          <span>Bug Management System</span>
          <span style={{ fontSize: 11, color: "var(--suc-text)", fontWeight: 600 }}>● Active</span>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="main">
        {/* Topbar */}
        <header className="top">
          <div className="top-left">
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle Menu"
            >
              ☰
            </button>
            <div className="breadcrumb-trail">
              <span>{routeMeta.section}</span>
              <span style={{ opacity: 0.4 }}>/</span>
              <b>{routeMeta.title}</b>
            </div>
          </div>

          <div className="top-right">
            <button
              type="button"
              className="btn-sec"
              onClick={() => setDark(!dark)}
              title={`Switch to ${dark ? "Light" : "Dark"} Mode`}
              style={{ padding: "7px 12px", fontSize: 13 }}
            >
              {dark ? "☀️ Light" : "🌙 Dark"}
            </button>

            {/* User Profile Badge with Role */}
            <div className="user-profile-badge">
              <div className="avatar-circle">
                {me.username ? me.username.slice(0, 2).toUpperCase() : "U"}
              </div>
              <div className="user-info-text">
                <span className="user-info-name">{me.username}</span>
                <span className="user-info-role">
                  <StatusBadge value={me.role} />
                </span>
              </div>
            </div>

            <button
              type="button"
              className="btn-sec btn-sm"
              onClick={() => {
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                setMe(null);
              }}
              title="Sign out"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* Dynamic Routes */}
        <Routes>
          <Route path="/" element={<Dashboard role={me.role} currentUserId={me.id} toast={toast} />} />
          {Object.keys(RES).map(k => (
            <Route
              key={k}
              path={"/" + k}
              element={
                k === "users" && me.role !== "Super Admin" ? (
                  <Navigate to="/" replace />
                ) : (
                  <Resource key={k} name={k} toast={toast} role={me.role} currentUserId={me.id} />
                )
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Global Toast Banner */}
      {msg && <div className="toast">{msg}</div>}
    </div>
  );
}
