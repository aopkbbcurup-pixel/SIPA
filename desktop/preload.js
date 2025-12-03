const { contextBridge, ipcRenderer } = require("electron");

async function loadInitialConfig() {
  try {
    const config = await ipcRenderer.invoke("sipa:get-config");
    if (config && typeof config.apiBaseUrl === "string") {
      window.__SIPA_API_BASE__ = config.apiBaseUrl;
    }
    if (config && typeof config.publicApiBaseUrl === "string") {
      window.__SIPA_PUBLIC_API_BASE__ = config.publicApiBaseUrl;
    }
    if (config && typeof config.mode === "string") {
      window.__SIPA_APP_MODE__ = config.mode;
    }
    if (config && typeof config.mapsApiKey === "string") {
      window.__SIPA_GOOGLE_MAPS_KEY__ = config.mapsApiKey;
    }
  } catch (error) {
    console.error("Failed to load SIPA config:", error);
  }
}

contextBridge.exposeInMainWorld("electronAPI", {
  getConfig: () => ipcRenderer.invoke("sipa:get-config"),
  saveConfig: (config) => ipcRenderer.invoke("sipa:save-config", config),
  restartApp: () => ipcRenderer.invoke("sipa:restart-app"),
  onConfigUpdated: (callback) => {
    const listener = (_event, config) => callback(config);
    ipcRenderer.on("sipa:config-updated", listener);
    return () => {
      ipcRenderer.removeListener("sipa:config-updated", listener);
    };
  },
});

loadInitialConfig();
