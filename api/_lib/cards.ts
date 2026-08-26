import type { Row } from "@libsql/client";
import { HttpError } from "./http.js";

// Límites de tamaño de los campos de tarjeta (validación de payloads).
export const LIMITS = {
  term: 200,
  translation: 500,
  example: 1000,
  pronunciation: 100,
  mySentence: 500,
  examplesItems: 30,
} as const;

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

export const CARD_COLUMNS =
  "id, english_term, spanish_translation, example_sentence, pronunciation, examples, my_sentence, box, due, date_added";

export function rowToCard(row: Row): CardDTO {
  let examples: string[] = [];
  try {
    const parsed = JSON.parse(String(row.examples ?? "[]")) as unknown;
    if (Array.isArray(parsed)) examples = parsed.filter((e): e is string => typeof e === "string");
  } catch {
    // columna corrupta: la tarjeta queda solo con su exampleSentence
  }
  return {
    id: String(row.id),
    englishTerm: String(row.english_term),
    spanishTranslation: String(row.spanish_translation),
    exampleSentence: String(row.example_sentence ?? ""),
    pronunciation: row.pronunciation == null ? null : String(row.pronunciation),
    examples,
    mySentence: row.my_sentence == null ? null : String(row.my_sentence),
    box: Number(row.box),
    due: String(row.due),
    dateAdded: String(row.date_added),
  };
}

/* ===== Validadores de campos ===== */

export function reqString(v: unknown, field: string, max: number): string {
  if (typeof v !== "string") throw new HttpError(400, `bad_${field}`);
  const t = v.trim();
  if (!t || t.length > max) throw new HttpError(400, `bad_${field}`);
  return t;
}

// '' y null → null (campo vacío/borrado); string válida → recortada.
export function optString(v: unknown, field: string, max: number): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string" || v.length > max) throw new HttpError(400, `bad_${field}`);
  return v.trim() || null;
}

export function parseExamples(v: unknown): string[] {
  if (!Array.isArray(v) || v.length > LIMITS.examplesItems) throw new HttpError(400, "bad_examples");
  return v
    .map((e) => {
      if (typeof e !== "string" || e.length > LIMITS.example) throw new HttpError(400, "bad_examples");
      return e.trim();
    })
    .filter(Boolean);
}

export function parseDue(v: unknown): string {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new HttpError(400, "bad_due");
  return v;
}

export function parseBox(v: unknown): number {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 5) throw new HttpError(400, "bad_box");
  return v;
}

export function isUniqueViolation(error: unknown): boolean {
  return String(error).includes("UNIQUE");
}
