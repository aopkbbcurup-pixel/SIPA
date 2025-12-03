import axios from "axios";

export interface SipaRendererConfig {
  mode: "standalone" | "server" | "client";
  backend: {
    host: string;
    port: number;
    serveFrontend: boolean;
  };
  apiBaseUrl: string;
  publicApiBaseUrl?: string;
  mapsApiKey?: string;
}

declare global {
  interface Window {
    __SIPA_API_BASE__?: string;
    __SIPA_PUBLIC_API_BASE__?: string;
    __SIPA_APP_MODE__?: string;
    __SIPA_GOOGLE_MAPS_KEY__?: string;
    electronAPI?: {
      getConfig: () => Promise<SipaRendererConfig>;
      saveConfig: (config: Partial<SipaRendererConfig>) => Promise<SipaRendererConfig>;
      restartApp: () => Promise<void>;
      onConfigUpdated: (callback: (config: SipaRendererConfig) => void) => void | (() => void);
    };
  }
}

function resolveDefaultBaseUrl(): string {
  if (typeof window !== "undefined") {
    if (window.__SIPA_API_BASE__ && window.__SIPA_API_BASE__.length > 0) {
      return window.__SIPA_API_BASE__;
    }
    if (window.location && window.location.origin && window.location.origin.startsWith("http")) {
      return `${window.location.origin.replace(/\/$/, "")}/api`;
    }
  }

  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  return "http://localhost:4000/api";
}

const TOKEN_STORAGE_KEY = "sipa_token";
let currentApiBaseUrl = resolveDefaultBaseUrl();

export const api = axios.create({
  baseURL: currentApiBaseUrl,
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export function setAuthToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

export function getApiBaseUrl() {
  return currentApiBaseUrl;
}

export function setApiBaseUrl(url: string) {
  if (!url || typeof url !== "string") {
    return;
  }
  const trimmed = url.trim();
  if (!trimmed || trimmed === currentApiBaseUrl) {
    return;
  }
  currentApiBaseUrl = trimmed;
  api.defaults.baseURL = currentApiBaseUrl;
  if (typeof window !== "undefined") {
    window.__SIPA_API_BASE__ = currentApiBaseUrl;
  }
}

export async function initializeApi() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.__SIPA_API_BASE__) {
    setApiBaseUrl(window.__SIPA_API_BASE__);
  }

  if (window.electronAPI?.getConfig) {
    try {
      const config = await window.electronAPI.getConfig();
      if (config?.apiBaseUrl) {
        setApiBaseUrl(config.apiBaseUrl);
      }
      if (config?.publicApiBaseUrl) {
        window.__SIPA_PUBLIC_API_BASE__ = config.publicApiBaseUrl;
      }
      if (config) {
        window.__SIPA_GOOGLE_MAPS_KEY__ = config.mapsApiKey ?? "";
      }
      if (typeof window.electronAPI.onConfigUpdated === "function") {
        window.electronAPI.onConfigUpdated((updated) => {
          if (updated?.apiBaseUrl) {
            setApiBaseUrl(updated.apiBaseUrl);
          }
          if (updated?.publicApiBaseUrl) {
            window.__SIPA_PUBLIC_API_BASE__ = updated.publicApiBaseUrl;
          }
          if (updated?.mapsApiKey !== undefined) {
            window.__SIPA_GOOGLE_MAPS_KEY__ = updated.mapsApiKey ?? "";
          }
        });
      }
    } catch (error) {
      console.error("Failed to initialise API base URL from Electron config:", error);
    }
  }
}
