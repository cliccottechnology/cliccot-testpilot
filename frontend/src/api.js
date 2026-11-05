import axios from "axios";

export const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://127.0.0.1:8000/api";
    }
    if (host === "cliccot-testpilot-backend.onrender.com") {
      return `${window.location.origin}/api`;
    }
  }
  return "https://cliccot-testpilot-backend.onrender.com/api";
};

const api = axios.create({ baseURL: getBaseUrl() });

// Cross-tab authentication synchronization channel
export const authChannel = typeof window !== "undefined" && "BroadcastChannel" in window
  ? new BroadcastChannel("bugflow_auth_sync")
  : null;

export const broadcastAuthEvent = (type, payload = {}) => {
  try {
    if (authChannel) {
      authChannel.postMessage({ type, payload, timestamp: Date.now() });
    }
  } catch {
    // Ignore cross-tab messaging errors
  }
};

api.interceptors.request.use(c => {
  const t = localStorage.getItem("access");
  if (t) {
    c.headers = c.headers || {};
    c.headers.Authorization = `Bearer ${t}`;
  }
  return c;
});

// Mutex promise to avoid redundant refresh calls across requests and tabs
let refreshPromise = null;

api.interceptors.response.use(
  r => r,
  async e => {
    const originalRequest = e.config;
    if (!originalRequest) return Promise.reject(e);

    // Only handle 401 Unauthorized errors
    if (e.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check if token in failed request was already refreshed by another tab or request
      const failedAuth = originalRequest.headers?.Authorization || originalRequest.headers?.authorization;
      const failedToken = typeof failedAuth === "string" ? failedAuth.replace(/^Bearer\s+/i, "").trim() : null;
      const latestToken = localStorage.getItem("access");

      // 1. If another tab already updated the access token, retry immediately with new token
      if (latestToken && latestToken !== failedToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${latestToken}`;
        return api(originalRequest);
      }

      // 2. Otherwise perform single synchronized refresh
      const rf = localStorage.getItem("refresh");
      if (rf) {
        if (!refreshPromise) {
          refreshPromise = axios.post(`${api.defaults.baseURL}/auth/refresh/`, { refresh: rf })
            .then(res => {
              const newAccess = res.data.access;
              localStorage.setItem("access", newAccess);
              broadcastAuthEvent("TOKEN_REFRESH", { access: newAccess });
              return newAccess;
            })
            .catch(refreshErr => {
              // Only invalidate credentials if refresh token was rejected by server (401/400)
              if (refreshErr.response?.status === 401 || refreshErr.response?.status === 400) {
                localStorage.removeItem("access");
                localStorage.removeItem("refresh");
                localStorage.removeItem("auth_user");
                broadcastAuthEvent("LOGOUT", { reason: "session_expired" });
              }
              return Promise.reject(refreshErr);
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        try {
          const newAccess = await refreshPromise;
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch {
          return Promise.reject(e);
        }
      }
    }

    return Promise.reject(e);
  }
);

export default api;

