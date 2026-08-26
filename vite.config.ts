import { defineConfig, loadEnv, type Plugin } from 'vite'
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
      // Proxy a la API pública de Tatoeba para sugerir frases de ejemplo al
      // crear/editar palabras (evita CORS; solo existe en dev, como la edición).
      server.middlewares.use('/api/suggest-examples', (req, res) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const term = (url.searchParams.get('term') ?? '').trim()
        res.setHeader('Content-Type', 'application/json')
        if (!term || term.length > 80) {
          res.statusCode = 400
          res.end('[]')
          return
        }
        const api = `https://tatoeba.org/eng/api_v0/search?from=eng&orphans=no&unapproved=no&query=${encodeURIComponent(term)}`
        fetch(api, {
          headers: { 'User-Agent': 'englishjet-dev (vocabulary app)' },
          signal: AbortSignal.timeout(10_000),
        })
          .then((r) => r.json() as Promise<{ results?: { text?: string }[] }>)
          .then((data) => {
            const seen = new Set<string>()
            const out: string[] = []
            for (const item of data.results ?? []) {
              const text = (item.text ?? '').trim()
              if (text.length < 20 || text.length > 110) continue
              const key = text.toLowerCase()
              if (seen.has(key)) continue
              seen.add(key)
              out.push(text)
              if (out.length >= 10) break
            }
            res.end(JSON.stringify(out))
          })
          .catch(() => {
            res.statusCode = 502
            res.end('[]')
          })
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

// Puente de dev para las Vercel Functions de api/: los mismos handlers
// (firma web Request→Response) se montan como middleware, cargados con
// ssrLoadModule (hot reload del código de api sin reiniciar). Así el
// desarrollo no depende de `vercel dev`. Los 3 endpoints CSV dev-only de
// csvEditApi (csv-editable, suggest-examples, save-csv) mantienen prioridad.
function resolveApiRoute(pathname: string): { file: string; params: Record<string, string> } | null {
  const m = /^\/api\/(.+?)\/?$/.exec(pathname)
  if (!m) return null
  const parts = m[1].split('/')
  if (parts[0] === 'auth' && parts.length === 2) return { file: '/api/auth/[action].ts', params: { action: parts[1] } }
  if (parts[0] === 'cards' && parts.length === 1) return { file: '/api/cards/index.ts', params: {} }
  if (parts[0] === 'cards' && parts.length === 2 && parts[1] === 'import') return { file: '/api/cards/import.ts', params: {} }
  if (parts[0] === 'cards' && parts.length === 2) return { file: '/api/cards/[id].ts', params: { id: parts[1] } }
  if (parts[0] === 'activity' && parts.length === 1) return { file: '/api/activity.ts', params: {} }
  return null
}

function devApi(): Plugin {
  return {
    name: 'dev-api',
    configureServer(server) {
      // Los handlers leen process.env; se inyecta .env.local (gitignored)
      const env = loadEnv(server.config.mode, server.config.root, '')
      for (const key of ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'REGISTRATION_CODE']) {
        if (env[key] !== undefined && process.env[key] === undefined) process.env[key] = env[key]
      }
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '', 'http://localhost')
        const route = resolveApiRoute(url.pathname)
        if (!route) {
          next()
          return
        }
        void (async () => {
          try {
            const mod = (await server.ssrLoadModule(route.file)) as Record<string, unknown>
            const handler = mod[req.method ?? 'GET']
            if (typeof handler !== 'function') {
              res.statusCode = 405
              res.end()
              return
            }
            for (const [key, value] of Object.entries(route.params)) url.searchParams.set(key, value)
            const headers = new Headers()
            for (const [key, value] of Object.entries(req.headers)) {
              if (typeof value === 'string') headers.set(key, value)
              else if (Array.isArray(value)) for (const item of value) headers.append(key, item)
            }
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk as Buffer)
            const body = Buffer.concat(chunks)
            const request = new Request(`http://localhost${url.pathname}${url.search}`, {
              method: req.method,
              headers,
              body: body.length > 0 ? body : undefined,
            })
            const response = (await handler(request)) as Response
            res.statusCode = response.status
            response.headers.forEach((value, key) => {
              if (key !== 'set-cookie') res.setHeader(key, value)
            })
            const cookies = response.headers.getSetCookie()
            if (cookies.length > 0) res.setHeader('Set-Cookie', cookies)
            res.end(Buffer.from(await response.arrayBuffer()))
          } catch (error) {
            console.error('[dev-api]', error)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'internal' }))
          }
        })()
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
    devApi(),
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
