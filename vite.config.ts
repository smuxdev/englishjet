import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const CSV_PATH = fileURLToPath(new URL('./public/duo_cards_en_export.csv', import.meta.url))
const CSV_HEADER = 'front,back,hint,publishedAt,pronunciation'
const MAX_CSV_BYTES = 5_000_000

// El navegador no puede escribir ficheros del servidor: la edición de palabras
// persiste en el CSV solo bajo `npm run dev`, vía estos endpoints. En dist
// (estático) no existen y la UI de edición se oculta (probe /api/csv-editable).
function csvEditApi(): Plugin {
  return {
    name: 'csv-edit-api',
    configureServer(server) {
      server.middlewares.use('/api/csv-editable', (_req, res) => {
        res.statusCode = 204
        res.end()
      })
      server.middlewares.use('/api/save-csv', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let body = ''
        req.on('data', (chunk: Buffer) => {
          body += chunk
          if (body.length > MAX_CSV_BYTES) {
            res.statusCode = 413
            res.end()
            req.destroy()
          }
        })
        req.on('end', () => {
          if (!body.startsWith(CSV_HEADER)) {
            res.statusCode = 400
            res.end('bad csv')
            return
          }
          writeFile(CSV_PATH, body, 'utf8')
            .then(() => {
              res.statusCode = 204
              res.end()
            })
            .catch((error) => {
              res.statusCode = 500
              res.end(String(error))
            })
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    watch: {
      // El guardado de ediciones reescribe el CSV; sin esto, Vite haría un
      // full-reload de la página en cada edición.
      ignored: ['**/duo_cards_en_export.csv'],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    csvEditApi(),
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
