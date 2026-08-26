import type { Word } from "../types/vocabulary";
import { initializeWords, saveProgress, todayStr } from "../data/words";
import { readActivity, writeActivity } from "../data/activity";
import { readMySentences, saveMySentence } from "../data/mySentences";
import { probeCsvEditable, saveCsvToServer } from "./csvStore";
import { applyEdit, type DeckStore } from "./deckStore";

const CSV_WRITE_ERROR = "No se pudo escribir el CSV (¿la app no corre bajo npm run dev?)";

// Modo anónimo: CSV estático + localStorage, idéntico al comportamiento
// histórico de la app (incluida la edición del CSV solo bajo `npm run dev`).
export function createLocalDeckStore(): DeckStore {
  return {
    mode: "local",

    async load() {
      const words = await initializeWords();
      return { words, activity: readActivity(), mySentences: readMySentences() };
    },

    probeCanEdit: probeCsvEditable,

    async addWord(fields, allWords) {
      const word: Word = {
        id: fields.en, // en local el id ES el término (clave del CSV)
        englishTerm: fields.en,
        spanishTranslation: fields.es,
        exampleSentence: fields.example,
        pronunciation: fields.pronunciation,
        dateAdded: new Date().toISOString(),
        learned: false,
        box: 0,
        due: todayStr(),
        examples: fields.example ? [fields.example] : [],
      };
      const ok = await saveCsvToServer([word, ...allWords]);
      return ok ? { word } : { error: CSV_WRITE_ERROR };
    },

    async editWord(word, fields, allWords) {
      // Al cambiar el término el id pasa a ser el nuevo front; el efecto de
      // persistencia re-escribe el progreso bajo la nueva clave.
      const next = { ...applyEdit(word, fields), id: fields.en };
      const ok = await saveCsvToServer(allWords.map((w) => (w.id === word.id ? next : w)));
      return ok ? { word: next } : { error: CSV_WRITE_ERROR };
    },

    async deleteWord(id, allWords) {
      const ok = await saveCsvToServer(allWords.filter((w) => w.id !== id));
      return ok ? null : CSV_WRITE_ERROR;
    },

    persistProgress() {
      // cubierto por persistAllProgress (efecto global del provider)
    },

    persistAllProgress: saveProgress,

    logActivity(activity) {
      writeActivity(activity);
    },

    saveMySentence,

    async importSampleDeck() {
      return "La importación requiere sesión iniciada";
    },
  };
}
