import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface ModalProps {
  title: string;
  emoji?: string;
  onClose: () => void;
  children: ReactNode;
}

export const Modal = ({ title, emoji, onClose, children }: ModalProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden"; // sin scroll de fondo
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Portal a <body>: un ancestro con backdrop-filter/transform se convierte en
  // containing block de los fixed y confinaría el modal a su caja (p.ej. la
  // cabecera sticky con backdrop-blur).
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
      {/* En móvil: bottom sheet a ancho completo con altura en dvh (teclado en pantalla) */}
      <div className="relative w-full max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-xl sm:rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          <div className="flex items-center gap-2">
            {emoji && (
              <span className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-base" aria-hidden="true">
                {emoji}
              </span>
            )}
            <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
};
