import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

import authRoutes from "./routes/auth";
import templatesRoutes from "./routes/templates";
import documentsRoutes from "./routes/documents";
import subscriptionsRoutes from "./routes/subscriptions";
import uploadsRoutes from "./routes/uploads";
import webhooksRoutes from "./routes/webhooks";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Local file serving for dev (generated PDFs / uploads when STORAGE_PROVIDER=local)
app.use(
  "/files",
  express.static(path.resolve(env.STORAGE_LOCAL_PATH), {
    fallthrough: true,
    maxAge: "1h",
  })
);

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "doclix-api",
    version: "0.3.0",
    phase: 3,
    ts: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/templates", templatesRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/webhooks", webhooksRoutes);

app.use(errorHandler);

export default app;
