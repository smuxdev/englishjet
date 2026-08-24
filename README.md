# English Jet

Aplicación para aprender vocabulario inglés → español con repetición espaciada (Leitner, cajas 1-5 con intervalos 1/3/7/14/21 días), sesiones de estudio tipo flashcard (recall activo, atajos de teclado), TTS neuronal Piper local y pronunciación IPA AmE.

## Requisitos
- **Node.js 20+** (`node -v`)
- **npm 10+** (`npm -v`)

## Instalación en otro ordenador (desde GitHub)
```bash
# 1. Clonar
git clone https://github.com/smuxdev/englishjet.git
cd englishjet

# 2. Instalar dependencias
npm install

# 3. (Opcional) Descargar voz Piper local (131 MB, sin internet luego).
# Si no lo haces, la app funciona igual con voces del navegador.
npm run download:piper
# Equivale a:
# curl -L https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts/high/en_US-libritts-high.onnx -o public/piper/en_US-libritts-high.onnx
# curl -L https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/libritts/high/en_US-libritts-high.onnx.json -o public/piper/en_US-libritts-high.onnx.json

# 4. Desarrollo (con hot-reload)
npm run dev
# abre http://localhost:5173
# Bajo `npm run dev` cada tarjeta tiene botón de editar (lápiz): los cambios
# de término/traducción/ejemplo se escriben en public/duo_cards_en_export.csv.
# En el build estático la edición se oculta (no hay servidor que escriba).

# 5. Build de producción
npm run build
# genera dist/ (incluye public/piper/ si lo descargaste)

# 6. Previsualizar el build
npm run preview
# o servir dist con cualquier servidor estático:
# npx serve dist
# python3 -m http.server --directory dist 8000
```

## Distribuible ZIP (sin necesidad de clonar)
Si te llevas el ZIP ya compilado:

1. En el PC origen: `npm run build` y luego `zip -r englishjet-dist.zip dist` (o `tar czf englishjet-dist.tar.gz dist`)
   - El ZIP de `dist/` pesa ~390 MB por el modelo `en_US-libritts-high.onnx` (131 MB). Si lo quieres ligero, borra `dist/piper/en_US-libritts-high.onnx` y usa voces del navegador.
2. En el PC destino, descomprime y sirve:
```bash
unzip englishjet-dist.zip
npx serve dist
# o
python3 -m http.server --directory dist 8000
```
Abre `http://localhost:3000` (serve) o `http://localhost:8000` (python).

## Notas
- **Modelo Piper** (`public/piper/en_US-libritts-high.onnx` 131 MB) está en `.gitignore` para no superar el límite de 100 MB de GitHub. Sin `git-lfs`, clonar no lo trae; ejecuta `npm run download:piper` en el otro PC. Si usas `git lfs`, haz `git lfs track "public/piper/*.onnx"` antes del push.
- **CSV** `public/duo_cards_en_export.csv` (638 palabras con `pronunciation` IPA) se copia a `dist/` en el build.
- **localStorage**: solo se persisten progreso y preferencias (`vocabulary_progress` — mapa término→{caja Leitner, próxima revisión} —, `vocabulary_voice`, `vocabulary_filter`, `vocabulary_direction`, `vocabulary_session_size`). La lista de palabras se lee siempre del CSV; los formatos antiguos (`vocabulary_learned`, `vocabulary_words`) se migran automáticamente sin perder progreso.
