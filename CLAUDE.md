# FinHub Backend - Context & Standards

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
- User: Use `@CurrentUser()` to get `JwtPayload` (userId, email, tokenVersion).

## Financial Business Logic

- `markAsReceive` (Income): Generates `transaction` (type: income) + `planned_savings` automatically.
- `completePlannedSaving`: `transaction` (type: savings) + status update.
- `completePlannedExpense`: `transaction` (type: expense) + status update.

## Tech Stack

- NestJS, TypeORM, TypeScript, PostgreSQL, JWT (Passport), Swagger.

## Current Status (MVP Complete)

### Implemented endpoints
AUTH: POST /auth/signup · /signin · /google · /refresh · /logout
BUDGETS: POST / · GET /finances/:financeId · /current/:financeId
         /current/:financeId/:year/:month · /:id · /summary/historical
         PATCH /:id/active
TRANSACTIONS: GET /budget/:budgetId · POST / · PATCH /:id · DELETE /:id
EXPENSES: POST /plan · /unplanned · GET / · PATCH /:id/complete · /:id · DELETE /:id
INCOMES: GET /planned/by-budget/:budgetId · PATCH /planned/:id
SAVINGS: POST /allocation · GET /allocation/:budgetId
         GET /planned/budget/:budgetId · PATCH /planned/:id
         POST /goals · GET /goals
CATEGORIES: GET /
USERS: POST /onboarding · GET /me
USER-PROFILE: GET /me
ACCOUNTS: POST / · GET /

### Pending
- POST /settings · GET /settings

### Out of MVP
- Reports module
