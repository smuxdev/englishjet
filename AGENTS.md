# English Jet - Problemas y Soluciones Encontradas

## Descripción del Proyecto
English Jet es una aplicación web para aprender vocabulario en inglés:
- Palabras con traducción al español, ejemplo y pronunciación IPA (AmE)
- Marcar como aprendida/pendiente, filtros y paginación (10/página)
- Modo estudio: oculta la traducción hasta revelar, practicable EN→ES y ES→EN
- Sesión de estudio: flashcards de lo que toca hoy (tamaño configurable 10/20/30/50), «La sabía/Aún no», falladas reencoladas, resumen final
- Repetición espaciada Leitner: cajas 0-5, intervalos 1/3/7/14/21 días, «Repasar hoy (N)», dominada = caja 5
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

### 10. Revisión técnica completa (2026-08-24)
- **Bundle inicial de 45 MB**: `piper-tts-web` (embebe onnxruntime + transformers) se importaba estáticamente → todo al chunk principal. Ahora `src/services/piper.ts` lo carga con `import()` dinámico al primer uso. Bundle inicial: 183 KB (59 KB gzip)
- **`vite-plugin-static-copy` roto en silencio**: copiaba a `dist/onnx/node_modules/piper-tts-web/...` en vez de `dist/onnx/`; producción solo funcionaba por copias manuales duplicadas en `public/`. Arreglado con `rename: { stripBase: true }` en `vite.config.ts` y eliminados los duplicados de `public/onnx|worker` y los wasm de `public/piper` (byte-idénticos a los de node_modules; ahora una sola fuente de verdad que sigue la versión del paquete)
- **localStorage guardaba la lista completa de palabras** (`vocabulary_words`): los cambios del CSV nunca llegaban a usuarios existentes. Ahora solo se persiste el progreso (`vocabulary_learned`, array de términos aprendidos) y el CSV se lee siempre; migración automática del formato antiguo sin perder progreso (`src/data/words.ts`). `id` de palabra = `englishTerm` (sin duplicados en el CSV), estable ante reordenaciones
- **Búsqueda solo buscaba en la página actual**: filtraba sobre el slice de 10 ya paginado. Ahora filtro+búsqueda+paginación viven en el contexto y se derivan con `useMemo` sobre todas las palabras; la paginación funciona también durante la búsqueda
- **Filtro desincronizado al arrancar**: el provider leía `vocabulary_filter` de localStorage pero `MainLayout` arrancaba siempre en "all". El filtro ahora es estado del contexto, persistido y validado (igual que `vocabulary_direction`, que se casteaba sin validar)
- **Hook partido para Fast Refresh**: `src/hooks/vocabularyContext.ts` (contexto + tipos + `useVocabularyStorage`) y `src/hooks/VocabularyProvider.tsx` (provider). Eliminados `computeState`/`getFilteredWords` duplicados y el `setState` síncrono en efecto de `WordCard` (reset de `revealed` vía `key` con dirección en `MainLayout`)
- **Dependencias**: `@types/react(-dom)` 19 con React 18 → alineados a ^18.3; `onnxruntime-web` directo eliminado (no se importa; `piper-tts-web` trae el suyo); `vite-plugin-static-copy` movido a devDependencies; `autoprefixer`/`postcss` + `postcss.config.js` eliminados (Tailwind v4 via `@tailwindcss/vite` ya prefija con Lightning CSS); `tailwind.config.js` eliminado (v4 no lo lee sin `@config` y sus tokens no se usaban)
- **`strict: true`** en `tsconfig.app.json` (compila limpio); `piper.d.ts` tipado en vez de `declare module` opaco; eliminado el `any` del map de tarjetas
- **Código muerto eliminado**: `SimpleTest.tsx`, `SearchBar.tsx`, `App.css` (no importado), `src/assets/*` (hero.png, react.svg, vite.svg), variantes oscuras muertas de `VoiceSelector`/`ProgressBar` (prop `variant`)
- **TTS**: `speakNative` consolidado en `src/services/piper.ts` (estaba duplicado en `WordCard`); leak de blob URL en `onerror` arreglado; init de Piper reintentable si falla; listener `voiceschanged` con `addEventListener` + cleanup
- **Robustez**: estados de carga/error del CSV visibles en UI; `fetch` comprueba `res.ok`; `saveLearnedTerms` tolera localStorage lleno; `index.html` con `lang="es"`, título y meta description; oxlint ignora `public/`/`dist/`

### 11. Sesión de estudio (flashcards) (2026-08-24)
- **Problema**: la UI era un navegador de fichas (grid + revelar + marcar a mano); nada guiaba el estudio ni evaluaba recall activo
- **Solución**: botón «Estudiar (N pendientes)» junto al ProgressBar → `src/components/StudySession.tsx` sustituye el `<main>` (estado `studying` en `MainLayout`, sin router). Deck: snapshot de `pendingWords` (nuevo en el contexto, `useMemo` en `VocabularyProvider`), shuffle Fisher-Yates, cap 20. Flashcards una a una con `src/components/StudyCard.tsx` (presentacional; IPA AmE + TTS reutilizando `speakPiper`/`speakNative`): revelar → «✗ Aún no / ✓ La sabía». Reglas: acierto **a la primera** → `toggleLearned` (persistido al instante); fallada → se reencola **al final** y aunque luego acierte sigue pendiente (volverá en la próxima sesión). Dirección EN↔ES fijada al iniciar. Atajos: Espacio=revelar, 1=Aún no, 2=La sabía (ignorados sobre input/select; guarda `canAnswer` ref contra doble respuesta con closure obsoleto que des-aprendería). Progreso `x/total` = únicas completadas. Resumen final: total/aciertos a la primera/lista EN+ES de falladas + «Repetir falladas», «Otra ronda» (si quedan pendientes) y «Terminar». Salir a mitad no pierde nada (persistencia por-respuesta). Verificado E2E con Firefox headless + geckodriver (7 checks: inicio, oculta respuesta, acierto→localStorage, fallo no avanza, atajos, salir conserva progreso)

### 12. Repetición espaciada Leitner (2026-08-24)
- **Problema**: la sesión marcaba aprendida con un solo acierto; sin repaso programado, lo «aprendido» se olvida y nunca vuelve a aparecer
- **Solución**: cajas Leitner 0-5 sobre la sesión de estudio. `Word` gana `box` (0=nueva, 5=dominada; `learned` derivado de `box===5`) y `due` (YYYY-MM-DD). Intervalos al entrar en caja: 1→+1d, 2→+3d, 3→+7d, 4→+14d, 5→+21d (`INTERVAL_DAYS` en `src/data/words.ts`). Acierto a la primera → sube de caja (`promote`); primer fallo → caja 1 con due hoy (`demote`); las cajas 5 también vencen (+21d) y un fallo las des-domina. Deck de sesión = `dueWords` (nuevas + revisiones vencidas), revisiones priorizadas sobre nuevas antes del cap 20. Botón «Repasar hoy (N)» / «Al día ✓». Persistencia `vocabulary_progress` (mapa término→{box,due}, solo box>0) con migración automática desde v2 `vocabulary_learned` (→caja 5) y v1 `vocabulary_words`. Toggle manual del grid: dominada↔nueva. UI: ProgressBar apilada (dominadas granate + en repaso ámbar) con desglose «X dominadas · Y en repaso · Z nuevas»; `BoxDots` (5 puntos) en WordCard muestra la caja. Verificado E2E (8 checks): intervalos correctos en localStorage, fallo→caja 1 due hoy, conteo de due tras sesión, migración v2 y toggle manual

### 13. Tamaño de sesión configurable (2026-08-24)
- **Problema**: sesiones fijas de 20 palabras
- **Solución**: selector «N / sesión» (10/20/30/50, `SESSION_SIZES` en `src/hooks/vocabularyContext.ts`) junto al botón «Repasar hoy». Persistido en `localStorage: vocabulary_session_size` (validado contra la lista, fallback 20). `buildSession` recibe el tamaño; «Otra ronda»/«Repetir falladas» lo respetan. E2E actualizado (cambio a 10 → sesión 0/10 y clave persistida)

### 14. Edición de palabras con persistencia en el CSV (2026-08-24)
- **Problema**: corregir un término, traducción o ejemplo exigía editar el CSV a mano
- **Solución**: botón lápiz en cada tarjeta → formulario inline (EN/ES/ejemplo) con validación (obligatorios EN y ES, término duplicado rechazado). El navegador no puede escribir ficheros: `csvEditApi` en `vite.config.ts` expone en el dev server `GET /api/csv-editable` (204) y `POST /api/save-csv` (valida cabecera y tamaño, reescribe `public/duo_cards_en_export.csv`); `server.watch.ignored` evita el full-reload al guardar. `src/services/csvStore.ts`: probe (exige **204 exacto** — el fallback SPA de un estático responde 200 con index.html y daría falso positivo) y `saveCsvToServer` con `Papa.unparse` (round-trip byte-idéntico verificado: los diffs de git son solo las filas editadas). `editWord` en el provider: write-through — primero escribe el CSV y solo si confirma actualiza memoria; al cambiar el término EN, el `id` pasa al nuevo front, el progreso Leitner se re-persiste bajo la nueva clave (saveProgress pasa a clavear por `id`) y la IPA se descarta (pertenece al término anterior). En build estático el endpoint no existe → botones de edición ocultos. Eliminado el sentinel «No example provided» del loader (16 filas sin hint; habría acabado escrito en el CSV) — el fallback «Sin ejemplo» es de presentación y el botón de audio se oculta si no hay ejemplo. E2E: suite dev (6 checks: probe, edición+persistencia tras recarga, migración de progreso, duplicado rechazado) + assert en la suite estática de que la edición queda oculta

### 15. Modo escritura (typed recall) (2026-08-24)
- **Problema**: la autoevaluación («La sabía») permite autoengaño; escribir la respuesta es recall más profundo
- **Solución**: toggle Tarjetas/Escribir (`StudyModeToggle.tsx`, `localStorage: vocabulary_study_mode`, fijado al iniciar sesión como la dirección). `src/services/answer.ts`: `checkAnswer(input, target)` → ok/almost/fail; normaliza (minúsculas, sin diacríticos, espacios, puntuación envolvente), el target se parte por `,;/` (alternativas del CSV: «dar la lata, molestar»), Levenshtein ≤1 = «casi» (cuenta acierto, muestra corrección) solo en alternativas ≥4 chars. En sesión: input autofocus + Comprobar (Enter); fallo muestra la respuesta y «Continuar» (consuma la transición Leitner); atajos 1/2 desactivados en escritura. `StudyCard` gana `showRevealButton`

### 16. Audio automático en sesión (2026-08-24)
- **Solución**: toggle «🔊 auto» en la cabecera de sesión (`vocabulary_autoplay`, default off). EN→ES pronuncia el término al aparecer la tarjeta; ES→EN al revelarse. Efecto en `StudySession` con `spokenRef` (clave `id:front|back`) para no repetir en re-renders ni en el doble efecto de StrictMode; fire-and-forget sobre speakPiper/speakNative

### 17. Alta/borrado de palabras + campo IPA con sugerencia (2026-08-24)
- **Solución**: `WordForm.tsx` compartido (edición y alta «+ Añadir palabra», solo canEdit/dev): EN/ES/ejemplo + **IPA editable** pre-rellenada — renombrar EN ya no descarta la IPA (`WordEdit.pronunciation`). Botón «Sugerir»: `src/services/ipa.ts` con `cmu-pronouncing-dictionary` (dep nueva, chunk lazy ~3.6MB solo al pulsar) + conversor ARPAbet→IPA con onsets legales para colocar ˈ/ˌ (verificado contra las IPA existentes: cobweb/nuisance/vultures idénticas; monosílabos sin marca por convención). `addWord` (box 0, due hoy, al principio del grid) y `deleteWord` (confirm inline en el formulario; su progreso desaparece al re-persistir el mapa), ambos write-through al CSV como editWord

### 18. Estadísticas de estudio (2026-08-24)
- **Solución**: `src/data/activity.ts` — `vocabulary_activity` (fecha → {reviewed, correct}, validado) escrito desde el cuerpo de `reviewWord` (nunca en updaters: StrictMode los dobla; el log se consuma en «Continuar»/respuesta, no en el submit). Contexto expone `stats` (useMemo): racha (anclada en hoy o ayer si aún no se estudió), hoy repasadas/aciertos, distribución por cajas, vencimientos mañana/7 días. `StatsPanel.tsx` colapsable bajo la ProgressBar con resumen inline (🔥 racha · hoy x/y)

### 19. Rediseño visual estilo Your Daily American (2026-08-24)
- **Problema**: aspecto demasiado plano, sin color ni iconos
- **Solución**: sistema visual tomado de yourdailyamerican.com (tema Astra; colores muestreados del CSS real). Tokens en `src/index.css` con `@theme` de Tailwind v4: `ink #1b2d45` (titulares), `body #3e5068`, `primary #046bd2` / `primary-dark #045cb4`, `accent #d94452` (CTA rojo), `wash #f0f5fa`, `mastered #2e7d32`, `review #c47015`. Tipografías Google Fonts (`index.html`): **Lato** para titulares (`font-display`) y **Roboto Flex** como sans por defecto (offline degrada a system-ui). Rasgos: cabecera blanca con tile ✈️ pastel, logo `English·Jet` con acento rojo y kicker en mayúsculas con rayita; barra superior de 3px degradada; banda hero con degradado suave azul→rosa; **tarjetas con barra superior de color por estado** (nueva=azul, en repaso=naranja, dominada=verde) + círculo decorativo pastel (patrón de las track-cards de YDA); BoxDots del color de estado; filtros pills con emoji (📚/✅/🕑); CTA rojos con flecha; StatsPanel con tiles de emoji (🔥🗂️📅); resumen de sesión en **tarjeta navy oscura** con CTA rojo; botones de respuesta rojo/verde; ProgressBar apilada verde+naranja. Erradicado el granate `#751200`. Ambas suites E2E en verde tras el rediseño

### 20. Alta de palabra en modal (2026-08-24)
- **Solución**: `src/components/Modal.tsx` genérico (overlay navy con blur, cierre por Escape/clic fuera/✕, scroll de fondo bloqueado, `role=dialog`). «+ Añadir palabra» abre el `WordForm` dentro del modal (prop `bare` para quitar el marco de tarjeta). La edición sigue inline en la tarjeta (contextual). Suite dev E2E en verde sin cambios

### 21. Fijación de vocabulario: transferencia a la lectura real (2026-08-24)
- **Problema**: el usuario reconocía la tarjeta pero no la palabra al leerla en un libro (memoria dependiente del contexto / especificidad de codificación)
- **Solución** (4 mecanismos con base en la literatura — cloze, variabilidad de codificación, dificultades deseables, efecto de generación):
  - **Frases rotadas**: `Word.examples` = hint + extras del sidecar `public/extra_examples.csv` (fetch tolerante a 404). `scripts/fetch-examples.mjs` (`npm run fetch:examples`, requiere curl+bunzip2) genera el sidecar desde el export inglés de Tatoeba (CC-BY, ~2M frases, stream): 1948 frases, 531/638 términos, máx 4/término, 30-90 chars, sin duplicar el hint. `buildSession` fija una frase aleatoria por tarjeta (`SessionCard.example`) → contexto distinto entre sesiones
  - **Frente sin muleta**: en sesión EN→ES el frente muestra solo palabra+IPA; la frase (rotada) aparece al revelar como refuerzo en ambas direcciones (la frase en el frente hacía de pista y se memorizaba la tarjeta)
  - **Modo Contexto (cloze)**: `StudyMode` gana "cloze" («Contexto»). `services/cloze.ts`: `findOccurrence(sentence, term)` con flexiones (-s/-es/-ed/-ing/-ies, e-drop), candidatos por longitud desc, límites `(?<![A-Za-z'])`, multi-palabra con primera palabra flexionada; enmascara TODAS las ocurrencias y devuelve `parts` para resaltar al revelar. Corrección dual (lema o forma superficial, mejor verdict). Sin ocurrencia → la tarjeta cae a escritura ES→EN. Ignora dirección; autoplay pronuncia la frase completa al revelar
  - **Frase propia**: `data/mySentences.ts` (`vocabulary_my_sentences`, validación: ≥10 chars y contener el término vía `findOccurrence`). Input por fallada en el resumen final (único punto de UI, no rompe el ritmo); la frase entra en el pool de rotación con etiqueta «✍ tu frase»
- E2E ampliada a 15 checks (frente sin muleta, cloze con hueco+pista+resalte, frase propia validada y persistida)
