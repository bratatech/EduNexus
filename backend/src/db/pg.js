import pg from "pg";

const { Pool } = pg;

let pool;

export function getPool(databaseUrl) {
  if (!databaseUrl) return null;
  if (!pool) {
    pool = new Pool({ connectionString: databaseUrl, ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false } });
  }
  return pool;
}
