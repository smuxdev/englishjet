# English Jet - Problemas y Soluciones Encontradas

## Descripción del Proyecto
English Jet es una aplicación web para aprender vocabulario en inglés:
- Palabras con traducción al español, ejemplo y pronunciación IPA (AmE)
- Marcar como aprendida/pendiente, filtros y paginación (10/página)
- Modo estudio: oculta la traducción hasta revelar, practicable EN→ES y ES→EN
- TTS con voz neuronal Piper local (sin internet) + fallback a voces del navegador
- Progreso y preferencias en localStorage

## Reglas de Desarrollo
- Cada cambio importante debe documentarse en este fichero
- Mantener historial útil y eliminar ruido obsoleto

## Problemas y Soluciones

### 1. Tailwind v4 sin estilos
- **Problema**: `src/index.css` usaba sintaxis v3 (`@tailwind base/components/utilities`) y el proyecto usa Tailwind v4 con `@tailwindcss/vite` → todo blanco
- **Solución**: `src/index.css:1` → `@import "tailwindcss";`

### 2. Paginación y carga del CSV
- **Problema**: Cargar todo el CSV en el DOM colgaba el navegador; `goToPage(1)` usaba closures desactualizados
- **Solución**: `src/hooks/useVocabularyStorage.tsx` separa `allWords` (memoria) del render (solo `pageSize:10`). `computeState` calcula fuera del closure y `getFilteredWords` pagina con `slice`

### 3. Estado aislado entre componentes
- **Problema**: `WordCard`, `FilterTabs`, `ProgressBar` llamaban `useVocabularyStorage()` cada uno → estados independientes, `toggleLearned`/filtros no funcionaban
- **Solución**: `VocabularyContext` + `VocabularyProvider` en `src/App.tsx`. `useVocabularyStorage()` usa `useContext`. Hook renombrado a `.tsx` por JSX

### 4. CSV con comillas
- **Problema**: Parseo manual `split(",")` dejaba `"` al final de cada campo
- **Solución**: `papaparse` con `Papa.parse(text,{header:true,skipEmptyLines:true})`. Tras cambiar, limpiar `localStorage` para re-leer CSV

### 5. TTS en Chrome/Brave y selector de voz
- **Problema**: `speechSynthesis` sin sonido con voces Microsoft y voz pobre en Firefox; sin selector
- **Solución**: `getBestVoice()` prioriza `Google en-US` > `en-US` > `en`, `cancel()+setTimeout(50ms)` y `rate 0.85`. Contexto expone `voices/selectedVoice/setSelectedVoice` (`localStorage: vocabulary_voice`). `VoiceSelector.tsx` filtra inglés y puntúa con `scoreVoice()` (descarta `eSpeak/Festival/Robot -100`, `Google +10`, `Natural/Neural/Wavenet +8`, `remota +5`, `en-US +2`, ordena y marca `★`)

### 6. Piper TTS local (sin descarga en cada carga)
- **Problema**: Voces robóticas; `en_US-libritts-high.onnx` no usado y `HuggingFaceVoiceProvider` descargaba de `https://huggingface.co/rhasspy/piper-voices` cada vez
- **Solución**: `piper-tts-web` + `onnxruntime-web` + `vite-plugin-static-copy`. Modelo en `public/piper/en_US-libritts-high.onnx` (131 MB) + `.onnx.json`, WASM (`piper_phonemize.wasm/.data`, `onnx/*.wasm`) copiados a `public/` vía `vite.config.ts`. `src/services/piper.ts` usa `PiperWebEngine` con `LocalVoiceProvider` (`fetch('/piper/en_US-libritts-high.onnx[.json]')` cacheado con `URL.createObjectURL`), sin `HuggingFace`. `isPiperVoice()`/`PIPER_HF_VOICE='en_US-libritts-high'` y primera opción `★ Piper` en selector. En `dist/` queda en `dist/piper/` sin internet tras build

### 7. Modo estudio + dirección
- **Problema**: Tarjetas mostraban EN y ES a la vez, no servían para recitar; faltaba practicar ES→EN
- **Solución**: Estado `studyDirection:"en->es"|"es->en"` en `useVocabularyStorage.tsx` (`localStorage: vocabulary_direction`) y `StudyDirectionToggle.tsx` (`EN→ES`/`ES→EN` junto al buscador). `WordCard.tsx` usa `revealed` local (reset al cambiar dirección/palabra): `en->es` muestra EN+ejemplo y oculta ES tras `Mostrar español`; `es->en` muestra ES y oculta EN+ejemplo tras `Mostrar inglés`. TTS dentro del bloque revelado

### 8. Cabecera definitiva
- **Problema**: Fondos claritos no destacaban sobre `bg-slate-100`; 4 variantes temporales B/C/D generaban ruido
- **Solución**: Fijar **A · Editorial Minimal Sombra+** como definitiva. `src/components/HeaderVariants.tsx` ahora solo exporta `AppHeader`: blanco `bg-white/95 backdrop-blur` + `shadow-[0_12px_32px_rgba(0,0,0,0.10)] sticky top-0` + barra superior `h-[3px] bg-gradient-to-r from-[#751200] via-[#ff6b35] to-[#ffb800]`. Se eliminaron `HeaderB/C/D`, `VariantPicker` y `WhiteHeaderPicker`/`ColorPickerA`

### 9. Pronunciación AmE
- **Problema**: Sin IPA; añadir columna al CSV solo para algunas palabras como prueba y luego al resto
- **Solución**: Nueva columna `pronunciation` en `public/duo_cards_en_export.csv` (`front,back,hint,publishedAt,pronunciation`) con 638 filas IPA AmE (`/ˈkɑbˌwɛb/`, `/ˈtɛndɚ ˈfit/`...). Generadas vía `cmu-pronouncing-dictionary` (ARPAbet→IPA) + 28 manuales. `src/types/vocabulary.ts:7` añade `pronunciation?:string`, `src/data/words.ts:49` la parsea y fusiona automáticamente si `localStorage` antiguo no la tenía (merge por `englishTerm` sin perder `learned`). `WordCard.tsx:56,147` la muestra bajo el inglés en `text-xs font-mono text-slate-500` con etiqueta `AmE` (visible siempre en `EN→ES`, solo en revelado en `ES→EN`)
