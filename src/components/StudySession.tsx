import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Word } from "../types/vocabulary";
import {
  useVocabularyStorage,
  type StudyDirection,
  type StudyMode,
} from "../hooks/vocabularyContext";
import { checkAnswer, type Verdict } from "../services/answer";
import { speakPiper, speakNative, isPiperVoice } from "../services/piper";
import { StudyCard } from "./StudyCard";

interface SessionCard {
  word: Word;
  failedOnce: boolean;
}

interface SessionState {
  queue: SessionCard[]; // queue[0] = tarjeta actual; falladas se reencolan al final
  direction: StudyDirection; // fijada al iniciar la sesión
  mode: StudyMode; // fijado al iniciar, como la dirección
  revealed: boolean;
  typed: { input: string; verdict: Verdict } | null; // solo en modo escritura
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

function buildSession(
  words: Word[],
  direction: StudyDirection,
  mode: StudyMode,
  size: number
): SessionState {
  // Prioridad a las revisiones vencidas (caja > 0) sobre las nuevas, para que
  // el backlog de repaso no se ahogue entre palabras nuevas; el orden final
  // se baraja para mezclarlas dentro de la sesión.
  const reviews = shuffle(words.filter((w) => w.box > 0));
  const fresh = shuffle(words.filter((w) => w.box === 0));
  const deck = shuffle([...reviews, ...fresh].slice(0, size));
  return {
    queue: deck.map((word) => ({ word, failedOnce: false })),
    direction,
    mode,
    revealed: false,
    typed: null,
    total: deck.length,
    firstTry: 0,
    failedWords: [],
  };
}

export const StudySession = ({ onExit }: { onExit: () => void }) => {
  const {
    dueWords,
    reviewWord,
    studyDirection,
    studyMode,
    sessionSize,
    autoplay,
    setAutoplay,
    selectedVoice,
    voices,
  } = useVocabularyStorage();
  const [session, setSession] = useState<SessionState>(() =>
    buildSession(dueWords, studyDirection, studyMode, sessionSize)
  );
  const [draft, setDraft] = useState("");

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
    setDraft("");
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
          typed: null,
          firstTry: head.failedOnce ? s.firstTry : s.firstTry + 1,
        };
      }
      const alreadyFailed = s.failedWords.some((w) => w.id === head.word.id);
      return {
        ...s,
        queue: [...rest, { ...head, failedOnce: true }],
        revealed: false,
        typed: null,
        failedWords: alreadyFailed ? s.failedWords : [...s.failedWords, head.word],
      };
    });
  };

  // En escritura la respuesta la corrige checkAnswer; el input hace de submit
  // (antes de revelar) y de «Continuar» (después, Enter con el foco dentro).
  const handleTypedSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!current) return;
    if (session.revealed) {
      if (session.typed) answer(session.typed.verdict !== "fail");
      return;
    }
    if (!draft.trim()) return;
    const target =
      session.direction === "en->es" ? current.word.spanishTranslation : current.word.englishTerm;
    const verdict = checkAnswer(draft, target);
    canAnswer.current = true;
    setSession((s) => ({ ...s, revealed: true, typed: { input: draft, verdict } }));
  };

  // Autoplay: EN→ES pronuncia el término al aparecer la tarjeta; ES→EN al
  // revelarse (es cuando el inglés se hace visible). spokenRef evita repetir
  // la misma clave en re-renders y en el doble-efecto de StrictMode.
  const spokenRef = useRef<string | null>(null);
  const cardId = current?.word.id ?? null;
  useEffect(() => {
    if (!autoplay || !cardId || !current) return;
    const wantsBack = session.direction === "es->en";
    if (wantsBack && !session.revealed) return;
    const key = `${cardId}:${wantsBack ? "back" : "front"}`;
    if (spokenRef.current === key) return;
    spokenRef.current = key;
    if (isPiperVoice(selectedVoice)) {
      void speakPiper(current.word.englishTerm);
    } else {
      speakNative(current.word.englishTerm, selectedVoice, voices);
    }
  }, [autoplay, cardId, session.revealed, session.direction, current, selectedVoice, voices]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
      if (session.mode === "cards") {
        if (e.key === " ") {
          e.preventDefault(); // evita scroll y activación del botón enfocado
          reveal();
        } else if (e.key === "1") {
          answer(false);
        } else if (e.key === "2") {
          answer(true);
        }
      } else if (e.key === "Enter" && session.revealed && session.typed) {
        // Continuar con el foco fuera del input (p.ej. tras clic en Comprobar)
        answer(session.typed.verdict !== "fail");
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
                onClick={() => setSession((s) => buildSession(s.failedWords, s.direction, s.mode, sessionSize))}
                className="rounded-lg bg-[#751200] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#8f1a05]"
              >
                Repetir falladas ({session.failedWords.length})
              </button>
            )}
            {dueWords.length > 0 && (
              <button
                onClick={() => setSession(buildSession(dueWords, studyDirection, studyMode, sessionSize))}
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
            Sesión de estudio <span className="text-slate-400 font-normal">· {session.direction === "en->es" ? "EN → ES" : "ES → EN"}{session.mode === "typing" ? " · Escribir" : ""}</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAutoplay(!autoplay)}
              aria-pressed={autoplay}
              aria-label="Pronunciación automática"
              title={autoplay ? "Pronunciación automática: activada" : "Pronunciación automática: desactivada"}
              className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                autoplay ? "bg-[#751200] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              🔊 auto
            </button>
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
        showRevealButton={session.mode === "cards"}
      />

      {session.mode === "typing" ? (
        <form onSubmit={handleTypedSubmit} className="space-y-3">
          {!session.revealed ? (
            <div className="flex gap-2">
              <input
                key={current.word.id}
                autoFocus
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={session.direction === "en->es" ? "Escribe la traducción en español..." : "Escribe la palabra en inglés..."}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#751200] focus:ring-1 focus:ring-[#751200] outline-none"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="rounded-xl bg-[#751200] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#8f1a05] disabled:opacity-40"
              >
                Comprobar <span className="font-normal opacity-70 hidden sm:inline">· ⏎</span>
              </button>
            </div>
          ) : (
            session.typed && (
              <div className="space-y-3">
                {session.typed.verdict === "ok" ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                    ✓ Correcto
                  </div>
                ) : session.typed.verdict === "almost" ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <span className="font-semibold">≈ Casi</span> — escribiste «{session.typed.input}»; la forma correcta es{" "}
                    <span className="font-semibold">
                      {session.direction === "en->es" ? current.word.spanishTranslation : current.word.englishTerm}
                    </span>
                  </div>
                ) : (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    <span className="font-semibold">✗ Incorrecto</span> — escribiste{" "}
                    <span className="line-through">{session.typed.input}</span>; la respuesta era{" "}
                    <span className="font-semibold">
                      {session.direction === "en->es" ? current.word.spanishTranslation : current.word.englishTerm}
                    </span>
                  </div>
                )}
                <button
                  type="submit"
                  autoFocus
                  className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
                >
                  Continuar <span className="font-normal opacity-70 hidden sm:inline">· ⏎</span>
                </button>
              </div>
            )
          )}
        </form>
      ) : (
        session.revealed && (
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
        )
      )}
    </section>
  );
};
