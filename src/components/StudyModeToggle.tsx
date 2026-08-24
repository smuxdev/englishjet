import { useVocabularyStorage } from "../hooks/vocabularyContext";
import type { StudyMode } from "../hooks/vocabularyContext";

export const StudyModeToggle = () => {
  const { studyMode, setStudyMode } = useVocabularyStorage();

  const optionClass = (active: boolean) =>
    `flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
      active
        ? "bg-[#751200] text-white shadow-sm"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    }`;

  const option = (mode: StudyMode, label: string, title: string) => (
    <button
      onClick={() => setStudyMode(mode)}
      className={optionClass(studyMode === mode)}
      aria-pressed={studyMode === mode}
      title={title}
    >
      {label}
    </button>
  );

  return (
    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
      {option("cards", "Tarjetas", "Revelar y autoevaluarse")}
      {option("typing", "Escribir", "Escribir la respuesta y que la app la corrija")}
    </div>
  );
};
