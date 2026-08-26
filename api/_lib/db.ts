import { createClient, type Client } from "@libsql/client";

// Singleton por instancia de function (se reutiliza entre invocaciones calientes).
let client: Client | null = null;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL no está definida");
    client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  }
  return client;
}
