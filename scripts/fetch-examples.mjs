#!/usr/bin/env node
/**
 * Genera public/extra_examples.csv con frases reales de Tatoeba (CC-BY 2.0 FR)
 * para cada término del vocabulario: la sesión de estudio rota entre frases
 * distintas en cada repaso (variabilidad de codificación).
 *
 * Uso: npm run fetch:examples   (requiere curl y bunzip2 en el PATH)
 * Fuente: https://tatoeba.org — export per_language/eng (~25 MB comprimido).
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { readFileSync, writeFileSync } from "node:fs";
import Papa from "papaparse";

const TATOEBA_URL = "https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2";
const VOCAB_CSV = new URL("../public/duo_cards_en_export.csv", import.meta.url).pathname;
const OUT_CSV = new URL("../public/extra_examples.csv", import.meta.url).pathname;
const MIN_LEN = 30;
const MAX_LEN = 90;
const MAX_PER_TERM = 4;

function normalize(s) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

// Formas flexionadas simples de una palabra (suficiente para localizar usos)
function inflections(base) {
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
    forms.add(base.slice(0, -1) + "ing"); // make -> making
  }
  return [...forms];
}

const vocab = Papa.parse(readFileSync(VOCAB_CSV, "utf8"), { header: true, skipEmptyLines: true });
const terms = vocab.data.map((r) => (r.front ?? "").trim()).filter(Boolean);
const hints = new Map(vocab.data.map((r) => [(r.front ?? "").trim(), normalize(r.hint ?? "")]));

// Mono-palabra: Map forma→términos (lookup O(1) por token).
// Multi-palabra: regex de frase literal, probada solo si aparece la 1ª palabra.
const formToTerms = new Map();
const phrases = [];
for (const term of terms) {
  const lower = term.toLowerCase();
  const tokens = lower.split(/\s+/);
  if (tokens.length === 1) {
    for (const form of inflections(lower)) {
      const list = formToTerms.get(form) ?? [];
      list.push(term);
      formToTerms.set(form, list);
    }
  } else {
    const escaped = lower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    phrases.push({
      term,
      firstToken: tokens[0].replace(/[^a-z']/g, ""),
      regex: new RegExp(`(?<![a-z'])${escaped.replace(/\\\s/g, "\\s+")}(?![a-z'])`, "i"),
    });
  }
}

const found = new Map(terms.map((t) => [t, []]));
const seenPerTerm = new Map(terms.map((t) => [t, new Set([hints.get(t)])]));

function offer(term, sentence) {
  const list = found.get(term);
  if (list.length >= MAX_PER_TERM) return;
  const key = normalize(sentence);
  const seen = seenPerTerm.get(term);
  if (seen.has(key)) return;
  seen.add(key);
  list.push(sentence);
}

console.log(`Descargando y procesando ${TATOEBA_URL} ...`);
const child = spawn("sh", ["-c", `curl -sL '${TATOEBA_URL}' | bunzip2`], {
  stdio: ["ignore", "pipe", "inherit"],
});
const rl = createInterface({ input: child.stdout });

let lines = 0;
for await (const line of rl) {
  lines++;
  const tab = line.indexOf("\t");
  const tab2 = line.indexOf("\t", tab + 1);
  if (tab2 < 0) continue;
  const sentence = line.slice(tab2 + 1).trim();
  if (sentence.length < MIN_LEN || sentence.length > MAX_LEN) continue;
  if (!/^[A-Z"'].*[.!?"']$/.test(sentence)) continue;
  const lower = sentence.toLowerCase();

  // mono-palabra por tokens
  const tokens = lower.split(/[^a-z']+/);
  for (const token of tokens) {
    const matched = formToTerms.get(token);
    if (matched) for (const term of matched) offer(term, sentence);
  }
  // multi-palabra por regex, con pre-filtro barato
  for (const p of phrases) {
    if (lower.includes(p.firstToken) && p.regex.test(sentence)) offer(p.term, sentence);
  }
}

const rows = [];
for (const term of [...terms].sort((a, b) => a.localeCompare(b))) {
  for (const example of found.get(term)) rows.push([term, example]);
}
const csv = Papa.unparse({ fields: ["term", "example"], data: rows }, { newline: "\n" }) + "\n";
writeFileSync(OUT_CSV, csv, "utf8");

const covered = terms.filter((t) => found.get(t).length > 0).length;
const full = terms.filter((t) => found.get(t).length >= MAX_PER_TERM).length;
console.log(`Frases procesadas: ${lines}`);
console.log(`Cobertura: ${covered}/${terms.length} términos con extras (${full} con ${MAX_PER_TERM})`);
console.log(`Filas escritas: ${rows.length} -> ${OUT_CSV}`);
