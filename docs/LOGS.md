# Qué se puede escribir en los logs

Los logs no deben permitir identificar a una persona ni reconstruir sus datos (Ley 1581: minimización). Un log que
filtra datos personales es un incidente de seguridad en potencia: los logs se copian, se rotan y se comparten al depurar.

## Permitido
- Identificadores internos (UUID: `userId`, `budgetId`, `goalId`…). No identifican a nadie por sí solos y permiten
  depurar. Si se necesita anonimizar más, se hace en la herramienta que consulta los logs.
- Método, **ruta sin query string**, estado HTTP, duración, nombres de clases y de pasos.
- Valores de catálogo que no son datos personales (segmento de un anuncio, tipo de movimiento, versión de política).

## Prohibido
Correo, teléfono, nombre, nombre de usuario (`@handle`), IP, contraseñas, tokens (acceso, refresco, Firebase),
cuerpos de peticiones, **query strings** (`?phone=…`, `?q=…`) y textos que la persona escribió (búsquedas,
descripciones, notas).

## Cómo se hace cumplir
- `src/common/utils/__tests__/logs-sin-datos-personales.spec.ts` revisa el código fuente: falla si una llamada a
  `logger.*` interpola `email`, `phone`, `handle`, `displayName`, `password`, `refreshToken`, `idToken` o `query`,
  o escribe `email=`, `phone=`, `password=` o `token=`. Si salta, quita el dato del mensaje (usa el UUID).
- Los interceptores de registro de peticiones usan `pathOnly()` (`src/common/utils/log-url.ts`): solo la ruta.

## Fuera de alcance de esta regla
- La tabla `audit_logs` guarda la IP a propósito (seguridad y auditoría de administración). Su plazo de conservación
  está pendiente de definir en la política de datos.
- Los registros de acceso del servidor web o del proxy (Nginx) y los logs de PM2 deben revisarse aparte: pueden
  contener la IP y la URL completa.
