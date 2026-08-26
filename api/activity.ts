import { getDb } from "./_lib/db.js";
import { HttpError, json, noContent, readJsonBody } from "./_lib/http.js";
import { withHandler } from "./_lib/log.js";
import { requireUser } from "./_lib/session.js";

function parseDelta(v: unknown): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < -1 || v > 1) throw new HttpError(400, "bad_delta");
  return v;
}

const handler = withHandler("activity", async (req) => {
  const user = await requireUser(req);
  const db = getDb();

  if (req.method === "GET") {
    const rs = await db.execute({
      sql: `SELECT date, reviewed, correct FROM activity WHERE user_id = ?`,
      args: [user.id],
    });
    const activity: Record<string, { reviewed: number; correct: number }> = {};
    for (const row of rs.rows) {
      activity[String(row.date)] = { reviewed: Number(row.reviewed), correct: Number(row.correct) };
    }
    return json({ activity });
  }

  if (req.method === "POST") {
    // Deltas ±1: el mismo endpoint sirve para el log y para el deshacer
    // (clamp a 0, como unlogReview en el cliente).
    const body = await readJsonBody(req);
    const date = body.date;
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "bad_date");
    const reviewedDelta = parseDelta(body.reviewedDelta);
    const correctDelta = parseDelta(body.correctDelta);
    await db.execute({
      sql: `INSERT INTO activity (user_id, date, reviewed, correct) VALUES (?1, ?2, max(0, ?3), max(0, ?4))
            ON CONFLICT(user_id, date) DO UPDATE SET
              reviewed = max(0, reviewed + ?3),
              correct = max(0, correct + ?4)`,
      args: [user.id, date, reviewedDelta, correctDelta],
    });
    return noContent();
  }

  throw new HttpError(405, "method_not_allowed");
});

export const GET = handler;
export const POST = handler;
