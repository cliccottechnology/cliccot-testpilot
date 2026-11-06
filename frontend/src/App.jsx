import { useEffect, useState, useCallback } from "react";
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import api, { authChannel, broadcastAuthEvent } from "./api";
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
  "dashboard": { section: "Overview", title: "Bug Management Dashboard" },
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
  const [infoNotice, setInfoNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const nav = useNavigate();
  const location = useLocation();

  const handleForgotPw = (e) => {
    e.preventDefault();
    setInfoNotice("To reset your password, please contact your workspace administrator at admin@cliccot.com or your QA team lead.");
  };

  const handleSignUp = (e) => {
    e.preventDefault();
    setInfoNotice("Self-registration is restricted. Please request an account invitation from your QA Administrator.");
  };

  const go = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (loading) return;
    setErr("");
    setInfoNotice("");
    setLoading(true);
    const username = f.username.trim();
    const password = f.password.trim();

    try {
      const { data } = await axios.post(`${api.defaults.baseURL}/auth/token/`, {
        username,
        password
      });

      const meRes = await axios.get(`${api.defaults.baseURL}/me/`, {
        headers: { Authorization: `Bearer ${data.access}` }
      });

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);
      localStorage.setItem("auth_user", JSON.stringify(meRes.data));

      if (rememberMe) {
        localStorage.setItem("remember_me", "true");
        localStorage.setItem("remembered_username", username);
        localStorage.setItem("remembered_password", password);
      } else {
        localStorage.removeItem("remember_me");
        localStorage.removeItem("remembered_username");
        localStorage.removeItem("remembered_password");
      }

      // Synchronize session across all open browser tabs
      broadcastAuthEvent("LOGIN", { user: meRes.data, access: data.access, refresh: data.refresh });

      onLoginSuccess(meRes.data);
      const redirectTarget = location.state?.from?.pathname && location.state.from.pathname !== "/login"
        ? location.state.from.pathname + (location.state.from.search || "")
        : "/";
      nav(redirectTarget, { replace: true });
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
      {/* Floating Theme Switcher */}
      <div className="login-theme-switch-floating">
        <button
          type="button"
          className="login-floating-toggle"
          onClick={() => setDark(!dark)}
          title={`Switch to ${dark ? "Light" : "Dark"} mode`}
        >
          {dark ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>

      <div className="login-card">
        {/* Left Side: Welcome Hero with faceted low-poly overlay & diagonal split */}
        <div className="login-hero">
          {/* Faceted Low-Poly SVG Texture Overlay */}
          <svg className="login-poly-bg" viewBox="0 0 600 800" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="poly-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00AEBB" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#06375F" stopOpacity="0.85" />
              </linearGradient>
              <linearGradient id="poly-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00C9D8" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#1D4B76" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <polygon points="0,0 240,0 140,180" fill="url(#poly-grad-1)" />
            <polygon points="240,0 460,0 330,160" fill="url(#poly-grad-2)" />
            <polygon points="460,0 600,0 520,200" fill="#06375F" opacity="0.6" />
            <polygon points="0,0 140,180 0,260" fill="#021C31" opacity="0.5" />
            <polygon points="140,180 330,160 250,350" fill="#1D4B76" opacity="0.55" />
            <polygon points="330,160 520,200 420,370" fill="url(#poly-grad-1)" />
            <polygon points="520,200 600,0 600,340" fill="#06375F" opacity="0.7" />
            <polygon points="520,200 600,340 420,370" fill="#1D4B76" opacity="0.5" />
            <polygon points="0,260 140,180 100,420" fill="url(#poly-grad-2)" />
            <polygon points="140,180 250,350 100,420" fill="#021C31" opacity="0.6" />
            <polygon points="250,350 420,370 280,560" fill="url(#poly-grad-1)" />
            <polygon points="420,370 600,340 540,570" fill="#06375F" opacity="0.65" />
            <polygon points="420,370 540,570 380,610" fill="url(#poly-grad-2)" />
            <polygon points="250,350 280,560 140,590" fill="#1D4B76" opacity="0.5" />
            <polygon points="100,420 250,350 140,590" fill="#00AEBB" opacity="0.4" />
            <polygon points="0,260 100,420 0,540" fill="#06375F" opacity="0.7" />
            <polygon points="0,540 100,420 140,590" fill="url(#poly-grad-1)" />
            <polygon points="0,540 140,590 0,800" fill="#021C31" opacity="0.8" />
            <polygon points="140,590 280,560 220,760" fill="url(#poly-grad-2)" />
            <polygon points="280,560 380,610 360,800" fill="#1D4B76" opacity="0.6" />
            <polygon points="380,610 540,570 600,740" fill="#06375F" opacity="0.7" />
            <polygon points="540,570 600,340 600,740" fill="#021C31" opacity="0.6" />
            <polygon points="380,610 600,740 510,800" fill="url(#poly-grad-1)" />
            <polygon points="280,560 360,800 220,760" fill="#1D4B76" opacity="0.55" />
            <polygon points="140,590 220,760 0,800" fill="#00C9D8" opacity="0.35" />
            <polygon points="220,760 360,800 280,800" fill="#06375F" opacity="0.7" />
            <polygon points="360,800 510,800 600,800" fill="url(#poly-grad-2)" />
            <polygon points="510,800 600,740 600,800" fill="#021C31" opacity="0.8" />
          </svg>

          {/* Welcome Message */}
          <div className="login-hero-body">
            <h1 className="login-hero-title">Welcome Back.</h1>
            <p className="login-hero-desc">
              Manage defect lifecycles, accelerate test execution readiness, and coordinate fixes across your entire workspace.
            </p>
          </div>
        </div>

        {/* Right Side: Log in Form */}
        <div className="login-form-container">
          <h2 className="login-heading">Log in</h2>

          <form className="login-form-content" onSubmit={go}>
            {/* Email / Username Field */}
            <div className="login-input-group">
              <label className="login-label">Email</label>
              <div className="login-field-box">
                <input
                  type="text"
                  placeholder="Enter your email here..."
                  value={f.username}
                  onChange={e => setF({ ...f, username: e.target.value })}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="login-input-group">
              <label className="login-label">Password</label>
              <div className="login-field-box">
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  value={f.password}
                  onChange={e => setF({ ...f, password: e.target.value })}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => setShowPw(!showPw)}
                  title={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {err && (
              <div className="login-error-alert" role="alert">
                <span className="login-error-icon">⚠️</span>
                <span>{err}</span>
              </div>
            )}

            {/* Info Notice */}
            {infoNotice && (
              <div className="login-info-alert" role="status">
                <span className="login-info-icon">ℹ️</span>
                <span>{infoNotice}</span>
                <button
                  type="button"
                  className="login-notice-close"
                  onClick={() => setInfoNotice("")}
                  title="Dismiss notice"
                >
                  ×
                </button>
              </div>
            )}

            {/* Primary Action Button */}
            <button
              type="submit"
              className={`login-submit-btn ${loading ? "is-loading" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner size={16} color="currentColor" />
                  <span>Logging in…</span>
                </>
              ) : (
                "Log in"
              )}
            </button>

            {/* Footer Links Row */}
            <div className="login-links-row">
              <button
                type="button"
                className="login-link"
                onClick={handleForgotPw}
              >
                Forgot password?
              </button>
              <span className="login-signup-note">
                Don't have an account?{" "}
                <button
                  type="button"
                  className="login-link-bold"
                  onClick={handleSignUp}
                >
                  Sign Up
                </button>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const getCachedUser = () => {
    try {
      const cached = localStorage.getItem("auth_user");
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  };

  const [me, setMe] = useState(getCachedUser);
  const [ready, setReady] = useState(() => Boolean(localStorage.getItem("access") && localStorage.getItem("auth_user")));
  const [msg, setMsg] = useState("");
  const [dark, setDark] = useState(localStorage.theme === "dark");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const verifySession = useCallback(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      setMe(null);
      setReady(true);
      return;
    }
    api.get("/me/")
      .then(r => {
        setMe(r.data);
        localStorage.setItem("auth_user", JSON.stringify(r.data));
      })
      .catch(err => {
        // ONLY clear credentials if server genuinely returns 401 Unauthorized.
        // Never log out on temporary network blips or server restarts!
        if (err.response?.status === 401) {
          localStorage.removeItem("access");
          localStorage.removeItem("refresh");
          localStorage.removeItem("auth_user");
          setMe(null);
        }
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  // Synchronize authentication & sessions across all open browser tabs
  useEffect(() => {
    // 1. Cross-tab BroadcastChannel listener
    const handleBroadcast = event => {
      const { type, payload } = event.data || {};
      if (type === "LOGIN" && payload?.user) {
        setMe(payload.user);
        setReady(true);
      } else if (type === "LOGOUT") {
        setMe(null);
        setReady(true);
        navigate("/login");
      } else if (type === "TOKEN_REFRESH") {
        const token = localStorage.getItem("access");
        if (token && !me) {
          verifySession();
        }
      }
    };

    if (authChannel) {
      authChannel.addEventListener("message", handleBroadcast);
    }

    // 2. Storage event listener (triggers in all other tabs when localStorage changes)
    const handleStorageChange = e => {
      if (e.key === "access") {
        if (e.newValue) {
          const cached = getCachedUser();
          if (cached) setMe(cached);
          verifySession();
        } else {
          setMe(null);
          navigate("/login");
        }
      } else if (e.key === "auth_user") {
        if (e.newValue) {
          try {
            setMe(JSON.parse(e.newValue));
          } catch {
            verifySession();
          }
        } else {
          setMe(null);
          navigate("/login");
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // 3. Tab visibility listener (when tab is brought into focus, ensure session is synchronized)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const token = localStorage.getItem("access");
        const cached = getCachedUser();
        if (token && cached) {
          if (!me || me.id !== cached.id) {
            setMe(cached);
          }
        } else if (!token && me) {
          setMe(null);
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (authChannel) {
        authChannel.removeEventListener("message", handleBroadcast);
      }
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [verifySession, me]);

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
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", gap: 14, color: "var(--muted)" }}>
        <Spinner size={34} color="var(--primary)" strokeWidth={3} />
        <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Loading Bug Management System…</p>
      </div>
    );
  }

  if (!me) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLoginSuccess={user => setMe(user)} dark={dark} setDark={setDark} />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location }} />} />
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
          <div className="brand-logo-mark">
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
                localStorage.removeItem("auth_user");
                broadcastAuthEvent("LOGOUT", { reason: "explicit_user_logout" });
                setMe(null);
                navigate("/login");
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
          <Route path="/dashboard" element={<Dashboard role={me.role} currentUserId={me.id} toast={toast} />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
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
