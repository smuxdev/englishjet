import type { ReactNode } from "react";

const Section = ({ emoji, title, children }: { emoji: string; title: string; children: ReactNode }) => (
  <section>
    <h3 className="flex items-center gap-2 font-display text-sm font-bold text-ink mb-1.5">
      <span className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-sm" aria-hidden="true">
        {emoji}
      </span>
      {title}
    </h3>
    <div className="text-sm text-body leading-relaxed space-y-1.5 pl-9">{children}</div>
  </section>
);

const Key = ({ children }: { children: ReactNode }) => (
  <kbd className="px-1.5 py-0.5 rounded border border-slate-300 bg-slate-50 text-xs font-mono text-ink">
    {children}
  </kbd>
);

export const HelpContent = () => (
  <div className="p-5 pt-3 space-y-5">
    <p className="text-sm text-body leading-relaxed">
      EnglishJet te ayuda a aprender vocabulario en inglés y a que <strong>no se te olvide</strong>:
      te pregunta cada palabra justo cuando estás a punto de olvidarla.
    </p>

    <Section emoji="🗂️" title="Tus palabras">
      <p>
        La pantalla principal muestra todas tus palabras con su traducción, pronunciación (IPA) y una
        frase de ejemplo. Puedes buscar, filtrar (📚 Todas · ✅ Dominadas · 🕑 Por aprender) y pasar páginas.
      </p>
      <p>
        Los <strong>5 puntitos</strong> de cada tarjeta son su nivel: sin puntos = nueva, 5 puntos = dominada.
        El botón <strong>+/✓</strong> marca una palabra como dominada (o la devuelve a nueva).
      </p>
    </Section>

    <Section emoji="📅" title="Repasar hoy">
      <p>
        El botón rojo <strong>«Repasar hoy (N)»</strong> reúne lo que toca: palabras nuevas y repasos que
        vencen hoy. Cada acierto sube la palabra de nivel y la vuelve a preguntar más tarde
        (1, 3, 7, 14 y 21 días); cada fallo la baja al nivel 1. Si fallas una palabra dominada,
        vuelve a circular. Puedes elegir el tamaño de sesión (10-50 palabras).
      </p>
    </Section>

    <Section emoji="🎴" title="Los tres modos de estudio">
      <p>
        <strong>Tarjetas</strong> — ves la palabra, piensas la respuesta, la revelas y te autoevalúas
        («La sabía / Aún no»).
      </p>
      <p>
        <strong>Escribir</strong> — tecleas la traducción y la app la corrige (tolera tildes,
        mayúsculas y un error tipográfico).
      </p>
      <p>
        <strong>Contexto</strong> — una frase real con la palabra tapada: escribe la que falta.
        Es lo más parecido a encontrártela leyendo.
      </p>
      <p>
        Con <strong>EN → ES / ES → EN</strong> eliges qué idioma ves primero (en Tarjetas y Escribir).
      </p>
    </Section>

    <Section emoji="🔁" title="Para que se fije de verdad">
      <p>
        La frase de ejemplo <strong>cambia entre repasos</strong> (frases reales del corpus Tatoeba),
        así aprendes la palabra y no la tarjeta. En el frente no hay frase: primero recuerdas, después
        la ves como refuerzo.
      </p>
      <p>
        Al terminar una sesión, puedes escribir <strong>tu propia frase</strong> con cada palabra
        fallada — lo autogenerado se retiene más, y aparecerá en tus repasos con la etiqueta «✍ tu frase».
      </p>
    </Section>

    <Section emoji="⌨️" title="Atajos en sesión">
      <p>
        <Key>Espacio</Key> revela · <Key>1</Key> «Aún no» · <Key>2</Key> «La sabía» ·{" "}
        <Key>⏎</Key> comprueba y continúa (Escribir/Contexto).
      </p>
    </Section>

    <Section emoji="🔊" title="Pronunciación">
      <p>
        Cada altavoz pronuncia con una voz neuronal local (Piper, sin internet) o con las voces del
        navegador — se elige arriba a la derecha. El botón <strong>«🔊 auto»</strong> de la sesión
        pronuncia solo: la palabra al aparecer (EN → ES) o al revelarse (ES → EN y Contexto).
      </p>
    </Section>

    <Section emoji="📊" title="Estadísticas">
      <p>
        Bajo la barra de progreso: tu <strong>racha</strong> de días, lo repasado hoy, cuántas palabras
        hay en cada nivel y cuántos repasos vencen mañana y esta semana.
      </p>
    </Section>

    <Section emoji="✏️" title="Editar el vocabulario (modo desarrollo)">
      <p>
        Con la app lanzada con <code className="text-xs bg-slate-100 px-1 rounded">npm run dev</code>,
        cada tarjeta tiene un lápiz para editar (inglés, español, ejemplo, IPA con sugerencia automática)
        o eliminar, y el botón <strong>«+ Añadir palabra»</strong> da de alta nuevas. Los cambios se
        guardan en el CSV del proyecto.
      </p>
    </Section>

    <Section emoji="💾" title="Dónde se guarda tu progreso">
      <p>
        Todo tu progreso, rachas y preferencias viven en <strong>este navegador</strong> (localStorage):
        sobreviven a recargas, pero no se comparten entre dispositivos ni sobreviven a borrar los datos
        de navegación. La lista de palabras vive en el CSV del proyecto.
      </p>
    </Section>
  </div>
);
