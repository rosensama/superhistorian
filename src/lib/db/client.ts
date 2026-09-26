// SurrealDB connection singleton for Next.js API routes
// Uses the global pattern to survive hot reloads in development

import { Surreal } from "surrealdb";

const SURREAL_URL = process.env.SURREAL_URL || "http://127.0.0.1:8000";
const SURREAL_USER = process.env.SURREAL_USER || "root";
const SURREAL_PASS = process.env.SURREAL_PASS || "root";
const SURREAL_NS = process.env.SURREAL_NS || "superhistorian";
const SURREAL_DB = process.env.SURREAL_DB || "main";

// Global singleton to survive Next.js hot reloads
const globalForSurreal = globalThis as unknown as {
  surrealClient: Surreal | undefined;
  surrealReady: Promise<Surreal> | undefined;
};

async function createClient(): Promise<Surreal> {
  const db = new Surreal();
  await db.connect(SURREAL_URL);
  await db.signin({ username: SURREAL_USER, password: SURREAL_PASS });
  // Ensure namespace and database exist
  await db.query(`DEFINE NAMESPACE IF NOT EXISTS ${SURREAL_NS}`);
  await db.query(`USE NS ${SURREAL_NS}; DEFINE DATABASE IF NOT EXISTS ${SURREAL_DB}`);
  await db.use({ namespace: SURREAL_NS, database: SURREAL_DB });
  // Initialize schema
  const { initializeSchema } = await import("./schema");
  await initializeSchema();
  console.log(`[SurrealDB] Connected to ${SURREAL_URL} (${SURREAL_NS}/${SURREAL_DB})`);
  return db;
}

export async function getDb(): Promise<Surreal> {
  globalForSurreal.surrealReady ??= createClient().then((client) => {
    globalForSurreal.surrealClient = client;
    return client;
  }).catch((err: unknown) => {
    globalForSurreal.surrealReady = undefined;
    throw err;
  });
  return globalForSurreal.surrealReady;
}

// Check if DB is available (non-throwing)
export async function isDbAvailable(): Promise<boolean> {
  try {
    const db = await getDb();
    await db.query("INFO FOR DB");
    return true;
  } catch {
    return false;
  }
}
