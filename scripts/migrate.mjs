// Aplica db/schema.sql contra TURSO_DATABASE_URL.
//   Local:  npm run db:migrate            (lee .env.local → file:.data/dev.db)
//   Prod:   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... node scripts/migrate.mjs
import { mkdir, readFile } from "node:fs/promises";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("TURSO_DATABASE_URL no está definida (usa `node --env-file=.env.local scripts/migrate.mjs` o exporta la variable)");
  process.exit(1);
}

if (url.startsWith("file:")) await mkdir(".data", { recursive: true });

const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
await client.executeMultiple(schema);
console.log(`Esquema aplicado en ${url}`);
client.close();
