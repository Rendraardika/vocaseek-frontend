import api from "../lib/api";

const LOGIN_ENDPOINT = import.meta.env.VITE_AUTH_LOGIN_ENDPOINT || "/login";
const REGISTER_ENDPOINT =
  import.meta.env.VITE_AUTH_REGISTER_ENDPOINT || "/register";
const LOGOUT_ENDPOINT = import.meta.env.VITE_AUTH_LOGOUT_ENDPOINT || "/logout";
const FORGOT_PASSWORD_ENDPOINT =
  import.meta.env.VITE_AUTH_FORGOT_PASSWORD_ENDPOINT || "/forgot-password";
const RESEND_VERIFICATION_ENDPOINT =
  import.meta.env.VITE_AUTH_RESEND_VERIFICATION_ENDPOINT ||
  "/email/verification-notification";
const VALIDATE_RESET_TOKEN_ENDPOINT =
  import.meta.env.VITE_AUTH_VALIDATE_RESET_TOKEN_ENDPOINT ||
  "/forgot-password/validate-token";
const RESET_PASSWORD_ENDPOINT =
  import.meta.env.VITE_AUTH_RESET_PASSWORD_ENDPOINT || "/reset-password";
const GOOGLE_AUTH_ENDPOINT =
  import.meta.env.VITE_AUTH_GOOGLE_ENDPOINT || "/auth/google";
const GOOGLE_TOKEN_ENDPOINT =
  import.meta.env.VITE_AUTH_GOOGLE_TOKEN_ENDPOINT || "/auth/google/token";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function joinApiUrl(baseUrl, endpoint) {
  const normalizedBase = String(baseUrl || "").replace(/\/+$/, "");
  const normalizedEndpoint = String(endpoint || "").replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedEndpoint}`;
}

export function loginApplicant(payload) {
  return api.post(LOGIN_ENDPOINT, payload);
}

export function loginCompany(payload) {
  return api.post(LOGIN_ENDPOINT, payload);
}

export function registerApplicant(payload) {
  return api.post(REGISTER_ENDPOINT, payload);
}

export function registerCompany(payload) {
  return api.post(REGISTER_ENDPOINT, payload);
}

export function logoutUser() {
  return api.post(LOGOUT_ENDPOINT);
}

export function resendVerificationEmail(payload) {
  return api.post(RESEND_VERIFICATION_ENDPOINT, payload);
}

export function requestPasswordReset(payload) {
  return api.post(FORGOT_PASSWORD_ENDPOINT, payload);
}

export function validatePasswordResetToken(payload) {
  return api.post(VALIDATE_RESET_TOKEN_ENDPOINT, payload);
}

export function resetPassword(payload) {
  return api.post(RESET_PASSWORD_ENDPOINT, payload);
}

export function getGoogleAuthUrl() {
  return joinApiUrl(api.defaults.baseURL, GOOGLE_AUTH_ENDPOINT);
}

export function loginWithGoogleAccessToken(payload) {
  return api.post(GOOGLE_TOKEN_ENDPOINT, payload, {
    withCredentials: false,
    headers: {
      "X-XSRF-TOKEN": undefined,
      "X-CSRF-TOKEN": undefined,
    },
  });
}

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve(window.google);
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://accounts.google.com/gsi/client"]',
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.google), {
        once: true,
      });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Gagal memuat Google Identity Services.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () =>
      reject(new Error("Gagal memuat Google Identity Services."));
    document.head.appendChild(script);
  });
}

export async function requestGoogleAccessToken() {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("VITE_GOOGLE_CLIENT_ID belum diatur.");
  }

  const google = await loadGoogleIdentityScript();

  return new Promise((resolve, reject) => {
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        if (response?.access_token) {
          resolve(response.access_token);
          return;
        }

        reject(new Error("Google tidak mengembalikan access token."));
      },
      error_callback: () => {
        reject(new Error("Proses autentikasi Google dibatalkan atau gagal."));
      },
    });

    tokenClient.requestAccessToken({
      prompt: "",
    });
  });
}

export function getApiErrorMessage(error, fallbackMessage) {
  const responseData = error?.response?.data;
  const errorCode = responseData?.code;
  const message = responseData?.message || error?.message || "";
  const apiBaseUrl = api?.defaults?.baseURL || "http://127.0.0.1:8000/api";
  const requestUrl = String(error?.config?.url || "").toLowerCase();

  if (errorCode === "email_unverified") {
    return "Email belum diverifikasi. Silakan cek inbox Anda lalu klik link verifikasi terlebih dahulu.";
  }

  if (errorCode === "email_not_registered") {
    return "Silahkan register terlebih dahulu.";
  }

  if (errorCode === "invitation_pending") {
    return "Akun admin ini belum diaktifkan. Silakan buka tautan aktivasi dari email undangan Anda.";
  }

  if (errorCode === "account_disabled") {
    return "Akun ini sedang dinonaktifkan. Silakan hubungi administrator.";
  }

  if (errorCode === "already_applied") {
    return "Anda sudah melamar di lowongan ini.";
  }

  if (error?.response?.status === 401 && requestUrl.endsWith("/login")) {
    return message || fallbackMessage || "Email atau Password salah.";
  }

  if (error?.response?.status === 401 || String(message).toLowerCase() === "unauthenticated.") {
    return "Sesi login Anda sudah tidak valid. Silakan masuk kembali.";
  }

  if (!error?.response && error?.request) {
    return `Backend tidak bisa dijangkau. Pastikan API Laravel berjalan di ${apiBaseUrl}.`;
  }

  if (typeof message === "string" && message.toLowerCase().includes("csrf token mismatch")) {
    if (requestUrl.includes("/auth/google")) {
      return "Login Google ditolak backend karena route masih terkena proteksi CSRF. Endpoint Google perlu dibuat stateless di backend.";
    }

    if (requestUrl.includes("/email/verification-notification")) {
      return "Permintaan kirim ulang email verifikasi ditolak backend. Proteksi CSRF untuk endpoint verifikasi email perlu dibuka.";
    }

    return "Permintaan ditolak backend karena token keamanan tidak cocok. Coba muat ulang halaman lalu ulangi lagi.";
  }

  if (responseData?.errors) {
    const firstError = Object.values(responseData.errors)[0];
    if (Array.isArray(firstError) && firstError[0]) {
      return firstError[0];
    }
  }

  return (
    message ||
    fallbackMessage ||
    "Terjadi kesalahan saat menghubungi server."
  );
}
