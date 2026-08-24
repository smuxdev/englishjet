import Papa from "papaparse";
import type { Word } from "../types/vocabulary";

const CSV_URL = "/duo_cards_en_export.csv";
const LEARNED_KEY = "vocabulary_learned";
const LEGACY_WORDS_KEY = "vocabulary_words";

interface CsvRow {
  front?: string;
  back?: string;
  hint?: string;
  publishedAt?: string;
  pronunciation?: string;
}

// Solo se persiste el progreso (términos aprendidos), nunca la lista completa:
// así los cambios del CSV (palabras nuevas, traducciones corregidas) llegan a
// usuarios existentes sin invalidar su progreso.
function readLearnedTerms(): Set<string> {
  try {
    const legacy = localStorage.getItem(LEGACY_WORDS_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { englishTerm?: string; learned?: boolean }[];
      const terms = parsed
        .filter((w) => w.learned && typeof w.englishTerm === "string")
        .map((w) => w.englishTerm as string);
      localStorage.setItem(LEARNED_KEY, JSON.stringify(terms));
      localStorage.removeItem(LEGACY_WORDS_KEY);
      return new Set(terms);
    }
    const stored = localStorage.getItem(LEARNED_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as unknown;
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter((t): t is string => typeof t === "string"));
      }
    }
  } catch (error) {
    console.error("Error reading learned terms from localStorage:", error);
  }
  return new Set();
}

export function saveLearnedTerms(words: Word[]): void {
  try {
    const terms = words.filter((w) => w.learned).map((w) => w.englishTerm);
    localStorage.setItem(LEARNED_KEY, JSON.stringify(terms));
  } catch (error) {
    console.error("Error saving learned terms to localStorage:", error);
  }
}

export async function initializeWords(): Promise<Word[]> {
  const response = await fetch(CSV_URL);
  if (!response.ok) {
    throw new Error(`Could not fetch ${CSV_URL} (${response.status})`);
  }
  const text = await response.text();
  const result = Papa.parse<CsvRow>(text, { header: true, skipEmptyLines: true });
  const learned = readLearnedTerms();

  return result.data
    .map((row) => ({
      englishTerm: (row.front ?? "").trim(),
      spanishTranslation: (row.back ?? "").trim(),
      exampleSentence: (row.hint ?? "").trim() || "No example provided",
      dateAdded: (row.publishedAt ?? "").trim(),
      pronunciation: (row.pronunciation ?? "").trim() || undefined,
    }))
    .filter((w) => w.englishTerm)
    .map((w) => ({ ...w, id: w.englishTerm, learned: learned.has(w.englishTerm) }));
}
