declare module "piper-tts-web" {
  export interface VoiceProvider {
    fetch(voice: string): Promise<unknown[]>;
    destroy(): void;
  }

  export interface PiperGenerateResult {
    file: Blob;
  }

  export class PiperWebEngine {
    constructor(config?: { voiceProvider?: VoiceProvider });
    generate(text: string, voice: string, speaker?: number): Promise<PiperGenerateResult>;
    destroy(): void;
  }
}
