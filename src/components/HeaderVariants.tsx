const baseWrap = "max-w-6xl mx-auto px-4 sm:px-6 py-8";

// A · Editorial Minimal — Sombra+ (definitivo: blanco con elevación estilo D)
export const AppHeader = () => (
  <header className="bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 border-b border-slate-200 shadow-[0_12px_32px_rgba(0,0,0,0.10)] sticky top-0 z-20">
    <div className="h-[3px] w-full bg-gradient-to-r from-[#751200] via-[#ff6b35] to-[#ffb800] opacity-90" />
    <div className={`${baseWrap} !py-6`}>
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-2xl">✦</span>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900">
            ENGLISH<span className="font-serif italic font-light text-[#751200]">Jet</span>
          </h1>
          <span className="hidden sm:inline h-4 w-px bg-slate-300 mx-1" />
          <span className="hidden sm:inline text-xs tracking-[0.2em] uppercase text-slate-400">Vocabulary Studio</span>
        </div>
      </div>
    </div>
  </header>
);
