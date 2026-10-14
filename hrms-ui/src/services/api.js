
import axios from "axios";

const DJANGO_BASE_URL =
  import.meta.env.VITE_DJANGO_API_URL ||
  "http://127.0.0.1:8000/api";

const FASTAPI_BASE_URL =
  import.meta.env.VITE_FASTAPI_API_URL ||
  "http://127.0.0.1:8001";

export const djangoApi = axios.create({
  baseURL: DJANGO_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

export const fastApi = axios.create({
  baseURL: FASTAPI_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

export function setAccessToken(token) {
  for (const api of [djangoApi, fastApi]) {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }
}

// Restore the saved token after a page refresh.
const savedToken =
  typeof localStorage !== "undefined"
    ? localStorage.getItem("hrms_access_token")
    : null;

if (savedToken) {
  setAccessToken(savedToken);
}

// Apply the latest token to every outgoing request.
for (const api of [djangoApi, fastApi]) {
  api.interceptors.request.use(
    (config) => {
      const token =
        typeof localStorage !== "undefined"
          ? localStorage.getItem("hrms_access_token")
          : null;

      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      } else if (config.headers) {
        delete config.headers.Authorization;
      }

      return config;
    },
    (error) => Promise.reject(error)
  );
}
