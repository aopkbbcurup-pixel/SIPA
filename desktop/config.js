const fs = require("node:fs");
const path = require("node:path");
const { app } = require("electron");

const CONFIG_FILENAME = "sipa-config.json";

const defaultConfig = {
  mode: "server",
  backend: {
    host: "0.0.0.0",
    port: 4000,
    serveFrontend: true,
  },
  apiBaseUrl: "http://localhost:4000/api",
  publicApiBaseUrl: "http://localhost:4000/api",
  mapsApiKey: "",
};

function getConfigPath() {
  const userDataDir = app.getPath("userData");
  return path.join(userDataDir, CONFIG_FILENAME);
}

function parsePort(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < 1 || parsed > 65535) {
    return fallback;
  }
  return parsed;
}

function normaliseConfig(input = {}, previous = defaultConfig) {
  const rawMode = input.mode ?? previous.mode ?? defaultConfig.mode;
  const mode = rawMode === "client" || rawMode === "server" ? rawMode : "standalone";

  const backendInput = {
    ...(previous.backend ?? {}),
    ...(input.backend ?? {}),
  };

  const port = parsePort(backendInput.port, defaultConfig.backend.port);

  let host = backendInput.host;
  if (typeof host === "string") {
    host = host.trim();
  } else if (host !== undefined && host !== null) {
    host = String(host).trim();
  }
  if (!host) {
    host = mode === "server" ? "0.0.0.0" : "127.0.0.1";
  }
  if (
    mode === "server" &&
    typeof host === "string" &&
    ["127.0.0.1", "localhost", "::1"].includes(host.trim().toLowerCase())
  ) {
    host = "0.0.0.0";
  }

  const serveFrontend =
    mode === "server"
      ? backendInput.serveFrontend !== undefined
        ? Boolean(backendInput.serveFrontend)
        : true
      : false;

  let apiBaseUrl = input.apiBaseUrl ?? previous.apiBaseUrl ?? defaultConfig.apiBaseUrl;
  if (typeof apiBaseUrl !== "string") {
    apiBaseUrl = defaultConfig.apiBaseUrl;
  }
  apiBaseUrl = apiBaseUrl.trim();

  if (mode !== "client" || apiBaseUrl.length === 0) {
    apiBaseUrl = `http://localhost:${port}/api`;
  }

  let publicApiBaseUrl =
    input.publicApiBaseUrl ?? previous.publicApiBaseUrl ?? defaultConfig.publicApiBaseUrl ?? apiBaseUrl;
  if (typeof publicApiBaseUrl !== "string") {
    publicApiBaseUrl = apiBaseUrl;
  } else {
    publicApiBaseUrl = publicApiBaseUrl.trim();
  }
  if (!publicApiBaseUrl) {
    publicApiBaseUrl = apiBaseUrl;
  }

  let mapsApiKey =
    typeof input.mapsApiKey === "string"
      ? input.mapsApiKey
      : typeof previous.mapsApiKey === "string"
        ? previous.mapsApiKey
        : defaultConfig.mapsApiKey;
  mapsApiKey = mapsApiKey?.trim?.() ?? "";

  return {
    mode,
    backend: {
      host,
      port,
      serveFrontend,
    },
    apiBaseUrl,
    publicApiBaseUrl,
    mapsApiKey,
  };
}

function readConfigFile(configPath) {
  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeConfigFile(configPath, config) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
}

function loadConfig() {
  const configPath = getConfigPath();
  const existing = readConfigFile(configPath);
  const normalised = normaliseConfig(existing ?? undefined);
  if (!existing) {
    writeConfigFile(configPath, normalised);
  }
  return normalised;
}

function saveConfig(patch) {
  const configPath = getConfigPath();
  const current = normaliseConfig(readConfigFile(configPath) ?? undefined);
  const merged = {
    ...current,
    ...patch,
    backend: {
      ...current.backend,
      ...(patch.backend ?? {}),
    },
  };
  if (patch.mapsApiKey !== undefined) {
    merged.mapsApiKey = patch.mapsApiKey;
  }
  const normalised = normaliseConfig(merged, current);
  writeConfigFile(configPath, normalised);
  return normalised;
}

module.exports = {
  defaultConfig,
  getConfigPath,
  loadConfig,
  saveConfig,
};
