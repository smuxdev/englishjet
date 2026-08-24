import { useVocabularyStorage } from "../hooks/vocabularyContext";
import { PIPER_VOICE_ID } from "../services/piper";

function scoreVoice(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  if (n.includes("espeak") || n.includes("festival") || n.includes("robot")) return -100;
  let s = 0;
  if (n.includes("google")) s += 10;
  if (n.includes("natural") || n.includes("neural") || n.includes("wavenet") || n.includes("premium") || n.includes("aria") || n.includes("jenny") || n.includes("guy")) s += 8;
  if (!v.localService) s += 5;
  if (v.lang === "en-US") s += 2;
  if (v.default) s += 1;
  return s;
}

export const VoiceSelector = () => {
  const { voices, selectedVoice, setSelectedVoice } = useVocabularyStorage();

  const englishVoices = voices.filter((v) => v.lang.startsWith("en"));
  const displayVoices = englishVoices
    .filter((v) => scoreVoice(v) >= 8)
    .sort((a, b) => scoreVoice(b) - scoreVoice(a));

  // Si la voz guardada ya no pasa el corte de puntuación (otro navegador/SO),
  // se añade igualmente para que el select refleje la voz realmente en uso.
  const selectedMissing =
    selectedVoice !== PIPER_VOICE_ID && !displayVoices.some((v) => v.name === selectedVoice)
      ? englishVoices.find((v) => v.name === selectedVoice)
      : undefined;

  return (
    <div className="flex items-center gap-2">
      <svg className="w-4 h-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
      </svg>
      <select
        value={selectedVoice}
        onChange={(e) => setSelectedVoice(e.target.value)}
        className="text-xs rounded-lg px-2 py-1.5 border outline-none cursor-pointer bg-white text-slate-700 border-slate-300 focus:border-primary"
        style={{ maxWidth: 220 }}
        title={`${displayVoices.length} voces ★ + Piper`}
      >
        <option value={PIPER_VOICE_ID}>★ Piper LibriTTS High (en_US)</option>
        {selectedMissing && (
          <option value={selectedMissing.name}>
            {selectedMissing.name.replace("Google ", "").replace("Microsoft ", "")} ({selectedMissing.lang})
          </option>
        )}
        {displayVoices.map((v) => (
          <option key={v.name} value={v.name}>
            ★ {v.name.replace("Google ", "").replace("Microsoft ", "")} ({v.lang})
          </option>
        ))}
      </select>
    </div>
  );
};
