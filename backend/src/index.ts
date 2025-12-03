import { createServer } from "http";
import { Server } from "socket.io";
import { notificationService } from "./services/notification.service";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import routes from "./routes";
import { env, ensureDirectories, paths } from "./config/env";
import { db } from "./store/database";

export async function createApp() {
  const app = express();

  // Security Middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow loading resources like images
    contentSecurityPolicy: false, // Disable CSP for now to avoid issues with maps/scripts
  }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { message: "Too many requests, please try again later." },
  });
  app.use("/api", limiter); // Apply rate limiting to API routes only

  app.use(cors({
    origin: (requestOrigin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!requestOrigin) return callback(null, true);
      // If CORS_ORIGIN is *, allow all by reflecting the origin
      if (env.corsOrigin === "*") {
        return callback(null, true);
      }
      // Otherwise check against the list
      const allowedOrigins = env.corsOrigin.split(",").map(o => o.trim());
      if (allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("dev"));

  // Static files - might not work in Firebase but harmless
  if (paths.uploadDir) {
    app.use("/uploads", express.static(paths.uploadDir));
  }

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", routes);

  app.use("/api", (req, res) => {
    res.status(404).json({ message: "Endpoint tidak ditemukan", path: req.path });
  });

  if (env.serveFrontend && paths.frontendDist) {
    const frontendIndexPath = path.join(paths.frontendDist, "index.html");

    app.get("/sipa-config.js", (req, res) => {
      const origin = `${req.protocol}://${req.get("host") ?? `localhost:${env.port}`}`;
      const apiBase =
        env.publicApiBaseUrl && env.publicApiBaseUrl.length > 0
          ? env.publicApiBaseUrl
          : `${origin}/api`;
      const publicApi =
        env.publicApiBaseUrl && env.publicApiBaseUrl.length > 0
          ? env.publicApiBaseUrl
          : apiBase;

      const script = `window.__SIPA_API_BASE__=${JSON.stringify(apiBase)};window.__SIPA_PUBLIC_API_BASE__=${JSON.stringify(publicApi)};window.__SIPA_APP_MODE__=${JSON.stringify(env.mode)};window.__SIPA_GOOGLE_MAPS_KEY__=${JSON.stringify(env.googleMapsApiKey ?? "")};`;
      res.type("application/javascript").send(script);
    });

    app.use(express.static(paths.frontendDist));

    // Catch-all for non-API routes using a regex that excludes /api paths.
    app.get(/^(?!\/api\/).*/, (_req, res) => {
      res.sendFile(frontendIndexPath);
    });
  } else {
    app.use((req, res) => {
      res.status(404).json({ message: "Endpoint tidak ditemukan", path: req.path });
    });
  }

  return { app };
}

export async function bootstrap() {
  await ensureDirectories();
  await db.init();

  const { app } = await createApp();
  const httpServer = createServer(app);

  // Initialize Socket.io
  const io = new Server(httpServer, {
    cors: {
      origin: (requestOrigin, callback) => {
        if (!requestOrigin) return callback(null, true);
        if (env.corsOrigin === "*") return callback(null, true);
        const allowedOrigins = env.corsOrigin.split(",").map(o => o.trim());
        if (allowedOrigins.includes(requestOrigin)) return callback(null, true);
        callback(new Error("Not allowed by CORS"), false);
      },
      methods: ["GET", "POST"],
      credentials: true
    }
  });
  notificationService.init(io);

  const { port, host } = env;
  httpServer.listen(port, host, () => {
    console.log(`SIPA backend running at http://${host}:${port}`);
  });
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
}
