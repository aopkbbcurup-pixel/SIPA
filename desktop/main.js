const { app, BrowserWindow, shell, protocol, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const { loadConfig, saveConfig, defaultConfig } = require("./config");

let mainWindow;
let backendStarted = false;
let appConfig = null;

function loadConfigSafe() {
  try {
    return loadConfig();
  } catch (error) {
    console.error("Failed to load SIPA config:", error);
    return { ...defaultConfig };
  }
}

function applyAppConfig(config) {
  if (!config) {
    return;
  }
  const backend = config.backend ?? {};
  const port = backend.port ?? 4000;
  const host =
    backend.host ?? (config.mode === "server" ? "0.0.0.0" : "127.0.0.1");
  const apiBase =
    config.apiBaseUrl && config.apiBaseUrl.length > 0
      ? config.apiBaseUrl
      : `http://localhost:${port}/api`;
  const publicApiBase =
    config.publicApiBaseUrl && config.publicApiBaseUrl.length > 0
      ? config.publicApiBaseUrl
      : apiBase;

  process.env.PORT = String(port);
  process.env.HOST = host;
  process.env.SIPA_MODE = config.mode ?? "standalone";
  process.env.SIPA_SERVE_FRONTEND = backend.serveFrontend ? "true" : "false";
  process.env.SIPA_FRONTEND_DIST = getFrontendDistPath();
  process.env.SIPA_API_BASE_URL = apiBase;
  process.env.SIPA_PUBLIC_API_BASE_URL = publicApiBase;
  process.env.GOOGLE_MAPS_API_KEY =
    typeof config.mapsApiKey === "string" ? config.mapsApiKey : "";
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getBackendBasePath() {
  if (!app.isPackaged) {
    return path.join(__dirname, "..", "backend");
  }

  const directPath = path.join(process.resourcesPath, "backend");
  if (fs.existsSync(directPath)) {
    return directPath;
  }

  return path.join(process.resourcesPath, "app.asar.unpacked", "backend");
}

function getFrontendDistPath() {
  if (!app.isPackaged) {
    return path.join(__dirname, "..", "frontend", "dist");
  }

  const nestedPath = path.join(process.resourcesPath, "frontend", "dist");
  if (fs.existsSync(path.join(nestedPath, "index.html"))) {
    return nestedPath;
  }

  const asarPath = path.join(process.resourcesPath, "app.asar", "frontend", "dist");
  if (fs.existsSync(path.join(asarPath, "index.html"))) {
    return asarPath;
  }

  return nestedPath;
}

const net = require("net");

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false); // Port is taken
      } else {
        resolve(false); // Other error, assume unusable
      }
    });
    server.once("listening", () => {
      server.close(() => resolve(true)); // Port is free
    });
    server.listen(port, "0.0.0.0");
  });
}

async function findFreePort(startPort) {
  let port = startPort;
  while (port < startPort + 100) {
    const isFree = await checkPort(port);
    if (isFree) {
      return port;
    }
    port += 1;
  }
  throw new Error("No free ports found");
}

async function startBackend() {
  if (backendStarted || process.env.ELECTRON_USE_DEV_BACKEND === "true") {
    backendStarted = true;
    return;
  }

  if (!appConfig) {
    appConfig = loadConfigSafe();
    applyAppConfig(appConfig);
  }

  // Find a free port
  const configuredPort = appConfig.backend?.port || 4000;
  const freePort = await findFreePort(configuredPort);

  if (freePort !== configuredPort) {
    console.log(`Port ${configuredPort} is in use, switching to ${freePort}`);
    if (appConfig.backend) {
      appConfig.backend.port = freePort;
    }
    // Update API Base URL if it matches the default pattern
    const defaultApiUrl = `http://localhost:${configuredPort}/api`;
    const defaultPublicApiUrl = `http://localhost:${configuredPort}/api`;

    if (appConfig.apiBaseUrl === defaultApiUrl) {
      appConfig.apiBaseUrl = `http://localhost:${freePort}/api`;
    }
    if (appConfig.publicApiBaseUrl === defaultPublicApiUrl) {
      appConfig.publicApiBaseUrl = `http://localhost:${freePort}/api`;
    }
  }

  applyAppConfig(appConfig);

  if (appConfig && appConfig.mode === "client") {
    backendStarted = true;
    return;
  }

  backendStarted = true;

  const userDataRoot = app.getPath("userData");
  const uploadDir = path.join(userDataRoot, "uploads");
  const pdfDir = path.join(userDataRoot, "generated-pdfs");
  const dataFile = path.join(userDataRoot, "storage", "database.json");
  const logFile = path.join(userDataRoot, "backend.log");

  process.env.PORT = String(freePort);
  process.env.HOST = process.env.HOST || "127.0.0.1";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "sipa-desktop-secret";
  process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || uploadDir;
  process.env.PDF_OUTPUT_DIR = process.env.PDF_OUTPUT_DIR || pdfDir;
  process.env.DATA_FILE = process.env.DATA_FILE || dataFile;
  // Force JSON database for desktop app to avoid MongoDB requirement
  process.env.DATABASE_TYPE = "json";

  [uploadDir, pdfDir, path.dirname(dataFile)].forEach(ensureDir);

  const backendEntry = path.join(getBackendBasePath(), "dist", "index.js");

  try {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] Starting backend at ${backendEntry} on port ${freePort}\n`);

    // Redirect console output to log file
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);
    const originalStderrWrite = process.stderr.write.bind(process.stderr);

    process.stdout.write = (chunk, encoding, callback) => {
      logStream.write(chunk, encoding);
      return originalStdoutWrite(chunk, encoding, callback);
    };

    process.stderr.write = (chunk, encoding, callback) => {
      logStream.write(chunk, encoding);
      return originalStderrWrite(chunk, encoding, callback);
    };

    require(backendEntry);

    fs.appendFileSync(logFile, `[${new Date().toISOString()}] Backend require successful\n`);
  } catch (error) {
    const errorMsg = `[${new Date().toISOString()}] Failed to start backend: ${error.stack || error}\n`;
    console.error(errorMsg);
    fs.appendFileSync(logFile, errorMsg);
    app.quit();
  }
}

function getHealthCheckUrl(config) {
  if (!config) {
    return null;
  }
  if (config.mode === "client") {
    if (!config.apiBaseUrl) {
      return null;
    }
    try {
      const apiUrl = new URL(config.apiBaseUrl);
      apiUrl.pathname = "/health";
      apiUrl.search = "";
      return apiUrl.toString();
    } catch {
      return null;
    }
  }
  const port = config.backend?.port ?? 4000;
  return `http://127.0.0.1:${port}/health`;
}

async function waitForBackend(config) {
  if (process.env.ELECTRON_USE_DEV_BACKEND === "true") {
    return;
  }

  const healthUrl = getHealthCheckUrl(config);
  if (!healthUrl) {
    return;
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return;
      }
    } catch {
      // ignore and retry
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function createWindow() {
  await startBackend();
  await waitForBackend(appConfig);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 640,
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.removeMenu();

  const startUrl = process.env.ELECTRON_START_URL;
  const appHost = "sipa";

  mainWindow.webContents.on("before-input-event", (event, input) => {
    const isDevToolsShortcut =
      input.type === "keyDown" &&
      input.shift &&
      (input.control || input.meta) &&
      input.key.toLowerCase() === "i";

    if (isDevToolsShortcut) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
      } else {
        mainWindow.webContents.openDevTools({ mode: "detach" });
      }
      event.preventDefault();
    }
  });

  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`Failed to load URL ${validatedURL}: [${errorCode}] ${errorDescription}`);
  });

  if (startUrl) {
    await mainWindow.loadURL(startUrl);
  } else {
    if (app.isPackaged) {
      await mainWindow.loadURL(`app://${appHost}/index.html`);
    } else {
      const frontendIndex = path.join(getFrontendDistPath(), "index.html");
      await mainWindow.loadFile(frontendIndex);
    }
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", async () => {
  if (!appConfig) {
    appConfig = loadConfigSafe();
    applyAppConfig(appConfig);
  }

  if (app.isPackaged) {
    protocol.registerFileProtocol("app", (request, callback) => {
      try {
        const url = new URL(request.url);
        let relativePath = url.pathname;

        if (!relativePath || relativePath === "/" || relativePath === "//") {
          relativePath = "/index.html";
        }

        const decodedPath = decodeURIComponent(relativePath);
        const sanitizedPath = decodedPath.replace(/^[\\/]+/, "");

        if (sanitizedPath === "sipa-config.js") {
          const apiBase =
            appConfig?.apiBaseUrl && appConfig.apiBaseUrl.length > 0
              ? appConfig.apiBaseUrl
              : `http://localhost:${process.env.PORT ?? "4000"}/api`;
          const publicApiBase =
            appConfig?.publicApiBaseUrl && appConfig.publicApiBaseUrl.length > 0
              ? appConfig.publicApiBaseUrl
              : apiBase;
          const script = `window.__SIPA_API_BASE__=${JSON.stringify(apiBase)};window.__SIPA_PUBLIC_API_BASE__=${JSON.stringify(publicApiBase)};window.__SIPA_APP_MODE__=${JSON.stringify(appConfig?.mode ?? "standalone")};window.__SIPA_GOOGLE_MAPS_KEY__=${JSON.stringify(appConfig?.mapsApiKey ?? "")};`;
          callback({
            mimeType: "application/javascript",
            data: Buffer.from(script),
          });
          return;
        }

        const targetPath = path.join(getFrontendDistPath(), sanitizedPath);

        callback({ path: targetPath });
      } catch (error) {
        console.error("Failed to resolve app:// request", request.url, error);
        callback({ error: -2 });
      }
    });
  }
  await createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

app.on("web-contents-created", (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
});

ipcMain.handle("sipa:get-config", async () => {
  if (!appConfig) {
    appConfig = loadConfigSafe();
    applyAppConfig(appConfig);
  }
  return appConfig;
});

ipcMain.handle("sipa:save-config", async (_event, patch) => {
  try {
    appConfig = saveConfig(patch ?? {});
  } catch (error) {
    console.error("Failed to save SIPA config:", error);
    throw error;
  }
  applyAppConfig(appConfig);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("sipa:config-updated", appConfig);
  }
  return appConfig;
});

ipcMain.handle("sipa:restart-app", () => {
  app.relaunch();
  app.exit(0);
});
