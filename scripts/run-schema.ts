// Applies db/schema.sql using the pg driver, so psql does not need to be installed.
// Run: npm run db:schema
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set. Put it in .env.local (see .env.example).");
    process.exit(1);
  }
  const sql = readFileSync(join(process.cwd(), "db", "schema.sql"), "utf8");
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    // Continuous aggregates cannot be created inside a transaction block,
    // so run the file as-is (the simple query protocol runs it statement by statement).
    await client.query(sql);
    const { rows } = await client.query(
      "SELECT hypertable_name FROM timescaledb_information.hypertables ORDER BY 1",
    );
    console.log("Schema applied. Hypertables:", rows.map((r) => r.hypertable_name).join(", "));
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
