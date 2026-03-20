import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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