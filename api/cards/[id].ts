import type { InValue } from "@libsql/client";
import { getDb } from "../_lib/db.js";
import { HttpError, json, noContent, pathParam, readJsonBody } from "../_lib/http.js";
import { withHandler } from "../_lib/log.js";
import { requireUser } from "../_lib/session.js";
import {
  CARD_COLUMNS,
  LIMITS,
  isUniqueViolation,
  optString,
  parseBox,
  parseDue,
  parseExamples,
  reqString,
  rowToCard,
} from "../_lib/cards.js";

const handler = withHandler("cards/:id", async (req) => {
  const user = await requireUser(req);
  const id = pathParam(req, "id");
  if (!id) throw new HttpError(400, "bad_id");
  const db = getDb();

  if (req.method === "DELETE") {
    const rs = await db.execute({
      sql: `DELETE FROM cards WHERE id = ? AND user_id = ?`,
      args: [id, user.id],
    });
    // Un id ajeno responde 404 indistinguible de uno inexistente (anti-IDOR).
    if (rs.rowsAffected === 0) throw new HttpError(404, "not_found");
    return noContent();
  }

  if (req.method === "PATCH") {
    const body = await readJsonBody(req);
    const sets: string[] = [];
    const args: InValue[] = [];
    const set = (column: string, value: InValue) => {
      sets.push(`${column} = ?`);
      args.push(value);
    };

    if (body.englishTerm !== undefined) set("english_term", reqString(body.englishTerm, "english_term", LIMITS.term));
    if (body.spanishTranslation !== undefined)
      set("spanish_translation", reqString(body.spanishTranslation, "spanish_translation", LIMITS.translation));
    if (body.exampleSentence !== undefined)
      set("example_sentence", optString(body.exampleSentence, "example_sentence", LIMITS.example) ?? "");
    if (body.pronunciation !== undefined)
      set("pronunciation", optString(body.pronunciation, "pronunciation", LIMITS.pronunciation));
    if (body.examples !== undefined) set("examples", JSON.stringify(parseExamples(body.examples)));
    if (body.mySentence !== undefined) set("my_sentence", optString(body.mySentence, "my_sentence", LIMITS.mySentence));
    if (body.box !== undefined) set("box", parseBox(body.box));
    if (body.due !== undefined) set("due", parseDue(body.due));
    if (sets.length === 0) throw new HttpError(400, "empty_patch");
    set("updated_at", new Date().toISOString());

    try {
      const rs = await db.execute({
        sql: `UPDATE cards SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`,
        args: [...args, id, user.id],
      });
      if (rs.rowsAffected === 0) throw new HttpError(404, "not_found");
    } catch (error) {
      if (isUniqueViolation(error)) throw new HttpError(409, "duplicate_term");
      throw error;
    }
    const rs = await db.execute({
      sql: `SELECT ${CARD_COLUMNS} FROM cards WHERE id = ? AND user_id = ?`,
      args: [id, user.id],
    });
    return json({ card: rowToCard(rs.rows[0]) });
  }

  throw new HttpError(405, "method_not_allowed");
});

export const PATCH = handler;
export const DELETE = handler;
