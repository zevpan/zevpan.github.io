import { readFile } from "node:fs/promises";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.PGSSL === "disable" ? false : { rejectUnauthorized: true } });
const client = await pool.connect();
try {
  await client.query("SELECT pg_advisory_lock($1, $2)", [74021, 1]);
  await client.query("CREATE TABLE IF NOT EXISTS oms_schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const version = "001_initial_oms";
  const applied = await client.query("SELECT 1 FROM oms_schema_migrations WHERE version = $1", [version]);
  if (!applied.rowCount) {
    const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(schema);
      await client.query("INSERT INTO oms_schema_migrations (version) VALUES ($1)", [version]);
      await client.query("COMMIT");
      process.stdout.write(`Applied ${version}\n`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } else {
    process.stdout.write(`${version} is already applied\n`);
  }
} finally {
  await client.query("SELECT pg_advisory_unlock($1, $2)", [74021, 1]);
  client.release();
  await pool.end();
}
