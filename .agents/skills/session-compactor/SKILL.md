---
name: session-compactor
description: Resume las decisiones y próximos pasos de la sesión en máximo 10 líneas y los guarda en Notion. Úsala al cerrar una sesión de trabajo.
---

# Cierre de sesión

La memoria de tareas, decisiones y hallazgos vive en Notion (página «🚀 Mi Comodoro — Project Tracker», base «Roadmap de tareas»). No crear bitácoras ni historiales en el repositorio.

## Pasos

1. Reunir solo lo que no se deduce del código ni de git: decisiones (con su porqué), bloqueos y próximos pasos.
2. Redactar como máximo 10 líneas.
3. Anexarlo al cuerpo de la tarjeta del Roadmap que se trabajó. Si no hay tarjeta o no está claro dónde, preguntar antes de crear algo.
4. Cambiar el estado de la tarjeta solo si está verificado y el autor lo aprobó. Nunca marcar «desplegado» sin comprobarlo en el servidor.
5. Si Notion no está disponible, entregar el resumen en el chat y avisar que no quedó guardado.

## Formato

```
AAAA-MM-DD · rama
Hecho: …
Decisiones: … (porque …)
Pendiente: …
Siguiente paso: …
```

## Reglas

- Solo lo verificado; si algo no se probó, decirlo.
- Sin secretos ni datos personales (nombres, correos, datos de clientes).
- No copiar diffs, logs ni la conversación.
- Si no hubo decisiones ni cambios, no escribir nada.
- Si una línea «Pendiente» anterior ya no es cierta, corregirla en lugar de añadir otra.
- Usar la URL exacta que devuelve la búsqueda de Notion, no un ID copiado a mano.
