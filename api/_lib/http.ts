export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function noContent(headers: Record<string, string> = {}): Response {
  return new Response(null, { status: 204, headers });
}

// Exigir JSON en mutaciones también actúa de cinturón anti-CSRF (además de
// SameSite=Lax): un form-post cross-site no puede mandar application/json.
export async function readJsonBody(req: Request, maxBytes = 65_536): Promise<Record<string, unknown>> {
  const type = req.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new HttpError(415, "content_type");
  const buf = await req.arrayBuffer();
  if (buf.byteLength > maxBytes) throw new HttpError(413, "payload_too_large");
  try {
    const parsed = JSON.parse(new TextDecoder().decode(buf)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not an object");
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "bad_json");
  }
}

// Parámetro de ruta dinámica ([id].ts, [action].ts): Vercel lo expone como
// query param; el último segmento del pathname es el fallback.
export function pathParam(req: Request, name: string): string {
  const url = new URL(req.url);
  const fromQuery = url.searchParams.get(name);
  if (fromQuery) return fromQuery;
  const segment = url.pathname.replace(/\/+$/, "").split("/").pop() ?? "";
  return decodeURIComponent(segment);
}

export function requireMethod(req: Request, ...methods: string[]): void {
  if (!methods.includes(req.method)) throw new HttpError(405, "method_not_allowed");
}
