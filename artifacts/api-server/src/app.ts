import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { requireManagementAuth } from "./lib/auth";
import router from "./routes";

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const app: Express = express();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(currentDir, "../../../uploads");

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));
app.use("/api/uploads", requireManagementAuth, express.static(uploadsDir));

// ✅ TEMP health check (safe, no schema imports)
app.get("/api/health", async (_req, res) => {
  console.log("➡️ health check hit");

  try {
    const result = await db.execute(sql`SELECT 1 as test`);
    console.log("✅ DB OK");

    res.json({ status: "ok", db: result });
  } catch (err) {
    console.error("❌ DB FAILED:", err);
    res.status(500).json({ status: "error", error: String(err) });
  }
});

// ⚠️ KEEP your existing routes (don’t touch yet)
app.use("/api", router);

export default app;
