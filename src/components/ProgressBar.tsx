import { useVocabularyStorage } from "../hooks/useVocabularyStorage";

export const ProgressBar = ({ variant }: { variant?: number }) => {
  const { state } = useVocabularyStorage();

  const percentage = state.totalCount > 0
    ? (state.learnedCount / state.totalCount) * 100
    : 0;

  const isLight = variant === 1 || variant === 3;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className={isLight ? "text-slate-500" : "text-white/70"}>Progreso de aprendizaje</span>
        <span className={`font-semibold ${isLight ? "text-slate-900" : "text-white"}`}>
          {state.learnedCount}/{state.totalCount} palabras
        </span>
      </div>
      <div className={`w-full rounded-full h-2.5 ${isLight ? "bg-slate-200" : "bg-white/20"}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out shadow-sm ${isLight ? "bg-[#751200]" : "bg-white"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
