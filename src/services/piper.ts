import { PiperWebEngine } from 'piper-tts-web';

let engine: InstanceType<typeof PiperWebEngine> | null = null;
let initPromise: Promise<void> | null = null;
let currentAudio: HTMLAudioElement | null = null;

// Modelo servido localmente desde public/piper/ (copiado a dist/piper/ en build).
// Evita descarga de HuggingFace en cada carga. Archivos requeridos:
// public/piper/en_US-libritts-high.onnx (131 MB) + .onnx.json
// El resto (piper_phonemize.wasm/.data, onnx wasm) lo copia vite-plugin-static-copy.
const LOCAL_MODEL_BASE = '/piper/en_US-libritts-high';

class LocalVoiceProvider {
  #cache: Record<string, any> = {};
  destroy() {
    for (const v of Object.values(this.#cache)) {
      if (typeof v === 'string' && v.startsWith('blob:')) URL.revokeObjectURL(v);
    }
    this.#cache = {};
  }
  async fetch(_voice: string) {
    const urls = [LOCAL_MODEL_BASE + '.onnx.json', LOCAL_MODEL_BASE + '.onnx'];
    const results = await Promise.all(urls.map((url) => this.#fetchUrl(url)));
    return results; // [json, blobUrl]
  }
  async #fetchUrl(url: string) {
    if (this.#cache[url] !== undefined) return this.#cache[url];
    const res = await fetch(url);
    if (!res.ok) throw new Error('Could not fetch: ' + url + ' (' + res.status + ')');
    const data = url.endsWith('.json') ? await res.json() : URL.createObjectURL(await res.blob());
    this.#cache[url] = data;
    return data;
  }
}

async function getEngine() {
  if (engine) return engine;
  if (initPromise) await initPromise;
  if (engine) return engine;
  initPromise = (async () => {
    try {
      engine = new PiperWebEngine({ voiceProvider: new LocalVoiceProvider() } as any);
    } catch (e) {
      console.warn('[Piper] init failed, will fallback to native', e);
      engine = null as any;
    }
  })();
  await initPromise;
  return engine!;
}

function speakNativeFallback(text: string) {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = 0.85;
  const v = window.speechSynthesis.getVoices().find(v => v.lang === 'en-US' && v.name.includes('Google'))
    || window.speechSynthesis.getVoices().find(v => v.lang === 'en-US');
  if (v) u.voice = v;
  setTimeout(() => window.speechSynthesis.speak(u), 50);
}

export async function speakPiper(text: string, voiceId = 'en_US-amy-medium') {
  try {
    const eng = await getEngine();
    if (!eng) throw new Error('no engine');
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.remove();
      currentAudio = null;
    }
    window.speechSynthesis.cancel();
    const response = await eng.generate(text, voiceId, 0);
    const audio = document.createElement('audio');
    audio.autoplay = true;
    const source = document.createElement('source');
    source.type = response.file.type || 'audio/wav';
    source.src = URL.createObjectURL(response.file);
    audio.appendChild(source);
    audio.style.display = 'none';
    document.body.appendChild(audio);
    currentAudio = audio;
    await audio.play().catch(() => {});
    return new Promise<void>((resolve) => {
      audio.onended = () => {
        URL.revokeObjectURL(source.src);
        audio.remove();
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };
      audio.onerror = () => resolve();
    });
  } catch (e) {
    console.warn('[Piper] generate failed, fallback to native', e);
    speakNativeFallback(text);
  }
}

export function isPiperVoice(name: string) {
  return name === 'piper-en_US-libritts-high';
}

export const PIPER_VOICE_ID = 'piper-en_US-libritts-high';
export const PIPER_HF_VOICE = 'en_US-libritts-high';
