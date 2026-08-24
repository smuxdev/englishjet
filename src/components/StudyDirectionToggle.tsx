import { useVocabularyStorage } from "../hooks/vocabularyContext";
import type { StudyDirection } from "../hooks/vocabularyContext";

export const StudyDirectionToggle = () => {
  const { studyDirection, setStudyDirection } = useVocabularyStorage();

  const optionClass = (active: boolean) =>
    `flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
      active
        ? "bg-primary text-white shadow-sm"
        : "text-body hover:text-ink hover:bg-white"
    }`;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden sm:inline text-xs font-medium text-body shrink-0">Practicar:</span>
      <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
        <button
          onClick={() => setStudyDirection("en->es" as StudyDirection)}
          className={optionClass(studyDirection === "en->es")}
          aria-pressed={studyDirection === "en->es"}
          title="Ver inglés, adivinar español"
        >
          EN → ES
        </button>
        <button
          onClick={() => setStudyDirection("es->en" as StudyDirection)}
          className={optionClass(studyDirection === "es->en")}
          aria-pressed={studyDirection === "es->en"}
          title="Ver español, adivinar inglés"
        >
          ES → EN
        </button>
      </div>
    </div>
  );
};
