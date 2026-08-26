import { useEffect, useState } from "react";
import { AuthForm } from "./AuthForm";
import { probeCsvEditable } from "../services/csvStore";

const FEATURES = [
  { emoji: "🗂️", text: "Repetición espaciada (cajas Leitner): repasas cada palabra justo cuando estás a punto de olvidarla" },
  { emoji: "🔊", text: "Voz neuronal e IPA para fijar la pronunciación real" },
  { emoji: "📖", text: "Frases de ejemplo reales que rotan en cada repaso, modo Contexto y frases propias" },
  { emoji: "☁️", text: "Tu mazo y tu progreso, en tu cuenta: te siguen entre dispositivos" },
] as const;

// Puerta de entrada sin sesión: solo invita a entrar o crear cuenta. En dev
// (`npm run dev`, probe csv-editable) ofrece además continuar sin cuenta para
// el flujo de edición del CSV. En builds estáticos sin backend esta pantalla
// no llega a verse: App cae directamente al modo local.
export const WelcomeScreen = ({ onContinueLocal }: { onContinueLocal: () => void }) => {
  const [devMode, setDevMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    probeCsvEditable().then((ok) => {
      if (!cancelled) setDevMode(ok);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#eef4fb] via-white to-[#fdf0ef]">
      <div className="h-[3px] w-full bg-gradient-to-r from-primary via-accent to-review" />
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-10">
        <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Marca + pitch */}
          <div>
            <div className="flex items-center gap-3">
              <span
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl select-none"
                aria-hidden="true"
              >
                ✈️
              </span>
              <div>
                <h1 className="font-display text-3xl sm:text-4xl font-black tracking-tight text-ink leading-none">
                  English<span className="text-accent">Jet</span>
                </h1>
                <p className="mt-1 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-accent">
                  <span className="inline-block w-5 h-px bg-accent" aria-hidden="true" />
                  Vocabulary Studio
                </p>
              </div>
            </div>
            <p className="mt-5 text-base text-body">
              Aprende el inglés que se habla de verdad — con ejemplos, IPA y voz neuronal.
            </p>
            <ul className="mt-5 space-y-3">
              {FEATURES.map((f) => (
                <li key={f.emoji} className="flex items-start gap-3 text-sm text-body">
                  <span className="shrink-0 w-7 h-7 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center text-sm" aria-hidden="true">
                    {f.emoji}
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>

          {/* Tarjeta de acceso */}
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 sm:p-7">
            <h2 className="font-display text-lg font-bold text-ink mb-4">Entra para empezar</h2>
            <AuthForm />
            <p className="mt-3 text-xs text-slate-500">
              Para crear cuenta necesitas el código de invitación.
            </p>
            {devMode && (
              <button
                onClick={onContinueLocal}
                className="mt-4 w-full text-center text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
              >
                Continuar sin cuenta (modo desarrollo: edición del CSV local)
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
