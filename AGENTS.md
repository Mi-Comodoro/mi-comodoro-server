# AGENTS.md

API de Mi Comodoro: NestJS 11, TypeORM y PostgreSQL, arquitectura hexagonal por módulo. La consume el BFF de `finhub-dashboard`.

## Comandos

- `pnpm install --frozen-lockfile` (Node `>=26.13 <27` según `.nvmrc`)
- `pnpm start:dev` (watch; puerto `APP_PORT`, por defecto 9000; prefijo `/api/v1`; Swagger en `/api-docs`)
- `pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm test:ci` · `pnpm build`
- `pnpm migration:generate src/database/migrations/<Nombre>` (TypeORM 0.3: la ruta es posicional, no existe `--name`) · `pnpm migration:run` · `pnpm migration:revert` · `pnpm seed:categories`
- El hook pre-commit corre lint, prettier y TODA la suite de pruebas con `--bail` (2 a 3 min). El CI corre eslint, `tsc --noEmit`, `test:ci` y build.

## Entorno

Las variables están en `.env.example` (fuente única). Nunca valores reales en el repo.

## Flujo de trabajo

- Ramas desde `develop` y PR a `develop` (check `ci` obligatorio); nunca push directo. `main` es producción.
- Ramas `feat/`, `fix/`, `chore/`, `ci/` + descripción corta. Commits Conventional Commits en español.
- El push a `develop` despliega solo (runner propio): respaldo previo, `pnpm migration:run` y reinicio con PM2. En producción las migraciones NO corren al arrancar (`DB_MIGRATIONS_RUN`).

## Notion

Tareas, estado, decisiones, hallazgos y roadmap van en Notion (MCP), nunca en el repo: página «🚀 Mi Comodoro — Project Tracker», base «Roadmap de tareas». Este repo solo guarda lo que no se deduce leyendo el código.

## Arquitectura

Módulos en `src/modules/api/modules/<módulo>/{domain,application/services,infrastructure/{controller,database/entities,dto,mapper,repositories}}`.

- Repositorios por token string: `@Inject('XRepository')` y `{ provide: 'XRepository', useClass: XRepositoryImpl }`. Los servicios usan las interfaces del dominio.
- Controllers sin lógica ni persistencia. No envolver las respuestas a mano (`ResponseInterceptor` devuelve `{ success, data }`). Errores con excepciones de NestJS, nunca `throw new Error`.
- Todo endpoint lleva `@UseGuards(AuthGuard('jwt'))` salvo los públicos explícitos; los de admin además `RolesGuard` y `@Roles('admin')`. Swagger obligatorio.
- Mappers `toDomain`/`toEntity`; nunca mapear `id` en la creación; relaciones con entidades proxy.
- Logs con `LoggerProviderService` y contexto `ClassName.name`. El idioma de los mensajes de log no está decidido: mantener el del archivo que se edita.

## Dinero y concurrencia

- Dinero en `NUMERIC(12,2)`; nunca floats.
- Toda operación que valide saldo (gasto, pago, aporte) va dentro de `dataSource.transaction`: primero `lockBudgetRow(manager, budgetId)`, luego los totales leídos con el mismo manager y `assertSufficientBalance` o `assertPlannedExpenseFits` (`transactions/domain/budget-balance.ts`). Los inserts de esa transacción van con el mismo manager, para que sean atómicos.

## Base de datos

- `synchronize` siempre `false`. Toda migración nueva se agrega a `src/database/migrations.registry.ts` (una prueba falla si falta).
- El esquema casi no tiene FK hacia `users`: toda tabla nueva con un id de usuario se añade a `AccountDeletionService.purgeUser` y a `DataExportService`, o el borrado de cuenta falla o deja huérfanos.
- Respaldos y restauración: `docs/BACKUPS.md`. Pool y tiempos: `docs/DATABASE.md`.

## Datos personales

- Nada identificable en logs (correo, teléfono, usuario, búsquedas, query strings): lo verifica `logs-sin-datos-personales.spec.ts`. Ver `docs/LOGS.md`.
- El límite de tasa cuenta por usuario (`resolveThrottleTracker`). La IP real solo llega si el BFF la reenvía y `TRUST_PROXY` está configurado.
- La aceptación de la política de datos está apagada por defecto (`LEGAL_CONSENT_REQUIRED`). Ver `docs/LEGAL.md` y `docs/PRIVACY.md`.
- La beta es por invitación: el registro exige una invitación aprobada cuando `BETA_INVITE_REQUIRED` está activo (apagado por defecto). Ver `docs/BETA-ACCESS.md`.

## Trampas conocidas

- En Windows, `autocrlf` genera avisos de saltos de línea; los `.sh` se fuerzan a LF (`.gitattributes`).
- En Jest, importar `firebase-admin` falla (ESM): se mockea (ver `account-deletion.service.spec.ts`).
- `health` es solo liveness; la salud financiera vive en `analytics`.
- La carpeta `incomes/infrstructure` conserva un typo histórico: no renombrar sin corregir los imports.
- `.agents/` es la fuente de agentes; `.claude/agents` es una copia ignorada por git (`pnpm agents:sync`).
