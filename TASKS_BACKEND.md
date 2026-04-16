# FinHub Backend — Tareas pendientes

## Contexto
Lee CONTEXT.md primero.
Proyecto: NestJS + TypeORM + arquitectura hexagonal.
Ruta base: src/modules/api/modules/

## Reglas absolutas
- No tocar: JwtStrategy, GlobalHttpExceptionFilter, ResponseInterceptor
- Siempre: logs con this.logger.info(this.context, ...)
- Siempre: @UseGuards(AuthGuard('jwt')) + @CurrentUser() en rutas protegidas
- Siempre: excepciones nativas de NestJS
- Siempre: Swagger con @ApiOperation, @ApiBearerAuth, @ApiOkResponse
- Siempre: seguir el patrón del módulo de incomes como referencia

---

## FASE 1 — Endpoint histórico para reportes (PRIORIDAD)

### Tarea 1.1 — Endpoint GET /budgets/summary/historical

Leé primero:
- src/modules/api/modules/budgets/application/budget.service.ts
- src/modules/api/modules/budgets/domain/repositories/budget.repository.ts
- src/modules/api/modules/budgets/infrastructure/repositories/budget.repository.impl.ts
- src/modules/api/modules/transactions/domain/repositories/transaction.repository.ts
- src/modules/api/modules/savings/domain/repositories/planned.repository.ts

Crear en BudgetController:
@Get('/summary/historical')
@UseGuards(AuthGuard('jwt'))
Recibe @Query('year') year?: string — default año actual.
Llama budgetService.getHistoricalSummary(userId, year).

Crear en BudgetService método getHistoricalSummary:
1. Buscar todos los budgets del usuario para ese año
2. Por cada budget calcular con QueryBuilder:
   - receivedIncome: SUM transactions tipo 'income'
   - totalExpenses: SUM transactions tipo 'expense'  
   - totalSavings: SUM planned_savings status 'completed'
3. Calcular savingsRate: totalSavings / receivedIncome * 100
4. Retornar array ordenado por mes

Retorno por item:
{
  month: string
  year: number
  status: BudgetStatus
  expectedIncome: number
  receivedIncome: number
  totalExpenses: number
  totalSavings: number
  savingsRate: number
}

Agregar DTO de respuesta con Swagger.
Agregar método al repositorio con QueryBuilder eficiente.

---

## FASE 2 — Ingreso no planificado

### Tarea 2.1 — POST /incomes/unplanned

Leé primero:
- src/modules/api/modules/incomes/application/services/planned-income.service.ts
- src/modules/api/modules/incomes/infrastructure/controller/planned-incomes.controller.ts

El endpoint debe:
- Recibir: amount, source, budgetId, date
- userId viene de @CurrentUser()
- Validar budget existe y está ACTIVE
- Crear transaction tipo 'income' SIN plannedIncomeId
- Generar planned_savings automáticamente (reutilizar generatePlannedSavings)
- Retornar { transaction, plannedSavings }

DTO con class-validator:
- amount: IsNumber, Min(0)
- source: IsString, IsNotEmpty
- budgetId: IsUUID
- date: IsDateString

Swagger completo.

---

## FASE 3 — Gasto no planificado

### Tarea 3.1 — POST /expenses/unplanned

Leé primero:
- src/modules/api/modules/expenses/application/services/expense.service.ts
- src/modules/api/modules/expenses/infrastructure/controller/expense.controller.ts

El endpoint debe:
- Recibir: amount, categoryId, description, budgetId, date
- userId viene de @CurrentUser()
- Validar budget existe y está ACTIVE
- Crear transaction tipo 'expense' directamente SIN plannedExpenseId
- Retornar { transaction }

DTO con class-validator:
- amount: IsNumber, Min(0)
- categoryId: IsUUID
- description: IsString, IsOptional
- budgetId: IsUUID
- date: IsDateString

Swagger completo.

---

## FASE 4 — Silent refresh del token

### Tarea 4.1 — POST /auth/refresh

Leé primero:
- src/modules/api/modules/auth/application/auth.service.ts
- src/modules/api/modules/auth/infrastructure/controller/auth.controller.ts
- src/core/config/security/jwt/jwt.provider.ts

El endpoint debe:
- Estar protegido con AuthGuard('jwt')
- NO incrementar tokenVersion
- Generar nuevo token con mismo payload
- Retornar { token, expiresAt } donde expiresAt es unix timestamp

En auth.service agregar método refresh(payload: JwtPayload):
1. Buscar usuario por payload.userId
2. Validar tokenVersion coincide
3. Generar nuevo token
4. Decodificar para obtener exp
5. Retornar { token, expiresAt: decoded.exp }

También actualizar loginWithGoogle y signin para retornar expiresAt.
Swagger completo.

---

## FASE 5 — Cuenta principal en transacciones

### Tarea 5.1 — Verificar accountId en todas las transactions

Leé primero:
- src/modules/api/modules/incomes/application/services/planned-income.service.ts
- src/modules/api/modules/savings/application/services/planned-saving.service.ts  
- src/modules/api/modules/expenses/application/services/expense.service.ts

Verificar que:
1. createIncomeTransaction pasa toAccountId: primaryAccount?.id
2. completePlannedSaving pasa fromAccountId: primaryAccount?.id
3. completePlannedExpense pasa fromAccountId: primaryAccount?.id

Si alguno falta, agregarlo siguiendo el patrón ya implementado
en las otras tareas anteriores.

---

## Verificación por tarea
Antes de marcar completa:
1. Compila sin errores TypeScript
2. Endpoint visible en Swagger con documentación completa
3. Autenticación requerida funciona
4. Errores retornan el formato correcto del GlobalHttpExceptionFilter
5. Logs presentes en puntos clave