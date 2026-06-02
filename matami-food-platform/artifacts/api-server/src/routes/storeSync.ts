import { Router } from "express";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../lib/auth";

const router = Router();

// Use the compiled file's directory to locate data/ — works correctly in both
// development (artifacts/api-server/dist) and production
// (workspace root → artifacts/api-server/dist/index.mjs).
const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const SNAPSHOT_FILE = join(DATA_DIR, "store-snapshot.json");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readSnapshot(): Record<string, unknown> | null {
  try {
    ensureDataDir();
    if (!existsSync(SNAPSHOT_FILE)) return null;
    return JSON.parse(readFileSync(SNAPSHOT_FILE, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function writeSnapshot(data: Record<string, unknown>): void {
  ensureDataDir();
  writeFileSync(SNAPSHOT_FILE, JSON.stringify(data), "utf-8");
}

// GET /api/store — public, no auth required; returns catalog snapshot
router.get("/store", (req, res) => {
  const snapshot = readSnapshot();
  if (!snapshot) {
    res.status(404).json({ error: "No store snapshot found yet" });
    return;
  }
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.json(snapshot);
});

// POST /api/store — admin JWT required; saves new catalog snapshot to disk
router.post("/store", (req, res) => {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    jwt.verify(auth.slice(7), getJwtSecret());
  } catch {
    res.status(401).json({ error: "Session expired. Please log in again." });
    return;
  }

  const data = req.body as Record<string, unknown>;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    res.status(400).json({ error: "Invalid snapshot data" });
    return;
  }

  try {
    writeSnapshot(data);
    req.log.info({ keys: Object.keys(data).length, file: SNAPSHOT_FILE }, "Store snapshot saved");
    res.json({ success: true, keys: Object.keys(data).length });
  } catch (err) {
    req.log.error({ err, file: SNAPSHOT_FILE }, "Failed to write store snapshot");
    res.status(500).json({ error: "Failed to save snapshot" });
  }
});

export default router;
