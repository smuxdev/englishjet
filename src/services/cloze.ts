// Localización de un término (con flexiones simples) dentro de una frase,
// para el modo Contexto: enmascarar el hueco y resaltar la solución.

export function inflections(base: string): string[] {
  const forms = new Set([base]);
  forms.add(base + "s");
  forms.add(base + "es");
  forms.add(base + "d");
  forms.add(base + "ed");
  forms.add(base + "ing");
  if (base.endsWith("y")) {
    forms.add(base.slice(0, -1) + "ies");
    forms.add(base.slice(0, -1) + "ied");
  }
  if (base.endsWith("e")) {
    forms.add(base.slice(0, -1) + "ing");
  }
  return [...forms];
}

export interface ClozeMatch {
  masked: string; // frase con todas las ocurrencias sustituidas por ____
  surface: string; // forma tal cual aparece en la frase (p.ej. «cobwebs»)
  parts: { text: string; hit: boolean }[]; // para resaltar en el reverso
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Candidatos a buscar, de más largo a más corto (evita tapar «cobweb»
// dentro de «cobwebs»). Multi-palabra: la frase literal + variantes con la
// primera palabra flexionada, con espacios flexibles.
function candidates(term: string): string[] {
  const lower = term.toLowerCase();
  const tokens = lower.split(/\s+/);
  let forms: string[];
  if (tokens.length === 1) {
    forms = inflections(lower);
  } else {
    const rest = tokens.slice(1).join(" ");
    forms = inflections(tokens[0]).map((f) => `${f} ${rest}`);
  }
  return forms.sort((a, b) => b.length - a.length);
}

export function findOccurrence(sentence: string, term: string): ClozeMatch | null {
  for (const candidate of candidates(term)) {
    const pattern = escapeRegex(candidate).replace(/\\?\s+/g, "\\s+");
    const regex = new RegExp(`(?<![A-Za-z'])${pattern}(?![A-Za-z'])`, "gi");
    if (!regex.test(sentence)) continue;
    regex.lastIndex = 0;
    const parts: ClozeMatch["parts"] = [];
    let surface = "";
    let last = 0;
    for (const match of sentence.matchAll(regex)) {
      const index = match.index ?? 0;
      if (index > last) parts.push({ text: sentence.slice(last, index), hit: false });
      parts.push({ text: match[0], hit: true });
      if (!surface) surface = match[0];
      last = index + match[0].length;
    }
    if (last < sentence.length) parts.push({ text: sentence.slice(last), hit: false });
    const masked = parts.map((p) => (p.hit ? "____" : p.text)).join("");
    return { masked, surface, parts };
  }
  return null;
}
