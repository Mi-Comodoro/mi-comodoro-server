# Base de datos: conexión, pool y migraciones

PostgreSQL con TypeORM (`synchronize: false`). La configuración del pool está en
`src/core/config/database/pool.config.ts` y se ajusta por variables de entorno (sin secretos).

## Variables

| Variable | Defecto | Para qué |
|---|---|---|
| `DB_POOL_MAX` | 10 | Conexiones máximas **por proceso** |
| `DB_POOL_IDLE_TIMEOUT_MS` | 30000 | Cierra conexiones ociosas |
| `DB_CONNECTION_TIMEOUT_MS` | 5000 | Si no hay conexión libre en este tiempo, la petición falla en vez de colgarse |
| `DB_STATEMENT_TIMEOUT_MS` | 30000 | Cancela consultas que tardan más (consultas desbocadas, falta de índice) |
| `DB_LOCK_TIMEOUT_MS` | 10000 | Espera máxima por un bloqueo (p. ej. el del presupuesto en gastos y aportes simultáneos) |
| `DB_IDLE_IN_TRANSACTION_TIMEOUT_MS` | 30000 | Libera conexiones con una transacción abierta e inactiva |
| `DB_SLOW_QUERY_MS` | 1000 | Registra en el log las consultas más lentas que esto |
| `DB_SSL` / `DB_SSL_REJECT_UNAUTHORIZED` | `false` / `true` | TLS hacia Postgres (obligatorio si la base es administrada y remota) |
| `DB_MIGRATIONS_RUN` | `true` fuera de producción, `false` en producción | Aplicar migraciones al arrancar |

Los valores inválidos o fuera de rango se ignoran y se usa el defecto.

## Cómo dimensionar el pool

`instancias de la API × DB_POOL_MAX ≤ ~80 % de max_connections` de Postgres (el resto es para migraciones,
respaldos y administración). Con una instancia y 10 conexiones sobra margen (Postgres trae 100 por defecto).
Al pasar a varias instancias, o a un Postgres administrado con pocas conexiones, poner **PgBouncer en modo
transacción** delante y bajar `DB_POOL_MAX` por instancia.

Los tiempos límite son una red de seguridad, no una solución: si aparecen errores `statement timeout` o
`lock timeout`, hay que mirar la consulta o la contención, no subir el límite sin más.

## Migraciones

- En **producción** se aplican en el despliegue (`pnpm migration:run`, ver `.github/workflows/deploy-*.yaml`), no al
  arrancar: con varias instancias o reinicios simultáneos competirían entre sí.
- En local se aplican al arrancar (`DB_MIGRATIONS_RUN` sin definir).
- Toda migración nueva debe agregarse a `src/database/migrations.registry.ts`. La prueba
  `migrations.registry.spec.ts` falla si un archivo de `src/database/migrations` no está registrado
  (antes `AddTimezoneToUsers` se quedó fuera del arranque y solo se aplicaba por el despliegue).
- Antes de migrar en producción hay un respaldo (ver `docs/BACKUPS.md`).

## Cierre ordenado

`app.enableShutdownHooks()` hace que al recibir `SIGTERM`/`SIGINT` (reinicio de PM2) Nest cierre los módulos y se
vacíe el pool de Postgres, en lugar de dejar conexiones colgadas.
