import { useState } from "react";
import type { Word } from "../types/vocabulary";
import type { StudyDirection } from "../hooks/vocabularyContext";
import { useVocabularyStorage } from "../hooks/vocabularyContext";
import { speakPiper, speakNative, isPiperVoice } from "../services/piper";

interface StudyCardProps {
  word: Word;
  direction: StudyDirection;
  revealed: boolean;
  onReveal: () => void;
  // En modo escritura el reveal lo dispara el submit del input, no un botón
  showRevealButton?: boolean;
}

const Pronunciation = ({ ipa }: { ipa: string }) => (
  <p className="text-sm font-mono text-slate-500 mt-1">
    {ipa} <span className="font-sans text-[10px] tracking-widest uppercase text-slate-400 ml-1">AmE</span>
  </p>
);

export const StudyCard = ({ word, direction, revealed, onReveal, showRevealButton = true }: StudyCardProps) => {
  const { selectedVoice, voices } = useVocabularyStorage();
  const ready = voices.length > 0 || isPiperVoice(selectedVoice);
  const [loading, setLoading] = useState(false);

  const handleSpeak = async (text: string) => {
    if (isPiperVoice(selectedVoice)) {
      setLoading(true);
      try { await speakPiper(text); } finally { setLoading(false); }
    } else {
      speakNative(text, selectedVoice, voices);
    }
  };

  const SpeakerIcon = loading ? (
    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg>
  ) : (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
  );

  const speakButton = (text: string, label: string) => (
    <button
      onClick={() => handleSpeak(text)}
      disabled={!ready || loading}
      className="shrink-0 p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-[#751200] hover:text-white transition-all duration-200 disabled:opacity-30"
      aria-label={label}
    >
      {SpeakerIcon}
    </button>
  );

  const isEnToEs = direction === "en->es";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-10 text-center">
      {/* ===== FRENTE ===== */}
      {isEnToEs ? (
        <>
          <div className="flex items-center justify-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{word.englishTerm}</h2>
            {speakButton(word.englishTerm, "Escuchar palabra")}
          </div>
          {word.pronunciation && <Pronunciation ipa={word.pronunciation} />}
          {word.exampleSentence && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <p className="text-sm text-slate-500 leading-relaxed max-w-md">{word.exampleSentence}</p>
              {speakButton(word.exampleSentence, "Escuchar ejemplo")}
            </div>
          )}
        </>
      ) : (
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{word.spanishTranslation}</h2>
      )}

      {/* ===== REVERSO ===== */}
      <div className="mt-8 pt-6 border-t border-slate-100 min-h-[7rem] flex flex-col items-center justify-center">
        {!revealed ? (
          !showRevealButton ? (
            <p className="text-sm text-slate-300 select-none" aria-hidden="true">? ? ?</p>
          ) : (
          <button
            onClick={onReveal}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-3 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 hover:border-slate-400 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {isEnToEs ? "Mostrar español" : "Mostrar inglés"}
            <span className="text-slate-400 hidden sm:inline">· Espacio</span>
          </button>
          )
        ) : isEnToEs ? (
          <p className="text-xl font-semibold text-[#751200]">{word.spanishTranslation}</p>
        ) : (
          <>
            <div className="flex items-center justify-center gap-3">
              <p className="text-xl font-semibold text-[#751200]">{word.englishTerm}</p>
              {speakButton(word.englishTerm, "Escuchar palabra")}
            </div>
            {word.pronunciation && <Pronunciation ipa={word.pronunciation} />}
            {word.exampleSentence && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <p className="text-sm text-slate-500 leading-relaxed max-w-md">{word.exampleSentence}</p>
                {speakButton(word.exampleSentence, "Escuchar ejemplo")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
