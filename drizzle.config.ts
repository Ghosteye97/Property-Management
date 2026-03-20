import "dotenv/config";
import type { Config } from "drizzle-kit";

console.log("DB URL (drizzle):", process.env.DATABASE_URL);

export default {
  schema: "./lib/db/src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;