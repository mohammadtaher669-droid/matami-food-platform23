import app from "./app";
import { logger } from "./lib/logger";
import { autoSeedIfEmpty } from "./lib/auto-seed";

const port = Number(process.env["PORT"] ?? 3001);

if (Number.isNaN(port) || port <= 0) {
  logger.error({ port: process.env["PORT"] }, "Invalid PORT value — must be a positive integer");
  process.exit(1);
}

app.listen(port, () => {
  logger.info({ port }, "Server listening");
  // Auto-seed the database if empty — safe to run on every boot
  autoSeedIfEmpty().catch((err) => logger.error({ err }, "auto-seed failed"));
});
