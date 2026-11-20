# Mi Comodoro Server

API de Mi Comodoro para finanzas personales y del hogar: autenticación, presupuestos, ingresos, gastos, ahorros, cuentas, grupos y análisis. Hecha con NestJS, TypeORM y PostgreSQL; la consume el BFF de `finhub-dashboard`.

## Requisitos

- Node.js `>=26.13 <27` (`nvm use` lee `.nvmrc`)
- pnpm 11 (`corepack enable`)
- PostgreSQL accesible con las credenciales de `.env`
- Credenciales de Firebase Admin (autenticación con Google)

## Levantarlo

```bash
pnpm install
cp .env.example .env   # completa base de datos, JWT y Firebase
pnpm migration:run     # crea el esquema (synchronize está desactivado)
pnpm start:dev
```

La API queda en `http://localhost:9000/api/v1` (puerto `APP_PORT`) y Swagger en `/api-docs`. Todas las variables y sus valores por defecto están en `.env.example`.

## Probarlo

```bash
pnpm test          # pruebas
pnpm exec tsc --noEmit
pnpm lint
```

El CI corre eslint, `tsc --noEmit`, `pnpm test:ci` y `pnpm build`. El hook pre-commit corre lint, prettier y toda la suite.

## Migraciones

`pnpm migration:generate src/database/migrations/<Nombre>`, `pnpm migration:run` y `pnpm migration:revert`. Toda migración nueva se agrega a `src/database/migrations.registry.ts`.

## Desplegar

Un push a `develop` despliega en el servidor mediante un runner propio: respaldo de la base, `pnpm migration:run` y reinicio con PM2. `main` es la rama de producción.

## Más información

- [AGENTS.md](AGENTS.md): convenciones y reglas de trabajo.
- [Respaldos](docs/BACKUPS.md) · [Base de datos](docs/DATABASE.md) · [Política de datos](docs/LEGAL.md) · [Privacidad](docs/PRIVACY.md) · [Logs](docs/LOGS.md)
