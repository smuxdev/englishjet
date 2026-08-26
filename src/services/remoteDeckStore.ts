import type { Word } from "../types/vocabulary";
import type { ActivityMap } from "../data/activity";
import { MAX_BOX, initializeWords, todayStr } from "../data/words";
import { readMySentences } from "../data/mySentences";
import { ApiError, apiFetch, type CardDTO } from "./api";
import { applyEdit, type DeckStore } from "./deckStore";

function cardToWord(card: CardDTO): Word {
  return {
    id: card.id,
    englishTerm: card.englishTerm,
    spanishTranslation: card.spanishTranslation,
    exampleSentence: card.exampleSentence,
    dateAdded: card.dateAdded,
    pronunciation: card.pronunciation ?? undefined,
    box: card.box,
    due: card.due,
    learned: card.box >= MAX_BOX,
    examples: card.examples.length > 0 || !card.exampleSentence ? card.examples : [card.exampleSentence],
  };
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return "Ya existe otra palabra con ese término en inglés";
    if (error.status === 401) return "La sesión ha caducado — recarga la página e inicia sesión";
  }
  return "No se pudo guardar en el servidor — comprueba tu conexión";
}

function warn(what: string) {
  return (error: unknown) => console.warn(`No se pudo sincronizar ${what}:`, error);
}

// Modo con sesión: mazo por usuario en la API (Turso vía Vercel Functions).
export function createRemoteDeckStore(): DeckStore {
  return {
    mode: "remote",

    async load() {
      const [cardsRes, activityRes] = await Promise.all([
        apiFetch<{ cards: CardDTO[] }>("/api/cards"),
        apiFetch<{ activity: ActivityMap }>("/api/activity"),
      ]);
      const mySentences: Record<string, string> = {};
      for (const card of cardsRes.cards) {
        if (card.mySentence) mySentences[card.id] = card.mySentence;
      }
      return { words: cardsRes.cards.map(cardToWord), activity: activityRes.activity, mySentences };
    },

    async probeCanEdit() {
      return true;
    },

    async addWord(fields) {
      try {
        const { card } = await apiFetch<{ card: CardDTO }>("/api/cards", {
          method: "POST",
          body: {
            englishTerm: fields.en,
            spanishTranslation: fields.es,
            exampleSentence: fields.example,
            pronunciation: fields.pronunciation ?? null,
            due: todayStr(),
          },
        });
        return { word: cardToWord(card) };
      } catch (error) {
        return { error: errorMessage(error) };
      }
    },

    async editWord(word, fields) {
      const next = applyEdit(word, fields);
      try {
        const { card } = await apiFetch<{ card: CardDTO }>(`/api/cards/${word.id}`, {
          method: "PATCH",
          body: {
            englishTerm: next.englishTerm,
            spanishTranslation: next.spanishTranslation,
            exampleSentence: next.exampleSentence,
            pronunciation: next.pronunciation ?? null,
            examples: next.examples,
          },
        });
        return { word: cardToWord(card) };
      } catch (error) {
        return { error: errorMessage(error) };
      }
    },

    async deleteWord(id) {
      try {
        await apiFetch(`/api/cards/${id}`, { method: "DELETE" });
        return null;
      } catch (error) {
        return errorMessage(error);
      }
    },

    // Progreso y actividad optimistas (fire-and-forget): bloquear cada
    // respuesta de la sesión en un round-trip a la BD degradaría la UX.
    persistProgress(word, progress) {
      void apiFetch(`/api/cards/${word.id}`, { method: "PATCH", body: progress }).catch(warn("el progreso"));
    },

    persistAllProgress() {
      // el progreso se sincroniza tarjeta a tarjeta en persistProgress
    },

    logActivity(_activity, delta) {
      void apiFetch("/api/activity", {
        method: "POST",
        body: { date: todayStr(), reviewedDelta: delta.reviewed, correctDelta: delta.correct },
      }).catch(warn("la actividad"));
    },

    saveMySentence(id, sentence) {
      void apiFetch(`/api/cards/${id}`, { method: "PATCH", body: { mySentence: sentence } }).catch(warn("la frase"));
    },

    // Importa el mazo de ejemplo (CSV público) — initializeWords ya fusiona el
    // progreso anónimo de localStorage, así que la migración viene gratis.
    async importSampleDeck() {
      try {
        const words = await initializeWords();
        const mine = readMySentences();
        await apiFetch("/api/cards/import", {
          method: "POST",
          body: {
            cards: words.map((w) => ({
              englishTerm: w.englishTerm,
              spanishTranslation: w.spanishTranslation,
              exampleSentence: w.exampleSentence,
              pronunciation: w.pronunciation ?? null,
              examples: w.examples,
              box: w.box,
              due: w.due,
              dateAdded: w.dateAdded || undefined,
              mySentence: mine[w.id] ?? null,
            })),
          },
        });
        return null;
      } catch (error) {
        console.warn("Import failed:", error);
        return "No se pudo importar el mazo de ejemplo — comprueba tu conexión";
      }
    },
  };
}
