import { randomUUID } from "node:crypto";
import { getDb } from "../_lib/db";
import { HttpError, json, noContent, pathParam, readJsonBody } from "../_lib/http";
import { withHandler } from "../_lib/log";
import { hashPassword, verifyPassword } from "../_lib/password";
import { createSessionCookie, destroySessionCookie, getSessionUser } from "../_lib/session";
import { isUniqueViolation } from "../_lib/cards";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FAILS = 10;
const WINDOW_MS = 15 * 60 * 1000;

async function credentials(req: Request): Promise<{ email: string; password: string; code: string }> {
  const body = await readJsonBody(req);
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, "bad_email");
  if (password.length < 8 || password.length > 200) throw new HttpError(400, "bad_password");
  return { email, password, code: typeof body.code === "string" ? body.code : "" };
}

async function register(req: Request): Promise<Response> {
  const { email, password, code } = await credentials(req);
  // Con REGISTRATION_CODE definido, el alta exige el código de invitación
  // (una app pública con registro abierto acumula cuentas basura).
  const required = process.env.REGISTRATION_CODE;
  if (required && code !== required) throw new HttpError(403, "bad_code");
  const id = randomUUID();
  const passwordHash = await hashPassword(password);
  try {
    await getDb().execute({
      sql: `INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)`,
      args: [id, email, passwordHash],
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new HttpError(409, "email_taken");
    throw error;
  }
  const cookie = await createSessionCookie(id);
  return json({ user: { id, email } }, 201, { "Set-Cookie": cookie });
}

async function login(req: Request): Promise<Response> {
  const { email, password } = await credentials(req);
  const db = getDb();
  const now = Date.now();

  const attempts = await db.execute({
    sql: `SELECT fail_count, window_start FROM login_attempts WHERE key = ?`,
    args: [email],
  });
  const attempt = attempts.rows[0];
  const windowFresh = attempt !== undefined && now - Date.parse(String(attempt.window_start)) < WINDOW_MS;
  if (attempt && windowFresh && Number(attempt.fail_count) >= MAX_FAILS) {
    throw new HttpError(429, "too_many_attempts");
  }

  const users = await db.execute({
    sql: `SELECT id, password_hash FROM users WHERE email = ?`,
    args: [email],
  });
  const user = users.rows[0];
  const ok = user ? await verifyPassword(password, String(user.password_hash)) : false;

  if (!ok) {
    // 401 genérico (no revela si el email existe) + fallo a la ventana rodante.
    const reset = windowFresh ? 0 : 1;
    await db.execute({
      sql: `INSERT INTO login_attempts (key, fail_count, window_start) VALUES (?1, 1, ?2)
            ON CONFLICT(key) DO UPDATE SET
              fail_count = CASE WHEN ?3 THEN 1 ELSE fail_count + 1 END,
              window_start = CASE WHEN ?3 THEN ?2 ELSE window_start END`,
      args: [email, new Date(now).toISOString(), reset],
    });
    throw new HttpError(401, "invalid_credentials");
  }

  await db.batch(
    [
      { sql: `DELETE FROM login_attempts WHERE key = ?`, args: [email] },
      // limpieza oportunista de sesiones caducadas
      { sql: `DELETE FROM sessions WHERE expires_at <= ?`, args: [new Date(now).toISOString()] },
    ],
    "write"
  );
  const id = String(user.id);
  const cookie = await createSessionCookie(id);
  return json({ user: { id, email } }, 200, { "Set-Cookie": cookie });
}

const handler = withHandler("auth", async (req) => {
  const action = pathParam(req, "action");
  if (action === "me") {
    if (req.method !== "GET") throw new HttpError(405, "method_not_allowed");
    const user = await getSessionUser(req);
    if (!user) throw new HttpError(401, "unauthorized");
    return json({ user });
  }
  if (req.method !== "POST") throw new HttpError(405, "method_not_allowed");
  if (action === "register") return register(req);
  if (action === "login") return login(req);
  if (action === "logout") return noContent({ "Set-Cookie": await destroySessionCookie(req) });
  throw new HttpError(404, "not_found");
});

export const GET = handler;
export const POST = handler;
