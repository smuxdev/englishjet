import { useVocabularyStorage } from "../hooks/vocabularyContext";

export const ProgressBar = () => {
  const { state } = useVocabularyStorage();

  const percentage = state.totalCount > 0
    ? (state.learnedCount / state.totalCount) * 100
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-slate-500">Progreso de aprendizaje</span>
        <span className="font-semibold text-slate-900">
          {state.learnedCount}/{state.totalCount} palabras
        </span>
      </div>
      <div className="w-full rounded-full h-2.5 bg-slate-200">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out shadow-sm bg-[#751200]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
