# Mi Comodoro Backend - Context & Standards

## Entorno de desarrollo

- **Node.js requerido: v22.11.0** (definido en `engines.node` de package.json)
- **Package manager: npm**
- Verificar versión activa: `node --version`
- Cambiar con nvm: `nvm use` (lee .nvmrc automáticamente)

## Stack y versiones actuales

| Tecnología   | Versión  |
|--------------|----------|
| NestJS       | 11.1.18  |
| TypeORM      | 0.3.28   |
| TypeScript   | 5.x      |
| PostgreSQL   | —        |
| Node.js      | 22.11.0  |

## Project Context

FinTech backend for personal finance management using NestJS, PostgreSQL, and Hexagonal Architecture.

## Architecture: Hexagonal (Per Module)

Each module in `src/modules/api/modules/` must follow:

- `domain/`: Business logic, `[entity].ts` (interface), `enums/`, and `repositories/[entity].repository.ts` (interface).
- `application/services/`: Use cases and business logic implementation.
- `infrastructure/`:
  - `controller/`: REST endpoints with Swagger.
  - `database/entities/`: TypeORM entities.
  - `dto/`: Validation with `class-validator`.
  - `mapper/`: Bi-directional conversion `toDomain` / `toEntity`.
  - `repositories/`: TypeORM implementations of domain interfaces.

## Estructura de módulos (Sprint 12)

| Módulo             | Estado     | Descripción                                          |
|--------------------|------------|------------------------------------------------------|
| auth               | ✅ Activo  | Registro, login, Google OAuth, JWT refresh           |
| users              | ✅ Activo  | Onboarding, perfil base, check-phone                 |
| user-profile       | ✅ Activo  | Perfil extendido, avatar, datos personales           |
| finances           | ✅ Activo  | Entidad raíz de finanzas por usuario                 |
| budgets            | ✅ Activo  | Presupuestos mensuales con resumen histórico          |
| transactions       | ✅ Activo  | Registro de movimientos financieros                  |
| expenses           | ✅ Activo  | Gastos planeados y no planeados                      |
| incomes            | ✅ Activo  | Ingresos planeados con generación de transacción     |
| savings            | ✅ Activo  | Ahorros planeados, metas de ahorro, allocations      |
| categories         | ✅ Activo  | Catálogo de categorías por tipo (need/want/saving)   |
| accounts           | ✅ Activo  | Cuentas bancarias y financieras del usuario          |
| accounts-payable   | ✅ Activo  | Deudas a pagar (pasivos)                             |
| accounts-receivable| ✅ Activo  | Cuentas por cobrar (activos)                         |
| settings           | ✅ Activo  | Configuración de usuario (endpoints en desarrollo)   |
| notifications      | ✅ Activo  | Sistema de notificaciones in-app con WebSocket       |
| groups             | ✅ Activo  | Grupos de gastos compartidos entre usuarios          |
| friendships        | ✅ Activo  | Relaciones de amistad entre usuarios                 |
| admin              | ✅ Activo  | Panel de administración, comunicados, auditoría      |
| analytics          | ✅ Activo  | Analítica y métricas financieras                     |
| health             | ✅ Activo  | Health score financiero del usuario                  |
| plans              | ✅ Activo  | Planes financieros                                   |
| travel-expenses    | ✅ Activo  | Gastos de viaje                                      |
| bills              | ⚠️ Huérfano | Solo entidad, sin lógica ni endpoints               |
| shared             | —          | Utilidades compartidas (no es módulo de negocio)     |

> **Nota:** `bills` es un módulo huérfano — solo existe la entidad TypeORM. No tiene servicios, controladores ni repositorios implementados.

## Mandatory Conventions

### Dependency Injection

- Always use String Tokens: `@Inject('EntityRepository')`.
- Module providers: `{ provide: 'EntityRepository', useClass: EntityRepositoryImpl }`.

### Error Handling & Responses

- **Responses:** Do NOT wrap manually. `ResponseInterceptor` handles `{ success: true, data: {} }`.
- **Errors:** Use native NestJS exceptions (`NotFoundException`, etc.). Never `throw new Error()`.
- **Logs:** Inject `LoggerProviderService`. Context: `private readonly context = ClassName.name`. Usage: `this.logger.info(this.context, 'msg')`.

### Swagger Documentation

- Required decorators: `@ApiOperation`, `@ApiBearerAuth`, `@ApiOkResponse`, `@ApiErrorResponse`.
- Use `@ApiParam` for path variables and `@ApiQuery` for filters.

### Mapping Rules

- `toDomain(entity)`: Entity -> Domain Object.
- `toEntity(domain)`: Domain -> TypeORM Entity.
  - Never map `id` on creation (POST).
  - Use proxy entities for relations: `const e = new Entity(); e.id = id;`.

### Auth & Security

- Guard: `@UseGuards(AuthGuard('jwt'))`.
- Roles: `@UseGuards(AuthGuard('jwt'), RolesGuard)` + `@Roles('admin')` para endpoints administrativos.
- User: Use `@CurrentUser()` to get `JwtPayload` (userId, email, tokenVersion).
- ⚠️ Todos los endpoints nuevos deben tener guard JWT. Verificar especialmente rutas GET públicas.

## Flujo de ramas (Sprint 12)

```
main        ← producción (nunca tocar directamente)
develop     ← rama de integración
  └── feature/<módulo>-<descripción>   ← trabajo activo
  └── fix/<descripción>
  └── docs/<descripción>
```

**Reglas:**
- Crear feature branches desde `develop`, nunca desde `main`.
- Hacer PR de feature → develop. Nunca push directo a develop o main.
- Convención de nombres: `feature/groups-expenses`, `fix/auth-refresh`, `docs/update-claude-md`.

## Variables de entorno requeridas

```bash
# Aplicación
APP_NAME=
APP_PORT=                  # default: 3005
NODE_ENV=                  # development | production

# URLs
APP_URL=                   # URL pública del backend
SWAGGER_URL=               # URL de la documentación Swagger
FRONTEND_URL=              # URL del frontend (CRÍTICO para WebSocket CORS)

# Base de datos
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=

# JWT
JWT_SECRET=
JWT_EXPIRES_IN=

# Firebase Admin (service account)
FB_PROJECT_ID=
FB_CLIENT_EMAIL=
FB_PRIVATE_KEY=            # Incluir con comillas y \n escapados
```

> ⚠️ `FRONTEND_URL` es requerida. Sin ella, el módulo WebSocket/Notifications acepta cualquier origen (`cors: true`).
> ⚠️ El repo no tiene `.env.example`. Crear uno al incorporar nuevos desarrolladores.

## Comandos frecuentes

```bash
# Desarrollo
npm run start:dev          # Modo watch con hot-reload

# Producción
npm run build
npm run start:prod

# Base de datos (TypeORM)
npm run migration:generate -- --name=MigrationName
npm run migration:run
npm run migration:revert

# Lint
npm run lint
npm run lint:fix
```

## Patterns establecidos

### assertBudgetOwner
Antes de cualquier operación sobre un presupuesto, verificar que pertenece al usuario:
```typescript
await this.assertBudgetOwner(budgetId, userId)
```
Implementado como método privado en los servicios de budgets, expenses, incomes, savings.

### NotificationsService
Para enviar notificaciones in-app desde cualquier módulo:
```typescript
// Inyectar en el módulo
import { NotificationsModule } from '../notifications/notifications.module'

// Usar en el servicio
await this.notificationsService.send(userId, { type: 'group_expense', payload: { ... } })
```

### @Roles guard para admin
```typescript
@Get()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
@ApiOperation({ summary: 'Admin only endpoint' })
async adminEndpoint() { ... }
```

### Health Score
El módulo `health` calcula el score financiero del usuario. No duplicar esta lógica en otros módulos — importar `HealthModule` si se necesita el score.

## Financial Business Logic

- `markAsReceive` (Income): Genera `transaction` (type: income) + `planned_savings` automáticamente.
- `completePlannedSaving`: `transaction` (type: savings) + actualización de estado.
- `completePlannedExpense`: `transaction` (type: expense) + actualización de estado.

## Lo que NO se debe hacer

- ❌ `throw new Error()` — usar excepciones nativas de NestJS (`NotFoundException`, `BadRequestException`, etc.)
- ❌ Envolver respuestas manualmente — `ResponseInterceptor` ya lo hace
- ❌ `synchronize: true` en producción — solo aceptable en desarrollo. Agregar check `NODE_ENV !== 'production'`
- ❌ Importar `fast-xml-parser` — es una dependencia muerta (0 usos en el codebase)
- ❌ Crear archivos con typos en el nombre: usar `repository` (no `respository`), `infrastructure` (no `infrstructure`)
- ❌ Endpoints GET sin guard de autenticación, salvo casos explícitamente públicos
- ❌ Push directo a `develop` o `main`
- ❌ Lógica de negocio en los controladores — pertenece a los servicios de `application/`
- ❌ Mapear `id` en creación (POST) — TypeORM lo genera automáticamente
- ❌ Logs en inglés si el proyecto usa español, o mezclar idiomas en los mismos logs

## Endpoints implementados (Sprint 12)

```
AUTH:              POST /auth/signup · /signin · /google · /refresh · /logout
BUDGETS:           POST / · GET /finances/:financeId · /current/:financeId
                   /current/:financeId/:year/:month · /:id · /summary/historical
                   PATCH /:id/active
TRANSACTIONS:      GET /budget/:budgetId · POST / · PATCH /:id · DELETE /:id
EXPENSES:          POST /plan · /unplanned · GET / · PATCH /:id/complete · /:id · DELETE /:id
INCOMES:           GET /planned/by-budget/:budgetId · PATCH /planned/:id
SAVINGS:           POST /allocation · GET /allocation/:budgetId
                   GET /planned/budget/:budgetId · PATCH /planned/:id
                   POST /goals · GET /goals
CATEGORIES:        GET /
USERS:             POST /onboarding · GET /me · GET /check-phone
USER-PROFILE:      GET /me
ACCOUNTS:          POST / · GET /
ACCOUNTS-PAYABLE:  (ver controlador del módulo)
ACCOUNTS-RECVBLE:  (ver controlador del módulo)
GROUPS:            CRUD grupos + gastos + contribuciones
ADMIN:             Usuarios, comunicados, configuración, auditoría
NOTIFICATIONS:     WebSocket + REST
HEALTH:            GET /health (score financiero)
SETTINGS:          (endpoints en desarrollo)
```
