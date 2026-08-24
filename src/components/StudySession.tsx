import { useEffect, useRef, useState } from "react";
import type { Word } from "../types/vocabulary";
import { useVocabularyStorage, type StudyDirection } from "../hooks/vocabularyContext";
import { StudyCard } from "./StudyCard";

interface SessionCard {
  word: Word;
  failedOnce: boolean;
}

interface SessionState {
  queue: SessionCard[]; // queue[0] = tarjeta actual; falladas se reencolan al final
  direction: StudyDirection; // fijada al iniciar la sesión
  revealed: boolean;
  total: number;
  firstTry: number;
  failedWords: Word[];
}

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildSession(words: Word[], direction: StudyDirection, size: number): SessionState {
  // Prioridad a las revisiones vencidas (caja > 0) sobre las nuevas, para que
  // el backlog de repaso no se ahogue entre palabras nuevas; el orden final
  // se baraja para mezclarlas dentro de la sesión.
  const reviews = shuffle(words.filter((w) => w.box > 0));
  const fresh = shuffle(words.filter((w) => w.box === 0));
  const deck = shuffle([...reviews, ...fresh].slice(0, size));
  return {
    queue: deck.map((word) => ({ word, failedOnce: false })),
    direction,
    revealed: false,
    total: deck.length,
    firstTry: 0,
    failedWords: [],
  };
}

export const StudySession = ({ onExit }: { onExit: () => void }) => {
  const { dueWords, reviewWord, studyDirection, sessionSize } = useVocabularyStorage();
  const [session, setSession] = useState<SessionState>(() =>
    buildSession(dueWords, studyDirection, sessionSize)
  );

  const current = session.queue[0];
  const remainingUnique = new Set(session.queue.map((c) => c.word.id)).size;
  const done = session.total - remainingUnique;

  // Guarda contra doble respuesta: el listener de teclado puede ejecutarse con
  // un closure obsoleto entre el re-render y el re-registro del efecto, y un
  // segundo toggleLearned des-aprendería la palabra. Cada reveal habilita
  // exactamente una respuesta.
  const canAnswer = useRef(false);

  const reveal = () => {
    canAnswer.current = true;
    setSession((s) => (s.revealed ? s : { ...s, revealed: true }));
  };

  const answer = (knew: boolean) => {
    const card = session.queue[0];
    if (!card || !session.revealed || !canAnswer.current) return;
    canAnswer.current = false;
    // Transición Leitner una sola vez por palabra y sesión: acierto a la
    // primera sube de caja; el primer fallo baja a caja 1. Las reencoladas
    // que luego aciertan ya transicionaron con su fallo.
    if (!card.failedOnce) reviewWord(card.word.id, knew);
    setSession((s) => {
      const [head, ...rest] = s.queue;
      if (!head) return s;
      if (knew) {
        return {
          ...s,
          queue: rest,
          revealed: false,
          firstTry: head.failedOnce ? s.firstTry : s.firstTry + 1,
        };
      }
      const alreadyFailed = s.failedWords.some((w) => w.id === head.word.id);
      return {
        ...s,
        queue: [...rest, { ...head, failedOnce: true }],
        revealed: false,
        failedWords: alreadyFailed ? s.failedWords : [...s.failedWords, head.word],
      };
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (e.key === " ") {
        e.preventDefault(); // evita scroll y activación del botón enfocado
        reveal();
      } else if (e.key === "1") {
        answer(false);
      } else if (e.key === "2") {
        answer(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ===== Resumen final ===== */
  if (!current) {
    return (
      <section className="max-w-xl mx-auto space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-1">¡Sesión completada!</h2>
          <p className="text-sm text-slate-500 mb-6">
            {session.total} {session.total === 1 ? "palabra" : "palabras"} · {session.firstTry} a la primera · {session.failedWords.length} {session.failedWords.length === 1 ? "fallada" : "falladas"}
          </p>

          {session.failedWords.length > 0 && (
            <div className="mb-6 text-left bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-200">
              {session.failedWords.map((w) => (
                <div key={w.id} className="px-4 py-2 flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-700">{w.englishTerm}</span>
                  <span className="text-sm text-slate-500 text-right">{w.spanishTranslation}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-2">
            {session.failedWords.length > 0 && (
              <button
                onClick={() => setSession((s) => buildSession(s.failedWords, s.direction, sessionSize))}
                className="rounded-lg bg-[#751200] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#8f1a05]"
              >
                Repetir falladas ({session.failedWords.length})
              </button>
            )}
            {dueWords.length > 0 && (
              <button
                onClick={() => setSession(buildSession(dueWords, studyDirection, sessionSize))}
                className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
              >
                Otra ronda ({Math.min(dueWords.length, sessionSize)})
              </button>
            )}
            <button
              onClick={onExit}
              className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              Terminar
            </button>
          </div>
        </div>
      </section>
    );
  }

  /* ===== Tarjeta en curso ===== */
  return (
    <section className="max-w-xl mx-auto space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-4 sm:px-5 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-700">
            Sesión de estudio <span className="text-slate-400 font-normal">· {session.direction === "en->es" ? "EN → ES" : "ES → EN"}</span>
          </span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              <span className="font-semibold text-slate-700">{done}</span>/{session.total}
            </span>
            <button
              onClick={onExit}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
            >
              Salir
            </button>
          </div>
        </div>
        <div className="w-full rounded-full h-1.5 bg-slate-200">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out bg-[#751200]"
            style={{ width: `${session.total > 0 ? (done / session.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <StudyCard
        key={current.word.id}
        word={current.word}
        direction={session.direction}
        revealed={session.revealed}
        onReveal={reveal}
      />

      {session.revealed && (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => answer(false)}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100"
          >
            ✗ Aún no <span className="font-normal text-amber-600 hidden sm:inline">· 1</span>
          </button>
          <button
            onClick={() => answer(true)}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
          >
            ✓ La sabía <span className="font-normal text-emerald-600 hidden sm:inline">· 2</span>
          </button>
        </div>
      )}
    </section>
  );
};
