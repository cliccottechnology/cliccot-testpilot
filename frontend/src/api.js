import axios from "axios";
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api" });
api.interceptors.request.use(c => { const t = localStorage.getItem("access"); if (t) c.headers.Authorization = `Bearer ${t}`; return c; });
api.interceptors.response.use(r => r, async e => {
  const o = e.config, rf = localStorage.getItem("refresh");
  if (e.response?.status === 401 && rf && !o._r) {
    o._r = true;
    try { const { data } = await axios.post(`${api.defaults.baseURL}/auth/refresh/`, { refresh: rf });
      localStorage.setItem("access", data.access); return api(o); } catch { localStorage.clear(); location.href = "/"; }
  }
  return Promise.reject(e);
});
export default api;
