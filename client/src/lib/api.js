import axios from "axios";

const stripTrailingSlash = (url) => String(url || "").replace(/\/+$/, "");

export const API_BASE_URL = stripTrailingSlash(import.meta.env.VITE_API_URL || "");

export const SOCKET_URL = stripTrailingSlash(
  import.meta.env.VITE_SOCKET_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:5000" : ""),
);

const api = axios.create({
  baseURL: API_BASE_URL,
});

export default api;
