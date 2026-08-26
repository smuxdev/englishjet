import { randomUUID } from "node:crypto";
import { getDb } from "../_lib/db";
import { HttpError, json, readJsonBody } from "../_lib/http";
import { withHandler } from "../_lib/log";
import { requireUser } from "../_lib/session";
import {
  CARD_COLUMNS,
  LIMITS,
  isUniqueViolation,
  optString,
  parseDue,
  reqString,
  rowToCard,
  type CardDTO,
} from "../_lib/cards";

const handler = withHandler("cards", async (req) => {
  const user = await requireUser(req);
  const db = getDb();

  if (req.method === "GET") {
    // El mazo completo de una vez: <5k filas por usuario, sin paginación.
    const rs = await db.execute({
      sql: `SELECT ${CARD_COLUMNS} FROM cards WHERE user_id = ? ORDER BY date_added DESC, english_term ASC`,
      args: [user.id],
    });
    return json({ cards: rs.rows.map(rowToCard) });
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    const englishTerm = reqString(body.englishTerm, "english_term", LIMITS.term);
    const spanishTranslation = reqString(body.spanishTranslation, "spanish_translation", LIMITS.translation);
    const exampleSentence = optString(body.exampleSentence, "example_sentence", LIMITS.example) ?? "";
    const pronunciation = optString(body.pronunciation, "pronunciation", LIMITS.pronunciation);
    const due = body.due === undefined ? new Date().toISOString().slice(0, 10) : parseDue(body.due);
    const card: CardDTO = {
      id: randomUUID(),
      englishTerm,
      spanishTranslation,
      exampleSentence,
      pronunciation,
      examples: exampleSentence ? [exampleSentence] : [],
      mySentence: null,
      box: 0,
      due,
      dateAdded: new Date().toISOString(),
    };
    try {
      await db.execute({
        sql: `INSERT INTO cards (id, user_id, english_term, spanish_translation, example_sentence,
                                 pronunciation, examples, my_sentence, box, due, date_added)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          card.id,
          user.id,
          card.englishTerm,
          card.spanishTranslation,
          card.exampleSentence,
          card.pronunciation,
          JSON.stringify(card.examples),
          card.mySentence,
          card.box,
          card.due,
          card.dateAdded,
        ],
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new HttpError(409, "duplicate_term");
      throw error;
    }
    return json({ card }, 201);
  }

  throw new HttpError(405, "method_not_allowed");
});

export const GET = handler;
export const POST = handler;
