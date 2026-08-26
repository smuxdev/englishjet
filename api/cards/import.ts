import { randomUUID } from "node:crypto";
import type { InStatement } from "@libsql/client";
import { getDb } from "../_lib/db.js";
import { HttpError, json, readJsonBody } from "../_lib/http.js";
import { withHandler } from "../_lib/log.js";
import { requireUser } from "../_lib/session.js";
import { LIMITS, optString, parseBox, parseDue, parseExamples, reqString } from "../_lib/cards.js";

const MAX_ITEMS = 5000;
const MAX_BYTES = 2_000_000;

// Importación en bloque (mazo de ejemplo + progreso anónimo migrado desde el
// cliente). INSERT OR IGNORE: los términos ya existentes se saltan.
const handler = withHandler("cards/import", async (req) => {
  if (req.method !== "POST") throw new HttpError(405, "method_not_allowed");
  const user = await requireUser(req);
  const body = await readJsonBody(req, MAX_BYTES);
  const items = body.cards;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    throw new HttpError(400, "bad_cards");
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const statements: InStatement[] = items.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new HttpError(400, "bad_cards");
    const item = raw as Record<string, unknown>;
    const exampleSentence = optString(item.exampleSentence, "example_sentence", LIMITS.example) ?? "";
    return {
      sql: `INSERT OR IGNORE INTO cards (id, user_id, english_term, spanish_translation, example_sentence,
                                         pronunciation, examples, my_sentence, box, due, date_added)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        randomUUID(),
        user.id,
        reqString(item.englishTerm, "english_term", LIMITS.term),
        reqString(item.spanishTranslation, "spanish_translation", LIMITS.translation),
        exampleSentence,
        optString(item.pronunciation, "pronunciation", LIMITS.pronunciation),
        JSON.stringify(item.examples === undefined ? (exampleSentence ? [exampleSentence] : []) : parseExamples(item.examples)),
        optString(item.mySentence, "my_sentence", LIMITS.mySentence),
        item.box === undefined ? 0 : parseBox(item.box),
        item.due === undefined ? today : parseDue(item.due),
        optString(item.dateAdded, "date_added", 40) ?? now,
      ],
    };
  });

  const results = await getDb().batch(statements, "write");
  const imported = results.reduce((sum, r) => sum + r.rowsAffected, 0);
  return json({ imported, skipped: items.length - imported }, 201);
});

export const POST = handler;
