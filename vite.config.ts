import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // piper-tts-web carga workers/wasm desde rutas fijas (/onnx/, /piper/, /worker/):
    // se copian desde node_modules para que sigan la versión del paquete.
    // stripBase aplana la copia (sin él quedarían en dist/onnx/node_modules/...).
    viteStaticCopy({
      targets: [
        { src: 'node_modules/piper-tts-web/dist/onnx/*', dest: 'onnx', rename: { stripBase: true } },
        { src: 'node_modules/piper-tts-web/dist/piper/*', dest: 'piper', rename: { stripBase: true } },
        { src: 'node_modules/piper-tts-web/dist/worker/*', dest: 'worker', rename: { stripBase: true } },
      ],
    }),
  ],
})
