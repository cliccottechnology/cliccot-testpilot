import axios from "axios";

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "cliccot-testpilot-backend.onrender.com") {
      return `${window.location.origin}/api`;
    }
  }
  return "https://cliccot-testpilot-backend.onrender.com/api";
};

const api = axios.create({ baseURL: getBaseUrl() });

api.interceptors.request.use(c => {
  const t = localStorage.getItem("access");
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

api.interceptors.response.use(
  r => r,
  async e => {
    const o = e.config;
    const rf = localStorage.getItem("refresh");
    if (e.response?.status === 401 && rf && !o._r) {
      o._r = true;
      try {
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh/`, { refresh: rf });
        localStorage.setItem("access", data.access);
        return api(o);
      } catch {
        localStorage.clear();
        location.href = "/";
      }
    }
    return Promise.reject(e);
  }
);

export default api;

