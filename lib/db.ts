import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || "libsql://placeholder-db.turso.io";
const authToken = process.env.TURSO_AUTH_TOKEN || "placeholder-token";

export const turso = createClient({
  url,
  authToken,
});

// Placeholder schema initialization helper
export async function initDb() {
  // TODO: Create tables for users, campaigns, emails, etc.
  // await turso.execute(`
  //   CREATE TABLE IF NOT EXISTS users (
  //     id TEXT PRIMARY KEY,
  //     email TEXT UNIQUE NOT NULL,
  //     name TEXT,
  //     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  //   )
  // `);
}
