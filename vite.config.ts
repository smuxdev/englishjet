import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteStaticCopy({
      targets: [
        { src: 'node_modules/piper-tts-web/dist/onnx/*', dest: 'onnx' },
        { src: 'node_modules/piper-tts-web/dist/piper/*', dest: 'piper' },
        { src: 'node_modules/piper-tts-web/dist/worker/*', dest: 'worker' },
      ],
    }),
  ],
})
