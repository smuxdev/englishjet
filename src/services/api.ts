// Cliente HTTP de la API propia (Vercel Functions en api/). La sesión viaja
// en cookie httpOnly; el Content-Type JSON es además el cinturón anti-CSRF
// que exige el servidor en mutaciones.

export interface ApiUser {
  id: string;
  email: string;
}

export interface CardDTO {
  id: string;
  englishTerm: string;
  spanishTranslation: string;
  exampleSentence: string;
  pronunciation: string | null;
  examples: string[];
  mySentence: string | null;
  box: number;
  due: string;
  dateAdded: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(`${status} ${code}`);
    this.status = status;
    this.code = code;
  }
}

export async function apiFetch<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    headers: options.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok) throw new ApiError(res.status, typeof data?.error === "string" ? data.error : "unknown");
  if (data === null) throw new ApiError(res.status, "bad_response");
  return data as T;
}
