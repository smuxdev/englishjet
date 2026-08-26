import type { Word } from "../types/vocabulary";
import type { ActivityMap } from "../data/activity";

// Abstracción de persistencia del mazo, con dos implementaciones:
//  - local (localDeckStore): comportamiento histórico — CSV estático +
//    localStorage; edición de contenido solo bajo `npm run dev` (write-through
//    al CSV vía el dev server).
//  - remote (remoteDeckStore): mazo por usuario en la API (Turso). CRUD de
//    contenido write-through; progreso/actividad/frase propia optimistas
//    (fire-and-forget) para no bloquear la sesión de estudio en round-trips.
// VocabularyProvider consume la interfaz sin saber el modo.

export interface CardFields {
  en: string;
  es: string;
  example: string;
  pronunciation?: string;
}

export interface DeckData {
  words: Word[];
  activity: ActivityMap;
  mySentences: Record<string, string>;
}

export type CrudResult = { word: Word } | { error: string };

export interface DeckStore {
  readonly mode: "local" | "remote";
  load(): Promise<DeckData>;
  probeCanEdit(): Promise<boolean>;
  // allWords: el modo local reescribe el CSV completo; el remoto lo ignora.
  addWord(fields: CardFields, allWords: Word[]): Promise<CrudResult>;
  editWord(word: Word, fields: CardFields, allWords: Word[]): Promise<CrudResult>;
  deleteWord(id: string, allWords: Word[]): Promise<string | null>;
  persistProgress(word: Word, progress: { box: number; due: string }): void;
  persistAllProgress(words: Word[]): void;
  logActivity(activity: ActivityMap, delta: { reviewed: number; correct: number }): void;
  saveMySentence(id: string, sentence: string): void;
  importSampleDeck(): Promise<string | null>; // null = ok
}

// Aplica una edición conservando la invariante examples[0] === exampleSentence
// (los extras del sidecar/BD se conservan). No toca el id: cada store decide
// (local: id === término; remote: id sintético estable).
export function applyEdit(word: Word, fields: CardFields): Word {
  return {
    ...word,
    englishTerm: fields.en,
    spanishTranslation: fields.es,
    exampleSentence: fields.example,
    pronunciation: fields.pronunciation,
    examples: [fields.example, ...word.examples.filter((e) => e !== word.exampleSentence)].filter(Boolean),
  };
}
