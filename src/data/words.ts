import Papa from "papaparse";
import type { Word as WordType } from "../types/vocabulary";

export interface Word extends WordType {
  id: string;
}

export const WORDS: Word[] = [];

export async function initializeWords(): Promise<Word[]> {
  if (typeof window === "undefined") {
    return WORDS;
  }

  const stored = localStorage.getItem("vocabulary_words");

  if (stored) {
    try {
      const parsed: Word[] = JSON.parse(stored);
      const hasPronInStored = parsed.some((w: any) => w.pronunciation);
      if (hasPronInStored) {
        WORDS.length = 0;
        parsed.forEach((w) => WORDS.push(w as Word));
        return WORDS;
      }
      // Stored sin pronunciación pero CSV ya tiene -> fusionar pronunciación sin perder progreso
      try {
        const response = await fetch("/duo_cards_en_export.csv");
        const text = await response.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        const csvMap = new Map<string, string>();
        (result.data as any[]).forEach((row) => {
          const front = (row.front || "").trim();
          const pron = (row.pronunciation || "").trim();
          if (front && pron) csvMap.set(front, pron);
        });
        const merged: Word[] = parsed.map((w: any, i: number) => ({
          ...w,
          id: w.id || `word-${i}`,
          pronunciation: w.pronunciation || csvMap.get(w.englishTerm) || undefined,
        }));
        localStorage.setItem("vocabulary_words", JSON.stringify(merged));
        WORDS.length = 0;
        merged.forEach((w) => WORDS.push(w as Word));
        return WORDS;
      } catch {
        WORDS.length = 0;
        parsed.forEach((w) => WORDS.push(w as Word));
        return WORDS;
      }
    } catch {}
  }

  try {
    const response = await fetch("/duo_cards_en_export.csv");
    const text = await response.text();
    const result = Papa.parse(text, { header: true, skipEmptyLines: true });

    const words: Word[] = (result.data as any[]).map((row, i) => ({
      id: `word-${i}`,
      englishTerm: (row.front || "").trim(),
      spanishTranslation: (row.back || "").trim(),
      exampleSentence: (row.hint || "No example provided").trim(),
      dateAdded: (row.publishedAt || "").trim(),
      learned: false,
      pronunciation: (row.pronunciation || "").trim() || undefined,
    }));

    WORDS.length = 0;
    words.forEach((w) => WORDS.push(w));
    return WORDS;
  } catch (error) {
    console.error("Error loading words from CSV:", error);
    return WORDS;
  }
}
