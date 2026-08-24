// Sugerencia de IPA (AmE) a partir del diccionario CMU, consistente con las
// 638 pronunciaciones existentes del CSV (mismo origen, ver AGENTS.md §9).
// El diccionario pesa ~3.6 MB: se carga con import() dinámico (chunk lazy)
// solo al pulsar «Sugerir», que además solo existe en dev (canEdit).

// ARPAbet → IPA. AH/ER dependen del dígito de acento (ə/ʌ, ɚ/ɝ).
const ARPABET: Record<string, string> = {
  AA: "ɑ", AE: "æ", AO: "ɔ", AW: "aʊ", AY: "aɪ",
  EH: "ɛ", EY: "eɪ", IH: "ɪ", IY: "i", OW: "oʊ", OY: "ɔɪ",
  UH: "ʊ", UW: "u",
  B: "b", CH: "tʃ", D: "d", DH: "ð", F: "f", G: "ɡ", HH: "h",
  JH: "dʒ", K: "k", L: "l", M: "m", N: "n", NG: "ŋ", P: "p",
  R: "r", S: "s", SH: "ʃ", T: "t", TH: "θ", V: "v", W: "w",
  Y: "j", Z: "z", ZH: "ʒ",
};

// Onsets legales del inglés para decidir dónde cae la marca de acento
// (ˈkɑbˌwɛb: la W abre sílaba; la B queda de coda).
const LEGAL_ONSETS = new Set([
  "pl", "pr", "bl", "br", "tr", "dr", "kl", "kr", "ɡl", "ɡr",
  "fl", "fr", "θr", "ʃr", "sl", "sm", "sn", "sp", "st", "sk",
  "sw", "tw", "kw", "dw", "ɡw", "hj", "kj", "bj", "pj", "fj", "mj", "vj",
  "spr", "str", "skr", "spl", "skw", "skj",
]);

interface Unit {
  ipa: string;
  stress: number | null; // null = consonante
}

function toUnit(phone: string): Unit | null {
  const match = /^([A-Z]+)([012])?$/.exec(phone);
  if (!match) return null;
  const [, base, digit] = match;
  const stress = digit === undefined ? null : Number(digit);
  if (base === "AH") return { ipa: stress === 0 ? "ə" : "ʌ", stress };
  if (base === "ER") return { ipa: stress === 0 ? "ɚ" : "ɝ", stress };
  const ipa = ARPABET[base];
  return ipa ? { ipa, stress } : null;
}

// Punto de inserción de la marca: desde la vocal acentuada hacia atrás, el
// onset es la consonante previa, ampliada mientras el cluster siga siendo un
// onset legal; un cluster inicial de palabra entra entero (street → ˈstrit).
function stressPosition(units: Unit[], vowelIndex: number): number {
  let start = vowelIndex;
  while (start > 0 && units[start - 1].stress === null) start--;
  if (start === vowelIndex) return vowelIndex; // sin consonantes delante
  if (start === 0) return 0; // cluster inicial completo
  let onset = vowelIndex - 1; // al menos la consonante adyacente
  while (
    onset - 1 >= start &&
    LEGAL_ONSETS.has(units.slice(onset - 1, vowelIndex).map((u) => u.ipa).join(""))
  ) {
    onset--;
  }
  return onset;
}

function wordToIpa(arpabet: string): string {
  const units: Unit[] = [];
  for (const phone of arpabet.trim().split(/\s+/)) {
    const unit = toUnit(phone);
    if (!unit) throw new Error(`Fonema desconocido: ${phone}`);
    units.push(unit);
  }
  const parts = units.map((u) => u.ipa);
  // Convención estándar: los monosílabos no llevan marca de acento
  const vowelCount = units.filter((u) => u.stress !== null).length;
  if (vowelCount > 1) {
    // De atrás hacia delante para no desplazar índices pendientes
    for (let i = units.length - 1; i >= 0; i--) {
      const stress = units[i].stress;
      if (stress === 1 || stress === 2) {
        parts.splice(stressPosition(units, i), 0, stress === 1 ? "ˈ" : "ˌ");
      }
    }
  }
  return parts.join("");
}

export async function suggestIpa(term: string): Promise<string | null> {
  const words = term
    .toLowerCase()
    .replace(/[^a-z' -]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean);
  if (words.length === 0) return null;
  const { dictionary } = await import("cmu-pronouncing-dictionary");
  const parts: string[] = [];
  for (const word of words) {
    const arpabet = (dictionary as Record<string, string>)[word];
    if (!arpabet) return null; // mejor vacío que medio mal
    try {
      parts.push(wordToIpa(arpabet));
    } catch {
      return null;
    }
  }
  return `/${parts.join(" ")}/`;
}
