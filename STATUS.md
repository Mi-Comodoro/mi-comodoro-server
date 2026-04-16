# FinHub Backend - Implementation Status

## 1. Project overview
- Backend de finanzas personales construido con NestJS, TypeORM, PostgreSQL y Swagger.
- Arquitectura hexagonal por módulo:
  - `domain/`: entidades de dominio, interfaces, enums.
  - `application/`: servicios y casos de uso.
  - `infrastructure/`: controllers, DTOs, mappers, entidades TypeORM y repositorios.
- Se emplea inyección de dependencias con tokens string: `{ provide: 'XRepository', useClass: XRepositoryImpl }`.
- Respuestas globales envueltas por `ResponseInterceptor`.
- Autenticación con JWT/Passport y `@CurrentUser()` para acceso a `JwtPayload`.

## 2. Current architectural compliance
### Cumple
- Controllers delegan a servicios y no contienen lógica de persistencia directa.
- Services consumen repositorios mediante interfaces de dominio inyectadas por token string.
- Implementaciones TypeORM de repositorio están ubicadas en `infrastructure/repositories`.
- Mappers presentes en varios módulos (`transaction`, `expense`, `category`, `planned saving`, etc.).
- Swagger aplicado en la mayoría de controllers con `@ApiOperation`, `@ApiBearerAuth` y respuestas definidas.
- Guardas JWT aplicados en rutas protegidas de casi todos los módulos revisados.

### Desviaciones detectadas
- Uso de `throw new Error(...)` en algunos repositorios:
  - `src/modules/api/modules/budgets/infrastructure/repositories/budget.repository.impl.ts`
  - `src/modules/api/modules/user-profile/infrastructure/repository/user-profile.repository.impl.ts`
- Endpoint de transacciones (`src/modules/api/modules/transactions/infrastructure/controllers/transaction.controller.ts`) no tiene `@UseGuards(AuthGuard('jwt'))` ni decoradores Swagger.
- `UserProfileRepositoryImpl` mezcla dos decoradores en la misma propiedad: `@InjectRepository(UserProfileEntity)` y `@Inject('UserProfileRepository')`.
- En algunos repositorios como `BudgetRepositoryImpl`, no se usa un mapper explícito para convertir entre entidad y dominio en todos los métodos.

## 3. Implemented features
### Auth
- `POST /auth/google` → login con Firebase idToken.
- `POST /auth/logout` → invalida tokenVersion.
- `POST /auth/refresh` → renueva JWT sin cambiar tokenVersion.
- `POST /auth/signup` y `POST /auth/signin` implementados en auth controller.

### Budgets
- `GET /budgets` → lista del usuario con `year` opcional.
- `GET /budgets/:id` → detalle por ID.
- `GET /budgets/current/:financeId` → presupuesto actual (con query de periodo opcional).
- `GET /budgets/current/:financeId/:year/:month` → presupuesto por periodo.
- `GET /budgets/finances/:financeId` → presupuestos por finanzas.
- `GET /budgets/summary/historical` → resumen histórico.
- `POST /budgets` → crear presupuesto con modo `empty` o `clone`.
- `PATCH /budgets/:id/active` → activar presupuesto.

### Transactions
- `GET /transactions/budget/:budgetId` → listado con filtros y paginación.
- Implementación de service y repositorio para filtrado por tipo, categoría y rango de fechas.

### Expenses
- `POST /expenses/plan` → crear gasto planificado.
- `POST /expenses/unplanned` → registrar gasto no planificado y generar transacción.
- `GET /expenses/` → listar gastos planificados con filtros.
- `PATCH /expenses/:id/complete` → marcar gasto planificado como pagado y generar transacción.

### Incomes
- `GET /incomes/planned/by-budget/:budgetId` y controladores de ingresos planificados parecen implementados.
- `PATCH /incomes/planned/:id` → marcar como recibido está presente en la lógica de servicios.

### Savings
- `GET /savings/planned/by-budget/:budgetId` está en la capa de infraestructura.
- `PATCH /savings/planned/:id/complete` → marcar como ahorrado implementado en servicios de planned saving.

### Categories
- `GET /categories` → listado general implementado.

### Users
- `GET /users/me` → usuario autenticado con perfil y finanzas.
- `POST /users/onboarding` → completar onboarding.

## 4. Pending features
- `PATCH /expenses/:id` → editar gasto planificado.
- `DELETE /expenses/:id` → eliminar gasto planificado.
- `POST /transactions` → crear transacción manual.
- `PATCH /transactions/:id` → editar transacción.
- `DELETE /transactions/:id` → eliminar transacción.
- `GET /budgets/reports/generate` → generación de reportes.

## 5. Notes and recommendations
- Corregir los `throw new Error(...)` por excepciones de NestJS (`NotFoundException`, `BadRequestException`, etc.) para mantener la política de errores del proyecto.
- Añadir Swagger y guards faltantes al controller de transacciones.
- Validar la configuración de `UserProfileRepositoryImpl` para evitar inyección errónea con dos decoradores en la misma propiedad.
- Revisar consistencia de uso de mappers en todos los repositorios para asegurar la separación entre entidad TypeORM y dominio.
- Confirmar que todos los endpoints documentados en `CLAUDE.md` estén implementados y protegidos según la convención.
