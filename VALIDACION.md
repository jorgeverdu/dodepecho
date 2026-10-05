# Primera iteración · comprobaciones

Resultado automatizado: 18 pruebas correctas en 4 archivos. Compilación TypeScript + Vite + generación de Service Worker correcta.

Resultados de navegador:

- Rutina con dos copias de Tres notas, vocalización MA, 120 BPM, rango C3–F#3, ascendente y descendente.
- Cinco sucesiones: C3, C#3, D3, C#3, C3.
- Persistencia verificada mediante recarga.
- Cuenta atrás 3, pausa, continuar, retroceso D3 → C#3, reinicio a C3 y salto al segundo ejercicio comprobados.
- Aplicación recargada con el servidor detenido: biblioteca y reproductor disponibles desde caché. Rutina completada al 100 %.
- Arpegio personal 1–3–5–8–5–3–1 creado, guardado y marcado como favorito sin conexión.
- Banco original verificado: Tres notas conserva MU, 100 BPM y C3–C5.
- Revisión visual a 390 × 844 y 1280 × 900, sin desbordamiento horizontal.

No equivale a una prueba auditiva de calidad del sonido ni a una certificación de compatibilidad de todos los navegadores móviles. Ver la lista manual del README.


# Segunda iteración · Dodepecho

- 38 pruebas correctas en 5 archivos; TypeScript y build PWA correctos.
- Secuencia y timestamps del scheduler comprobados: patrón → pausa → transición → pausa → patrón, en ascenso, descenso e ida/vuelta.
- Saltos anterior/siguiente probados en las tres direcciones.
- Pausa antes, durante y después de la transición: cancela también voces futuras, no programa durante la pausa y termina sin temporizadores huérfanos.
- Pausas de igual duración, transición independiente de la pausa, pausa cero y articulación fija al 88 %.
- Migración idempotente: conserva favoritos, ajustes, copias personales, tempos modificados y rutinas existentes; actualiza únicamente defaults antiguos del banco.
- Navegador existente: título Dodepecho, 14 defaults actualizados, ejercicios personales a 100 BPM conservados y control de articulación ausente. Las rutinas existentes siguen disponibles.
