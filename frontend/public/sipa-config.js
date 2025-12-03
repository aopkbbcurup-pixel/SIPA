(function () {
  const envApi = window.__SIPA_ENV_API__;
  const envPublic = window.__SIPA_ENV_PUBLIC_API__;
  const envMaps = window.__SIPA_ENV_MAPS_KEY__;
  window.__SIPA_API_BASE__ = window.__SIPA_API_BASE__ || envApi || "http://localhost:4000/api";
  window.__SIPA_PUBLIC_API_BASE__ =
    window.__SIPA_PUBLIC_API_BASE__ || envPublic || window.__SIPA_API_BASE__;
  window.__SIPA_APP_MODE__ = window.__SIPA_APP_MODE__ || "standalone";
  window.__SIPA_GOOGLE_MAPS_KEY__ = window.__SIPA_GOOGLE_MAPS_KEY__ || envMaps || "";
})();
