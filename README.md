# Dodepecho

PWA local para practicar vocalización con muestras de piano acústico. React + TypeScript estricto + Vite. Sin backend, registro, micrófono, grabaciones, analítica ni servicios externos en tiempo de ejecución.

## Ejecutar

Requiere Node.js 22 o posterior (probado con Node 24) y npm.

```sh
npm ci
npm run dev
```

Abre la dirección que imprime Vite. El servidor de desarrollo permite editar, pero **la caché offline se comprueba con la compilación de producción**:

```sh
npm test
npm run build
npm run preview -- --port 5173
```

Abre `http://localhost:5173/dodepecho/`. Tras cargar completamente una vez, la aplicación puede recargarse y reproducir ejercicios con el servidor apagado. La carpeta `dist/` es estática y no necesita backend.

La versión publicada está en [GitHub Pages](https://jorgeverdu.github.io/dodepecho/). Para probar otro servidor en un teléfono, sirve `dist/` mediante **HTTPS** (o un entorno local seguro en ese dispositivo). Una dirección HTTP de la red Wi-Fi, como `http://192.168.x.x`, permite previsualizar pero normalmente no habilita Service Worker ni instalación.

En iPhone: Safari → Compartir → Añadir a pantalla de inicio. En Android o escritorio: opción Instalar del navegador. Usa siempre el mismo origen: IndexedDB y caché están vinculados a protocolo, dominio y puerto.

## Primera práctica

1. En **Ejercicios**, abre un ejercicio precargado.
2. Elige **Crear rutina con este ejercicio** o añádelo a una rutina existente.
3. Cambia el nombre de la rutina y los parámetros de la instancia: vocalización, tempo, duración, primera nota, extremo del rango, dirección, pausa y paso.
4. Añade otro ejercicio, duplica una instancia o reordena con las flechas.
5. Guarda y pulsa **Comenzar** en la rutina; en el reproductor pulsa **Comenzar** para activar el audio y la cuenta atrás 3–2–1.
6. Usa pausa/continuar, sucesión anterior/siguiente, reiniciar o siguiente ejercicio.

El banco incluye 14 ejercicios: escalas, terceras ascendentes y descendentes, saltos, arpegios mayores, menor y extendido. Puedes duplicar cualquiera, crear patrones nota a nota, editar tus ejercicios y filtrar favoritos. Los ejercicios incluidos se personalizan mediante una copia o como instancia de rutina.

## Decisiones musicales

- MIDI estándar: C4 = 60, A4 = 440 Hz. Nombres C, C#, D… con octava.
- **Primera nota** designa la primera tecla que realmente suena. El motor conserva una base matemática interna para que las rutinas antiguas sigan sonando igual; en `5–4–3–2–1`, elegir C4 hace que suene C4 primero.
- Los límites son las notas reales extremas del patrón, no las tónicas. `1–3–5–8` con máximo C5 termina en base C4.
- Ascendente y descendente vuelve a la base de partida, sin repetir el extremo superior. El descenso simple llega hasta la última base cuyo patrón completo cabe sobre el límite inferior.
- El paso siempre es un número positivo de semitonos; la dirección determina su signo.
- La pausa se expresa en tiempos del BPM. La transición toca base anterior y siguiente durante medio tiempo cada una, con la misma pausa configurada antes y después. No hay metrónomo audible.
- Pausar cancela todas las voces, incluidas las programadas en el futuro. Continuar retoma el inicio del evento interrumpido (nota o pausa); no repite toda la sucesión ni añade otra cuenta atrás.
- El piano usa 30 muestras MP3 de Salamander Grand Piano, alojadas en `public/samples/salamander/`. Antes de la cuenta atrás se descargan y decodifican las muestras necesarias; la PWA precachea todas para uso offline. Las notas intermedias usan la muestra más cercana y `playbackRate`.
- Los saltos manuales empiezan directamente en la primera nota de la sucesión elegida. Si se estaba en pausa, se mantiene la pausa.

## Arquitectura

```text
src/
  types.ts                  Patrones, ejercicios, instancias, rutinas, ajustes
  music/notes.ts            Conversión, intervalos, validación y rangos (funciones puras)
  audio/timeline.ts         Secuencia completa de notas, pausas y transiciones
  music/range.ts            Conversión de primera nota audible y extremo a rango interno
  audio/samples.ts          Selección, carga y caché de muestras
  audio/engine.ts           Web Audio sampleado, fallback y transporte; sin React
  data/catalog.ts          Catálogo inicial
  data/storage.ts          IndexedDB mediante idb; esquema versionado
  components/              Contorno, editores, tarjetas y reproductor
  pages/                   Inicio, banco, rutinas y ajustes
  App.tsx                  Navegación y coordinación de la biblioteca
```

Las instancias hacen una copia profunda del patrón y de toda la configuración. `sourceId` identifica el origen, pero no se usa para resolver los valores durante la reproducción. Los cambios posteriores del banco no afectan a las rutinas existentes.

El motor programa muestras con tiempos absolutos de `AudioContext.currentTime`, con anticipación de 150 ms. Un temporizador de 25 ms repone la cola y actualiza la interfaz; no actúa como reloj musical. Una generación de reproducción invalida inicios asíncronos antiguos. Las notas expiradas tras un retraso del navegador no se reproducen juntas como una cola atrasada.

El sonido normal usa muestras de piano con una envolvente breve de ataque y liberación; los tres parciales sinusoidales anteriores solo sirven de respaldo si falla una muestra. El contorno y la nota actual se derivan de la misma secuencia y del mismo reloj que el audio. Los patrones largos permiten desplazamiento horizontal y mantienen visible el punto activo.

Screen Wake Lock se solicita durante la reproducción, se libera al pausar/salir y se vuelve a solicitar al regresar a la pestaña. Si no está disponible o el navegador lo deniega, la aplicación sigue funcionando. La compatibilidad del audio en segundo plano depende del navegador y del sistema.

Vite PWA genera manifest, iconos PNG, Service Worker y precaché de todos los recursos locales. No se fuerza una actualización de la aplicación durante una práctica. El tema puede seguir al sistema, ser claro u oscuro.

## Créditos de audio

Salamander Grand Piano · Alexander Holm · [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Grabaciones originales: [Salamander Grand Piano V3](https://archive.org/details/SalamanderGrandPianoV3). Se incluye un subconjunto MP3 distribuido por [Tone.js](https://tonejs.github.io/audio/salamander/), con transposición de las notas intermedias. Consulta [ATTRIBUTION.md](public/samples/salamander/ATTRIBUTION.md).

## Validación realizada

- Tests unitarios: selección y caché de muestras, `playbackRate`, conversión de rango, compatibilidad de rutinas antiguas, persistencia de IndexedDB, transiciones, pausa/reanudación y cancelación de notas pendientes.
- `npm run build`: TypeScript estricto y compilación PWA correctos.
- Flujo comprobado en el navegador: seleccionar ejercicio, crear rutina, editar parámetros de una instancia, duplicar, guardar, recargar, iniciar, pausar, continuar, volver una sucesión, reiniciar y cambiar de ejercicio.
- Carga offline comprobada deteniendo el servidor de producción, confirmando que no respondía y recargando la PWA. La rutina persistida abrió y comenzó su reproducción.
- La calidad percibida y el volumen final deben comprobarse también en un teléfono real.

## Qué probar primero en dispositivos reales

1. **iPhone/Safari y Android/Chrome:** instalación desde HTTPS, cierre completo y reapertura en modo avión.
2. **Audio:** escucha el ataque/decay y la transición cromática; comprueba latencia visual usando el altavoz y luego auriculares Bluetooth (estos pueden añadir latencia propia).
3. **Transporte:** pausa durante una nota y durante una transición, continúa y cambia de sucesión rápidamente; no deben quedar notas superpuestas.
4. **Rango:** arpegio de octava, primera nota C3 y nota más aguda C5; ninguna nota debe superar C5.
5. **Pantalla activa:** deja sonar una rutina con la app en primer plano; prueba también pasar a otra aplicación y regresar.
6. **Independencia:** coloca el mismo ejercicio en dos rutinas, modifica una y luego el original; las otras instancias deben conservar sus valores.

Pendiente de validación manual: calidad sonora percibida, instalación en teléfonos físicos, latencia Bluetooth y Wake Lock en cada dispositivo. No se han incorporado funcionalidades fuera del MVP. Borrar datos del navegador elimina las rutinas; no hay sincronización ni exportación en esta versión.


## Segunda iteración

- Nombre visible, título y manifest: **Dodepecho**. La carpeta, el paquete y la base IndexedDB conservan sus nombres técnicos para mantener compatibilidad.
- Nuevos defaults: Tres notas 85; Cinco notas 80; Cinco notas descendentes 80; Arpegio mayor 75; Arpegio de octava 72; Escala de octava 80; Terceras ascendentes 88; Terceras descendentes 85; Salto de quinta 75; Salto de octava 70; Arpegio extendido 70; Arpegio descendente 75; Arpegio menor 72; Escala ligada 85 BPM.
- La migración de catálogo se ejecuta una sola vez al abrir. Solo cambia el BPM de los IDs incluidos conocidos que conservan 100 BPM; mantiene todos los demás campos, ejercicios personalizados y rutinas. El marcador `catalogVersion` se guarda en la misma transacción que los datos. Un tempo cambiado posteriormente a 100 se conserva. No hace falta limpiar IndexedDB.
- Secuencia: **patrón → pausa → base antigua → base nueva → pausa → patrón**. Cada pausa dura `60 / BPM × pausaBeats` segundos. Cada nota de transición ocupa medio tiempo, independientemente de la pausa. Con pausa cero no se añaden silencios.
- Articulación fija al 88 % para todas las notas, incluidas las de transición, sin control editable. Los valores antiguos permanecen en los datos por compatibilidad pero no determinan el sonido.
- Los botones anterior/siguiente siguen comenzando en la primera nota de la sucesión elegida. Los cambios de tonalidad posteriores mantienen ambas pausas. La pausa final del ejercicio se conserva como en la primera iteración.
- Validación: 38 tests, incluidos tiempos de audio en las tres direcciones, saltos adelante/atrás y cancelación de eventos futuros al pausar antes, durante y después de la transición. TypeScript estricto y build PWA correctos.

Si una pestaña muestra todavía la versión anterior, ciérrala y vuelve a abrir la aplicación para que se active el Service Worker actualizado. No borres los datos del sitio.
