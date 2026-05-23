import axios from "axios";
import {
  clearAuthSession,
  getAccessToken,
  getUserRole,
} from "../utils/authStorage";

const LANGUAGE_STORAGE_KEY = "vocaseek_language";
const DEFAULT_LANGUAGE = "id";

function normalizeConfiguredApiBaseUrl() {
  return String(
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001/api",
  ).trim();
}

export function resolveApiBaseUrl() {
  const configuredBaseUrl = normalizeConfiguredApiBaseUrl();
  const publicBaseUrl = String(
    import.meta.env.VITE_PUBLIC_API_BASE_URL ||
      import.meta.env.VITE_API_PUBLIC_BASE_URL ||
      "",
  ).trim();

  if (typeof window === "undefined") {
    return publicBaseUrl || configuredBaseUrl || "/api";
  }

  const currentHostname = window.location.hostname;
  const fallbackBaseUrl = `${window.location.protocol}//${currentHostname}:8001/api`;

  const isLocalOrPrivateHost = (hostname = "") => {
    const normalized = String(hostname || "").trim().toLowerCase();

    if (!normalized) return false;
    if (normalized === "localhost" || normalized === "127.0.0.1") return true;

    return (
      normalized.startsWith("192.168.") ||
      normalized.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
    );
  };

  const preferredBaseUrl =
    !isLocalOrPrivateHost(currentHostname) && publicBaseUrl
      ? publicBaseUrl
      : configuredBaseUrl;

  if (!preferredBaseUrl) {
    return fallbackBaseUrl;
  }

  try {
    const configuredUrl = new URL(preferredBaseUrl, window.location.origin);
    const configuredHostname = configuredUrl.hostname;
    const isLocalFrontend = ["localhost", "127.0.0.1"].includes(currentHostname);

    if (configuredUrl.origin === window.location.origin && configuredUrl.pathname === "/api") {
      return configuredUrl.toString().replace(/\/+$/, "");
    }

    if (isLocalOrPrivateHost(currentHostname)) {
      configuredUrl.hostname = currentHostname;

      if (!configuredUrl.port) {
        configuredUrl.port = "8001";
      }
    } else if (isLocalFrontend && !["localhost", "127.0.0.1"].includes(configuredHostname)) {
      return fallbackBaseUrl;
    }

    return configuredUrl.toString().replace(/\/+$/, "");
  } catch {
    return publicBaseUrl || configuredBaseUrl || fallbackBaseUrl;
  }
}
function getActiveLanguage() {
  if (typeof window === "undefined") {
    return DEFAULT_LANGUAGE;
  }

  const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return ["id", "en"].includes(savedLanguage) ? savedLanguage : DEFAULT_LANGUAGE;
}

function isPublicAuthEndpoint(url = "") {
  const normalized = String(url || "").toLowerCase();

  return [
    "/login",
    "/register",
    "/email/verification-notification",
    "/admin/invitations/accept",
    "/forgot-password",
    "/forgot-password/validate-token",
    "/reset-password",
    "/auth/google/token",
  ].some((endpoint) => normalized.endsWith(endpoint));
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: false,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  const activeLanguage = getActiveLanguage();
  config.headers["X-Locale"] = activeLanguage;
  config.headers["Accept-Language"] = activeLanguage;

  if (isPublicAuthEndpoint(config.url)) {
    config.withCredentials = false;
    if (config.headers) {
      delete config.headers["X-XSRF-TOKEN"];
      delete config.headers["X-CSRF-TOKEN"];
    }
  }

  // Handle FormData: Remove Content-Type header to let axios auto-set with boundary
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }

  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const statusCode = error?.response?.status;
    const requestUrl = String(error?.config?.url || "").toLowerCase();
    const isAuthPage =
      typeof window !== "undefined" &&
      ["/login", "/login-company", "/admin/activate"].includes(window.location.pathname);

    if (
      statusCode === 401 &&
      !isPublicAuthEndpoint(requestUrl) &&
      !isAuthPage &&
      typeof window !== "undefined"
    ) {
      const currentRole = String(getUserRole() || "").toLowerCase();
      const loginPath = currentRole.includes("company") ? "/login-company" : "/login";

      clearAuthSession();
      window.location.replace(loginPath);
    }

    return Promise.reject(error);
  },
);

export default api;
