import Papa from "papaparse";
import type { Word } from "../types/vocabulary";

// Escritura del CSV vía dev server (ver csvEditApi en vite.config.ts).
// En una build estática no existe el endpoint y la edición queda oculta.

export async function probeCsvEditable(): Promise<boolean> {
  try {
    const res = await fetch("/api/csv-editable");
    // 204 exacto: el fallback SPA de un servidor estático responde 200 con el
    // index.html a cualquier ruta, y daría un falso positivo con res.ok.
    return res.status === 204;
  } catch {
    return false;
  }
}

export async function saveCsvToServer(words: Word[]): Promise<boolean> {
  const csv = Papa.unparse(
    {
      fields: ["front", "back", "hint", "publishedAt", "pronunciation"],
      data: words.map((w) => [
        w.englishTerm,
        w.spanishTranslation,
        w.exampleSentence,
        w.dateAdded,
        w.pronunciation ?? "",
      ]),
    },
    { newline: "\n" }
  );
  try {
    const res = await fetch("/api/save-csv", {
      method: "POST",
      headers: { "Content-Type": "text/csv" },
      body: csv + "\n",
    });
    return res.ok;
  } catch {
    return false;
  }
}
