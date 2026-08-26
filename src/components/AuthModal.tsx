import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { useAuth } from "../hooks/authContext";

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-ink placeholder-slate-400 transition-colors focus:border-primary focus:bg-white focus:ring-1 focus:ring-primary outline-none";

export const AuthModal = ({ onClose }: { onClose: () => void }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next: "login" | "register") => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const problem =
      mode === "login" ? await login(email, password) : await register(email, password, code);
    setBusy(false);
    if (problem) setError(problem);
    else onClose(); // con sesión, App remonta el provider con el mazo del usuario
  };

  return (
    <Modal title={mode === "login" ? "Iniciar sesión" : "Crear cuenta"} emoji="👤" onClose={onClose}>
      <div className="px-5 pb-5 pt-4">
        <div className="mb-4 flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 rounded-md px-3 py-1.5 transition-colors ${
                mode === m ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {m === "login" ? "Entrar" : "Registrarse"}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={mode === "login" ? "Contraseña" : "Contraseña (mínimo 8 caracteres)"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          {mode === "register" && (
            <input
              type="text"
              autoComplete="off"
              placeholder="Código de invitación"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
            />
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {busy ? "Un momento..." : mode === "login" ? "Entrar →" : "Crear cuenta →"}
          </button>
        </form>

        <p className="mt-3 text-xs text-slate-500">
          Con cuenta, tu mazo y tu progreso se guardan en el servidor y te siguen entre dispositivos. Sin
          cuenta, todo vive en este navegador, como siempre.
        </p>
      </div>
    </Modal>
  );
};
