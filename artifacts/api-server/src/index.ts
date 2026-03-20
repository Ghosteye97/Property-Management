import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const currentDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(currentDir, "../../../.env");

dotenv.config({ path: envPath, quiet: true });

const { default: app } = await import("./app");

const rawPort = process.env.PORT || "3000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log("DB:", process.env.DATABASE_URL);
});
