const rawApiBaseUrl = import.meta.env.VITE_API_URL?.trim() || "/api";

export const API_BASE_URL = rawApiBaseUrl.endsWith("/")
  ? rawApiBaseUrl.slice(0, -1)
  : rawApiBaseUrl;
