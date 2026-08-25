// Import solo de tipos: piper-tts-web embebe onnxruntime + transformers (~45 MB
// minificado), así que el runtime se carga con import() dinámico al primer uso
// para no arrastrarlo al bundle inicial.
import type { PiperWebEngine, VoiceProvider } from "piper-tts-web";

export const PIPER_VOICE_ID = "piper-en_US-libritts-high";
export const PIPER_HF_VOICE = "en_US-libritts-high";

export function isPiperVoice(name: string) {
  return name === PIPER_VOICE_ID;
}

// Modelo servido localmente desde public/piper/ (copiado a dist/piper/ en build)
// si existe: public/piper/en_US-libritts-high.onnx (131 MB, ver `npm run download:piper`).
// El .onnx está gitignorado (>100 MB), así que en despliegues construidos desde el
// repo (Vercel) no existe: se cae a HuggingFace en runtime, con Cache API para
// descargarlo una sola vez por navegador.
// El resto (piper_phonemize.wasm/.data, onnx/*.wasm, worker/*.js) lo copia
// vite-plugin-static-copy desde node_modules/piper-tts-web.
const LOCAL_MODEL_BASE = "/piper/en_US-libritts-high";
const HF_MODEL_BASE =
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts/high/en_US-libritts-high";
const VOICE_CACHE = "piper-voice-v1";

class LocalVoiceProvider implements VoiceProvider {
  #cache = new Map<string, unknown>();

  destroy() {
    for (const value of this.#cache.values()) {
      if (typeof value === "string" && value.startsWith("blob:")) URL.revokeObjectURL(value);
    }
    this.#cache.clear();
  }

  async fetch(_voice: string) {
    return Promise.all([this.#fetchFile(".onnx.json"), this.#fetchFile(".onnx")]); // [json, blobUrl]
  }

  async #fetchFile(ext: string) {
    const cached = this.#cache.get(ext);
    if (cached !== undefined) return cached;
    const res = (await this.#fetchLocal(LOCAL_MODEL_BASE + ext)) ?? (await this.#fetchRemote(HF_MODEL_BASE + ext));
    const data = ext.endsWith(".json") ? await res.json() : URL.createObjectURL(await res.blob());
    this.#cache.set(ext, data);
    return data;
  }

  async #fetchLocal(url: string): Promise<Response | null> {
    try {
      const res = await fetch(url);
      // Un rewrite SPA respondería index.html con 200: no es el modelo.
      if (!res.ok || (res.headers.get("content-type") ?? "").includes("text/html")) return null;
      return res;
    } catch {
      return null;
    }
  }

  async #fetchRemote(url: string): Promise<Response> {
    // Cache API en vez de confiar en la caché HTTP: 131 MB superan lo que los
    // navegadores retienen de forma fiable para respuestas cross-origin.
    const cache = typeof caches === "undefined" ? null : await caches.open(VOICE_CACHE).catch(() => null);
    const hit = await cache?.match(url);
    if (hit) return hit;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not fetch: ${url} (${res.status})`);
    cache?.put(url, res.clone()).catch(() => {});
    return res;
  }
}

let engine: PiperWebEngine | null = null;
let initPromise: Promise<void> | null = null;
let currentAudio: HTMLAudioElement | null = null;

async function getEngine(): Promise<PiperWebEngine | null> {
  if (engine) return engine;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const { PiperWebEngine } = await import("piper-tts-web");
        engine = new PiperWebEngine({ voiceProvider: new LocalVoiceProvider() });
      } catch (error) {
        console.warn("[Piper] init failed, will fallback to native", error);
        initPromise = null; // permitir reintento en la próxima llamada
      }
    })();
  }
  await initPromise;
  return engine;
}

export function speakNative(text: string, voiceName?: string, voices?: SpeechSynthesisVoice[]) {
  const available = voices ?? window.speechSynthesis.getVoices();
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  utterance.pitch = 1;
  const voice =
    (voiceName ? available.find((v) => v.name === voiceName) : undefined) ||
    available.find((v) => v.lang === "en-US" && v.name.includes("Google")) ||
    available.find((v) => v.lang === "en-US") ||
    available.find((v) => v.lang.startsWith("en")) ||
    available[0];
  if (voice) utterance.voice = voice;
  // cancel() inmediato + speak() en el mismo tick no suena en Chrome/Brave.
  setTimeout(() => window.speechSynthesis.speak(utterance), 50);
}

export async function speakPiper(text: string, voiceId = PIPER_HF_VOICE) {
  try {
    const eng = await getEngine();
    if (!eng) throw new Error("Piper engine unavailable");
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    window.speechSynthesis.cancel();
    const response = await eng.generate(text, voiceId, 0);
    const url = URL.createObjectURL(response.file);
    const audio = new Audio(url);
    currentAudio = audio;
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      audio.play().catch(() => resolve());
    });
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  } catch (error) {
    console.warn("[Piper] generate failed, fallback to native", error);
    speakNative(text);
  }
}
