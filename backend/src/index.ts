import express from "express";
import cors from "cors";
import morgan from "morgan";
import routes from "./routes";
import { env, ensureDirectories, paths } from "./config/env";
import { db } from "./store/database";

async function bootstrap() {
  await ensureDirectories();
  await db.init();

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan("dev"));
  app.use("/uploads", express.static(paths.uploadDir));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api", routes);

  app.use((req, res) => {
    res.status(404).json({ message: "Endpoint not found", path: req.path });
  });

  const { port, host } = env;
  app.listen(port, host, () => {
    console.log(`SIPA backend running at http://${host}:${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
