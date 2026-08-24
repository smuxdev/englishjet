import { useState, type ReactNode, type InputHTMLAttributes } from "react";
import type { WordEdit } from "../hooks/vocabularyContext";
import { suggestIpa } from "../services/ipa";

interface WordFormProps {
  initial: WordEdit;
  onSave: (fields: WordEdit) => Promise<string | null>; // null = ok, string = error
  onCancel: () => void;
  onDelete?: () => Promise<string | null>; // solo en edición
  bare?: boolean; // sin marco de tarjeta (para usar dentro de un Modal)
}

// text-base en móvil: con <16px iOS hace zoom automático al enfocar el input
const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base sm:text-sm text-slate-900 focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none";

export const WordForm = ({ initial, onSave, onCancel, onDelete, bare = false }: WordFormProps) => {
  const [draft, setDraft] = useState<WordEdit>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    const result = await onSave(draft);
    setBusy(false);
    if (result) setError(result);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setBusy(true);
    setError(null);
    const result = await onDelete();
    setBusy(false);
    if (result) {
      setError(result);
      setConfirmingDelete(false);
    }
  };

  const handleSuggestIpa = async () => {
    if (!draft.englishTerm.trim()) return;
    setSuggesting(true);
    try {
      const ipa = await suggestIpa(draft.englishTerm);
      if (ipa) setDraft((d) => ({ ...d, pronunciation: ipa }));
      else setError("Sin sugerencia: término fuera del diccionario CMU");
    } finally {
      setSuggesting(false);
    }
  };

  const field = (
    label: string,
    key: keyof WordEdit,
    extra?: ReactNode,
    props?: InputHTMLAttributes<HTMLInputElement>
  ) => (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 flex items-center justify-between">
        {label}
        {extra}
      </span>
      <input
        type="text"
        value={draft[key]}
        onChange={(e) => {
          setError(null);
          setDraft((d) => ({ ...d, [key]: e.target.value }));
        }}
        className={`${inputClass} mt-1`}
        {...props}
      />
    </label>
  );

  const body = (
      <div className="p-5 space-y-3">
        {field("Inglés", "englishTerm", undefined, { className: `${inputClass} font-semibold mt-1` })}
        {field("Español", "spanishTranslation")}
        <label className="block">
          <span className="text-xs font-medium text-slate-500">Ejemplo</span>
          <textarea
            rows={3}
            value={draft.exampleSentence}
            onChange={(e) => {
              setError(null);
              setDraft((d) => ({ ...d, exampleSentence: e.target.value }));
            }}
            className={`${inputClass} mt-1 resize-none`}
          />
        </label>
        {field(
          "Pronunciación (IPA AmE)",
          "pronunciation",
          <button
            type="button"
            onClick={handleSuggestIpa}
            disabled={suggesting || !draft.englishTerm.trim()}
            className="text-[11px] font-medium text-primary hover:underline disabled:opacity-40 disabled:no-underline"
          >
            {suggesting ? "Buscando…" : "Sugerir"}
          </button>,
          { className: `${inputClass} font-mono mt-1`, placeholder: "/ˈkɑbˌwɛb/" }
        )}

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex gap-2 items-center">
          {onDelete &&
            (confirmingDelete ? (
              <span className="flex items-center gap-2 text-xs text-red-700">
                ¿Seguro?
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
                >
                  Sí, eliminar
                </button>
                <button
                  onClick={() => setConfirmingDelete(false)}
                  disabled={busy}
                  className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-40"
                >
                  No
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={busy}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                Eliminar
              </button>
            ))}
          <div className="flex gap-2 ml-auto">
            <button
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-40"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={busy}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-40"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
  );

  if (bare) return body;
  return <div className="rounded-xl shadow-sm border border-primary/40 bg-white">{body}</div>;
};
