import axios from "axios";

const apiBase =
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  "https://chatblitz-backend1.onrender.com";

const api = axios.create({
  baseURL: `${apiBase.replace(/\/$/, "")}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  try {
    const storedUser = JSON.parse(
      localStorage.getItem("chatblitz-user-storage") || "null",
    );
    const token = storedUser?.state?.token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Ignore malformed persisted state and let the request use its cookie.
  }
  return config;
});

export default api;
