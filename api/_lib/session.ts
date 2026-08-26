import { createHash, randomBytes } from "node:crypto";
import { getDb } from "./db.js";
import { HttpError } from "./http.js";

const COOKIE = "ej_session";
const SESSION_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function readCookie(req: Request): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE && rest.length > 0) return rest.join("=");
  }
  return null;
}

function cookieValue(token: string, maxAgeSeconds: number): string {
  // Secure solo en Vercel: en local el dev server sirve por http.
  const secure = process.env.VERCEL ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const token = readCookie(req);
  if (!token) return null;
  const rs = await getDb().execute({
    sql: `SELECT u.id AS id, u.email AS email
          FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = ? AND s.expires_at > ?`,
    args: [hashToken(token), new Date().toISOString()],
  });
  const row = rs.rows[0];
  return row ? { id: String(row.id), email: String(row.email) } : null;
}

export async function requireUser(req: Request): Promise<SessionUser> {
  const user = await getSessionUser(req);
  if (!user) throw new HttpError(401, "unauthorized");
  return user;
}

// Devuelve el valor de Set-Cookie; el token en claro solo viaja en la cookie.
export async function createSessionCookie(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await getDb().execute({
    sql: `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)`,
    args: [hashToken(token), userId, new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString()],
  });
  return cookieValue(token, SESSION_DAYS * 86_400);
}

export async function destroySessionCookie(req: Request): Promise<string> {
  const token = readCookie(req);
  if (token) {
    await getDb().execute({ sql: `DELETE FROM sessions WHERE token_hash = ?`, args: [hashToken(token)] });
  }
  return cookieValue("", 0);
}
