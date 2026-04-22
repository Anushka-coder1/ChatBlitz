import axios from "axios";

const apiBase =
  import.meta.env.VITE_API_URL ||
  import.meta.env.REACT_APP_API_URL ||
  "http://localhost:5000";

const apiUrl = `${apiBase.replace(/\/$/, "")}/api`

const axiosInstance=axios.create({
  baseURL : apiUrl,
  withCredentials : true
})

export default axiosInstance
