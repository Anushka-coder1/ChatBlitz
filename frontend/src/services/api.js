import axios from "axios";

const apiBase =
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  "https://chatblitz-backend1.onrender.com";

const api = axios.create({
  baseURL: `${apiBase.replace(/\/$/, "")}/api`,
  withCredentials: true,
});

export default api;
