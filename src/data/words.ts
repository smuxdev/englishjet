import Papa from "papaparse";
import type { Word } from "../types/vocabulary";

const CSV_URL = "/duo_cards_en_export.csv";
const PROGRESS_KEY = "vocabulary_progress";
const LEGACY_LEARNED_KEY = "vocabulary_learned";
const LEGACY_WORDS_KEY = "vocabulary_words";

export const MAX_BOX = 5;
// Días hasta la próxima revisión al ENTRAR en cada caja (índice = caja).
const INTERVAL_DAYS = [0, 1, 3, 7, 14, 21];

export interface WordProgress {
  box: number;
  due: string; // YYYY-MM-DD
}

type ProgressMap = Record<string, WordProgress>;

interface CsvRow {
  front?: string;
  back?: string;
  hint?: string;
  publishedAt?: string;
  pronunciation?: string;
}

export function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

/* ===== Transiciones Leitner ===== */

export function promote(box: number): WordProgress {
  const next = Math.min(box + 1, MAX_BOX);
  return { box: next, due: todayStr(INTERVAL_DAYS[next]) };
}

// Fallo: vuelta a la caja 1, revisable hoy mismo.
export function demote(): WordProgress {
  return { box: 1, due: todayStr(0) };
}

export function masteredProgress(): WordProgress {
  return { box: MAX_BOX, due: todayStr(INTERVAL_DAYS[MAX_BOX]) };
}

export function resetProgress(): WordProgress {
  return { box: 0, due: todayStr(0) };
}

/* ===== Persistencia ===== */

function isValidProgress(p: unknown): p is WordProgress {
  return (
    typeof p === "object" && p !== null &&
    typeof (p as WordProgress).box === "number" &&
    typeof (p as WordProgress).due === "string"
  );
}

// Solo se persiste el progreso Leitner (caja + próxima revisión), nunca la
// lista de palabras: el CSV es siempre la fuente de verdad. Migra los dos
// formatos anteriores (v2: array de términos aprendidos; v1: lista completa).
function readProgress(): ProgressMap {
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const map: ProgressMap = {};
        for (const [term, p] of Object.entries(parsed)) {
          if (isValidProgress(p)) map[term] = { box: p.box, due: p.due };
        }
        return map;
      }
    }

    const migrateLearnedTerms = (terms: string[]): ProgressMap => {
      const map: ProgressMap = {};
      for (const term of terms) map[term] = masteredProgress();
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
      localStorage.removeItem(LEGACY_LEARNED_KEY);
      localStorage.removeItem(LEGACY_WORDS_KEY);
      return map;
    };

    // v2: array de términos aprendidos → caja 5
    const learned = localStorage.getItem(LEGACY_LEARNED_KEY);
    if (learned) {
      const parsed = JSON.parse(learned) as unknown;
      if (Array.isArray(parsed)) {
        return migrateLearnedTerms(parsed.filter((t): t is string => typeof t === "string"));
      }
    }

    // v1: lista completa de palabras con flag learned
    const legacy = localStorage.getItem(LEGACY_WORDS_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { englishTerm?: string; learned?: boolean }[];
      return migrateLearnedTerms(
        parsed
          .filter((w) => w.learned && typeof w.englishTerm === "string")
          .map((w) => w.englishTerm as string)
      );
    }
  } catch (error) {
    console.error("Error reading progress from localStorage:", error);
  }
  return {};
}

export function saveProgress(words: Word[]): void {
  try {
    const map: ProgressMap = {};
    for (const w of words) {
      // Clave = id (el front del CSV; tras editar un término, editWord actualiza
      // el id al nuevo front y el mapa se re-escribe entero → migración implícita).
      if (w.box > 0) map[w.id] = { box: w.box, due: w.due };
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch (error) {
    console.error("Error saving progress to localStorage:", error);
  }
}

/* ===== Carga ===== */

const EXTRA_EXAMPLES_URL = "/extra_examples.csv";

// Sidecar opcional generado con `npm run fetch:examples` (Tatoeba, CC-BY):
// term,example — varias filas por término. Si no existe, la app funciona igual.
async function fetchExtraExamples(): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  try {
    const response = await fetch(EXTRA_EXAMPLES_URL);
    if (!response.ok) return map;
    const text = await response.text();
    const result = Papa.parse<{ term?: string; example?: string }>(text, {
      header: true,
      skipEmptyLines: true,
    });
    for (const row of result.data) {
      const term = (row.term ?? "").trim();
      const example = (row.example ?? "").trim();
      if (!term || !example) continue;
      const list = map.get(term) ?? [];
      list.push(example);
      map.set(term, list);
    }
  } catch {
    // sin extras: cada palabra queda solo con su hint
  }
  return map;
}

export async function initializeWords(): Promise<Word[]> {
  const [response, extras] = await Promise.all([fetch(CSV_URL), fetchExtraExamples()]);
  if (!response.ok) {
    throw new Error(`Could not fetch ${CSV_URL} (${response.status})`);
  }
  const text = await response.text();
  const result = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
  const progress = readProgress();
  const today = todayStr();

  return result.data
    .map((row) => ({
      englishTerm: (row.front ?? "").trim(),
      spanishTranslation: (row.back ?? "").trim(),
      // Sin fallback aquí: el CSV se regenera desde estos datos al editar, y un
      // placeholder acabaría escrito en disco. El fallback es de presentación.
      exampleSentence: (row.hint ?? "").trim(),
      dateAdded: (row.publishedAt ?? "").trim(),
      pronunciation: (row.pronunciation ?? "").trim() || undefined,
    }))
    .filter((w) => w.englishTerm)
    .map((w) => {
      const p = progress[w.englishTerm] ?? { box: 0, due: today };
      const seen = new Set<string>();
      const examples = [w.exampleSentence, ...(extras.get(w.englishTerm) ?? [])].filter((e) => {
        const key = e.trim().toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { ...w, id: w.englishTerm, box: p.box, due: p.due, learned: p.box >= MAX_BOX, examples };
    });
}
