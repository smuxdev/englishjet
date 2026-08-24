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
      if (w.box > 0) map[w.englishTerm] = { box: w.box, due: w.due };
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch (error) {
    console.error("Error saving progress to localStorage:", error);
  }
}

/* ===== Carga ===== */

export async function initializeWords(): Promise<Word[]> {
  const response = await fetch(CSV_URL);
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
      exampleSentence: (row.hint ?? "").trim() || "No example provided",
      dateAdded: (row.publishedAt ?? "").trim(),
      pronunciation: (row.pronunciation ?? "").trim() || undefined,
    }))
    .filter((w) => w.englishTerm)
    .map((w) => {
      const p = progress[w.englishTerm] ?? { box: 0, due: today };
      return { ...w, id: w.englishTerm, box: p.box, due: p.due, learned: p.box >= MAX_BOX };
    });
}
