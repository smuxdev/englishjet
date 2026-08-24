export type Verdict = "ok" | "almost" | "fail";

// Umbral para tolerar 1 error tipográfico: en palabras de <4 chars un error
// es un tercio de la palabra y no distingue términos distintos.
const ALMOST_MIN_LENGTH = 4;

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // sin diacríticos: telaraña ≡ telarana
    .toLowerCase()
    .replace(/[¿?¡!.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// El campo del CSV usa coma/;// para alternativas («dar la lata, molestar»,
// «as/fenomeno»): cualquier alternativa completa vale.
function alternatives(target: string): string[] {
  return target
    .split(/[,;/]/)
    .map(normalize)
    .filter(Boolean);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const insertOrDelete = Math.min(prev[j], prev[j - 1]) + 1;
      const substitute = diagonal + (a[i - 1] === b[j - 1] ? 0 : 1);
      diagonal = prev[j];
      prev[j] = Math.min(insertOrDelete, substitute);
    }
  }
  return prev[b.length];
}

export function checkAnswer(input: string, target: string): Verdict {
  const answer = normalize(input);
  if (!answer) return "fail";
  const options = alternatives(target);
  if (options.includes(answer)) return "ok";
  for (const option of options) {
    if (option.length >= ALMOST_MIN_LENGTH && levenshtein(answer, option) <= 1) {
      return "almost";
    }
  }
  return "fail";
}
