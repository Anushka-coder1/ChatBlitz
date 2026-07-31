import axios from "axios";

const apiBase =
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const api = axios.create({
  baseURL: `${apiBase.replace(/\/$/, "")}/api`,
  withCredentials: true,
});

export default api;
