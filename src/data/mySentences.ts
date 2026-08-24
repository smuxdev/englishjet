import { findOccurrence } from "../services/cloze";

// Frase propia del aprendiz por término (efecto de generación: lo autogenerado
// se retiene mejor). Dato personal como el progreso → localStorage, funciona
// también en build estático. Una frase por término.
const KEY = "vocabulary_my_sentences";

export type MySentences = Record<string, string>;

export function readMySentences(): MySentences {
  try {
    const stored = localStorage.getItem(KEY);
    if (!stored) return {};
    const parsed = JSON.parse(stored) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const map: MySentences = {};
    for (const [term, sentence] of Object.entries(parsed)) {
      if (typeof sentence === "string" && sentence.trim()) map[term] = sentence;
    }
    return map;
  } catch (error) {
    console.error("Error reading my sentences from localStorage:", error);
    return {};
  }
}

export function saveMySentence(term: string, sentence: string): void {
  try {
    const map = readMySentences();
    map[term] = sentence.trim();
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch (error) {
    console.error("Error saving my sentence to localStorage:", error);
  }
}

// null = válida; string = motivo del rechazo
export function validateMySentence(term: string, sentence: string): string | null {
  const trimmed = sentence.trim();
  if (trimmed.length < 10) return "Escribe una frase completa (mínimo 10 caracteres)";
  if (!findOccurrence(trimmed, term)) return `La frase debe contener «${term}»`;
  return null;
}
