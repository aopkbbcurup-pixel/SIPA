import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { initializeApi } from "./lib/api";
import "./index.css";
import "leaflet/dist/leaflet.css";

async function bootstrap() {
  try {
    await initializeApi();
  } catch (error) {
    console.error("Failed to initialise API client:", error);
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  );
}

bootstrap();
