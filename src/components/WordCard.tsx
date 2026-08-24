import { useState } from "react";
import type { Word } from "../types/vocabulary";
import { useVocabularyStorage } from "../hooks/vocabularyContext";
import { speakPiper, speakNative, isPiperVoice } from "../services/piper";
import { MAX_BOX } from "../data/words";

const BoxDots = ({ box }: { box: number }) => (
  <span
    className="inline-flex items-center gap-1"
    title={box === 0 ? "Sin empezar" : `Caja ${box}/${MAX_BOX} (Leitner)`}
    aria-label={box === 0 ? "Sin empezar" : `Caja ${box} de ${MAX_BOX}`}
  >
    {Array.from({ length: MAX_BOX }, (_, i) => (
      <span
        key={i}
        className={`w-1.5 h-1.5 rounded-full ${i < box ? "bg-[#751200]" : "bg-slate-200"}`}
      />
    ))}
  </span>
);

// El reveal se resetea al cambiar de palabra o dirección vía la key del
// componente en MainLayout (`${word.id}-${studyDirection}`), no con efectos.
export const WordCard = ({ word }: { word: Word }) => {
  const { toggleLearned, selectedVoice, voices, studyDirection } = useVocabularyStorage();
  const isLearned = word.learned;
  const ready = voices.length > 0 || isPiperVoice(selectedVoice);
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const handleSpeak = async (text: string) => {
    if (isPiperVoice(selectedVoice)) {
      setLoading(true);
      try { await speakPiper(text); } finally { setLoading(false); }
    } else {
      speakNative(text, selectedVoice, voices);
    }
  };

  const isEnToEs = studyDirection === "en->es";

  const SpeakerIcon = loading ? (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
  ) : (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
  );

  return (
    <div className={`group rounded-xl shadow-sm border transition-all duration-200 hover:shadow-md ${
      isLearned ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"
    }`}>
      <div className="p-5 flex flex-col h-full">
        {/* ===== FRENTE: siempre visible (depende de la dirección) ===== */}
        {isEnToEs ? (
          <>
            <div className="flex items-start gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 leading-tight truncate">
                  {word.englishTerm}
                </h3>
                {word.pronunciation && (
                  <p className="text-xs font-mono text-slate-500 mt-0.5 truncate">
                    {word.pronunciation} <span className="font-sans text-[10px] tracking-widest uppercase text-slate-400 ml-1">AmE</span>
                  </p>
                )}
                <div className="mt-1.5">
                  <BoxDots box={word.box} />
                </div>
              </div>
              <button
                onClick={() => handleSpeak(word.englishTerm)}
                disabled={!ready || loading}
                className="shrink-0 p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-[#751200] hover:text-white transition-all duration-200 disabled:opacity-30"
                aria-label="Escuchar palabra"
              >
                {SpeakerIcon}
              </button>
              <button
                onClick={() => toggleLearned(word.id)}
                className={`shrink-0 p-1.5 rounded-lg transition-all duration-200 ${isLearned ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-[#751200]"}`}
                aria-label={isLearned ? "Marcar como pendiente" : "Marcar como aprendida"}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {isLearned ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />}
                </svg>
              </button>
            </div>

            <div className="flex items-start gap-2 mb-4">
              <p className="text-sm text-slate-500 leading-relaxed line-clamp-3 flex-1">{word.exampleSentence}</p>
              <button
                onClick={() => handleSpeak(word.exampleSentence)}
                disabled={!ready || loading}
                className="shrink-0 p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-[#751200] hover:text-white transition-all duration-200 disabled:opacity-30"
                aria-label="Escuchar ejemplo"
              >
                {SpeakerIcon}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  {word.spanishTranslation}
                </h3>
                <div className="mt-1.5">
                  <BoxDots box={word.box} />
                </div>
              </div>
              <button
                onClick={() => toggleLearned(word.id)}
                className={`shrink-0 p-1.5 rounded-lg transition-all duration-200 ${isLearned ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-[#751200]"}`}
                aria-label={isLearned ? "Marcar como pendiente" : "Marcar como aprendida"}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {isLearned ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />}
                </svg>
              </button>
            </div>
          </>
        )}

        {/* ===== REVERSO: oculto hasta clicar ===== */}
        <div className="mt-auto pt-3 border-t border-slate-100">
          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-400 transition-colors"
              aria-label={isEnToEs ? "Mostrar traducción al español" : "Mostrar traducción al inglés"}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {isEnToEs ? "Mostrar español" : "Mostrar inglés"}
            </button>
          ) : (
            <div className="space-y-2">
              {isEnToEs ? (
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-700 flex-1">{word.spanishTranslation}</p>
                  <button
                    onClick={() => setRevealed(false)}
                    className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    aria-label="Ocultar traducción"
                    title="Ocultar"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{word.englishTerm}</p>
                      {word.pronunciation && (
                        <p className="text-xs font-mono text-slate-500">{word.pronunciation} <span className="font-sans text-[10px] tracking-widest uppercase text-slate-400 ml-1">AmE</span></p>
                      )}
                    </div>
                    <button
                      onClick={() => handleSpeak(word.englishTerm)}
                      disabled={!ready || loading}
                      className="shrink-0 p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-[#751200] hover:text-white transition-all duration-200 disabled:opacity-30"
                      aria-label="Escuchar palabra"
                    >
                      {SpeakerIcon}
                    </button>
                    <button
                      onClick={() => setRevealed(false)}
                      className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      aria-label="Ocultar traducción"
                      title="Ocultar"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-start gap-2">
                    <p className="text-sm text-slate-500 leading-relaxed flex-1">{word.exampleSentence}</p>
                    <button
                      onClick={() => handleSpeak(word.exampleSentence)}
                      disabled={!ready || loading}
                      className="shrink-0 p-1.5 rounded-lg bg-slate-100 text-slate-400 hover:bg-[#751200] hover:text-white transition-all duration-200 disabled:opacity-30"
                      aria-label="Escuchar ejemplo"
                    >
                      {SpeakerIcon}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
