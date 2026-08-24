const baseWrap = "max-w-6xl mx-auto px-4 sm:px-6 py-8";

// Cabecera estilo editorial YDA: blanca, logo Lato con acento rojo,
// kicker en mayúsculas con rayita y barra superior de color de marca.
export const AppHeader = () => (
  <header className="bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 border-b border-slate-200 shadow-sm sticky top-0 z-20">
    <div className="h-[3px] w-full bg-gradient-to-r from-primary via-accent to-review" />
    <div className={`${baseWrap} !py-5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl select-none" aria-hidden="true">
            ✈️
          </span>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-ink leading-none">
              English<span className="text-accent">Jet</span>
            </h1>
            <p className="mt-1 flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] uppercase text-accent">
              <span className="inline-block w-5 h-px bg-accent" aria-hidden="true" />
              Vocabulary Studio
            </p>
          </div>
        </div>
      </div>
    </div>
  </header>
);
