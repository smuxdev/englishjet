import { HttpError, json } from "./_lib/http";
import { withHandler } from "./_lib/log";
import { requireUser } from "./_lib/session";

// Proxy a la API pública de Tatoeba (evita CORS), portado del middleware de
// vite.config.ts. Requiere sesión: sin auth sería un proxy abierto.
const handler = withHandler("suggest-examples", async (req) => {
  if (req.method !== "GET") throw new HttpError(405, "method_not_allowed");
  await requireUser(req);
  const term = (new URL(req.url).searchParams.get("term") ?? "").trim();
  if (!term || term.length > 80) throw new HttpError(400, "bad_term");

  const api = `https://tatoeba.org/eng/api_v0/search?from=eng&orphans=no&unapproved=no&query=${encodeURIComponent(term)}`;
  let data: { results?: { text?: string }[] };
  try {
    const res = await fetch(api, {
      headers: { "User-Agent": "englishjet (vocabulary app)" },
      signal: AbortSignal.timeout(10_000),
    });
    data = (await res.json()) as { results?: { text?: string }[] };
  } catch {
    throw new HttpError(502, "tatoeba_unavailable");
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of data.results ?? []) {
    const text = (item.text ?? "").trim();
    if (text.length < 20 || text.length > 110) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
    if (out.length >= 10) break;
  }
  return json(out);
});

export const GET = handler;
