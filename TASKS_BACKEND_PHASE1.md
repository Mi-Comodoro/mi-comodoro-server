# TASKS_BACKEND_PHASE1.md

## Contexto
Lee CLAUDE.md en la raíz del proyecto.
Arquitectura hexagonal: domain/ → application/ → infrastructure/

## PRIORIDAD ABSOLUTA
Mantener todos los endpoints existentes funcionando.
Antes de cualquier cambio verificar con:
```bash
npm run build
```
Si falla el build después de un cambio → revertir ese cambio antes de continuar.

---

## TAREA 1 — @UseGuards + Swagger en transaction controller
**Archivo:** `src/modules/api/modules/transactions/infrastructure/controllers/transaction.controller.ts`
**Tiempo:** 30 min
**Riesgo:** BAJO — solo agrega decoradores, no toca lógica

1. Leer el archivo completo
2. Agregar en la clase del controller:
```ts
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
```
3. En el método GET existente agregar:
```ts
@ApiOperation({ summary: 'Listar transacciones por presupuesto' })
@ApiOkResponse({ description: 'Lista de transacciones con filtros y paginación' })
```
4. Verificar que el endpoint sigue respondiendo igual
5. `npm run build` — debe pasar sin errores

---

## TAREA 2 — Fix throw new Error() en budget repository
**Archivo:** `src/modules/api/modules/budgets/infrastructure/repositories/budget.repository.impl.ts`
**Tiempo:** 30 min
**Riesgo:** BAJO — solo reemplaza el tipo de excepción

1. Leer el archivo completo
2. Buscar todos los `throw new Error(...)`
3. Reemplazar por la excepción NestJS apropiada según el contexto:
   - "not found" → `throw new NotFoundException('mensaje')`
   - "already exists" → `throw new ConflictException('mensaje')`
   - "invalid" → `throw new BadRequestException('mensaje')`
4. Importar desde `@nestjs/common`
5. `npm run build` — debe pasar sin errores

---

## TAREA 3 — Fix throw new Error() en user-profile repository
**Archivo:** `src/modules/api/modules/user-profile/infrastructure/repository/user-profile.repository.impl.ts`
**Tiempo:** 30 min
**Riesgo:** BAJO

1. Leer el archivo completo
2. Mismo proceso que TAREA 2
3. `npm run build` — debe pasar sin errores

---

## TAREA 4 — Fix doble decorador en UserProfileRepositoryImpl
**Archivo:** `src/modules/api/modules/user-profile/infrastructure/repository/user-profile.repository.impl.ts`
**Tiempo:** 20 min
**Riesgo:** MEDIO — puede afectar inyección de dependencias

1. Leer el archivo completo
2. Encontrar la propiedad con doble decorador:
   `@InjectRepository(UserProfileEntity)` y `@Inject('UserProfileRepository')`
   en la misma propiedad
3. La corrección es mantener SOLO `@InjectRepository(UserProfileEntity)`
   en el constructor para TypeORM, y ELIMINAR `@Inject('UserProfileRepository')`
   de esa propiedad (ese token es para el módulo que consume el repo, no aquí)
4. Verificar que el módulo de users sigue proveyendo el repositorio correctamente
5. `npm run build` — debe pasar sin errores
6. Probar `GET /users/me` — debe seguir respondiendo

---

## TAREA 5 — PATCH /expenses/:id
**Archivos a crear/modificar:**
- `expenses/infrastructure/dto/update-expense.dto.ts` (nuevo)
- `expenses/domain/repositories/expense.repository.ts` (agregar método)
- `expenses/infrastructure/repositories/expense.repository.impl.ts` (implementar)
- `expenses/application/services/expense.service.ts` (agregar caso de uso)
- `expenses/infrastructure/controller/expense.controller.ts` (agregar endpoint)

**Tiempo:** 1.5h
**Riesgo:** BAJO — módulo nuevo sin afectar existente

1. Leer todos los archivos del módulo expense primero
2. Seguir exactamente el patrón de `PATCH /expenses/:id/complete` que ya existe
3. DTO solo permite editar: `amount`, `name`, `categoryId`, `dueDate`, `description`
   NO permitir cambiar: `budgetId`, `status`
4. Validar con class-validator en el DTO
5. Service: verificar que el expense existe y pertenece al usuario antes de editar
6. Swagger completo en el endpoint
7. `npm run build` — debe pasar sin errores
8. Probar en Swagger que el endpoint responde correctamente

---

## TAREA 6 — DELETE /expenses/:id (soft delete)
**Tiempo:** 1h
**Riesgo:** BAJO

1. Leer archivos del módulo expense
2. Soft delete: cambiar `status` a `'CANCELED'`
   NO eliminar el registro de la base de datos
3. Verificar que el expense existe antes de cancelar
4. Responder con el expense actualizado
5. Swagger documentado
6. `npm run build` — debe pasar sin errores

---

## TAREA 7 — POST /transactions (crear manual)
**Tiempo:** 2h
**Riesgo:** MEDIO — nueva lógica de negocio

1. Leer TODOS los archivos del módulo transactions
2. Leer cómo se crea una transacción en `completePlannedExpense`
   para entender el patrón existente
3. DTO para crear manual:
```ts
{
  amount: number           // requerido
  type: TransactionType    // requerido: income | expense | savings
  source: string           // requerido: descripción de la fuente
  categoryId: string       // requerido
  budgetId: string         // requerido
  transactionDate: Date    // requerido
  accountId?: string       // opcional
  description?: string     // opcional
}
```
4. IMPORTANTE: esta transacción manual NO genera planned_savings
   NO modifica ningún planned_income ni planned_expense
   Solo crea el registro de transacción
5. Asociar al usuario autenticado via `@CurrentUser()`
6. Swagger completo
7. `npm run build` — debe pasar sin errores

---

## TAREA 8 — PATCH /transactions/:id
**Tiempo:** 1h
**Riesgo:** BAJO

1. Solo permite editar: `amount`, `source`, `description`,
   `categoryId`, `transactionDate`
2. NO permite cambiar: `type`, `budgetId`, `accountId`
3. Verificar que la transacción existe y pertenece al usuario
4. `npm run build` — debe pasar sin errores

---

## TAREA 9 — DELETE /transactions/:id (soft delete)
**Tiempo:** 1h
**Riesgo:** BAJO — solo agregar campo

1. Leer la entidad TypeORM de transactions
2. Verificar si existe el campo `nulledAt: Date | null`
   Si no existe → agregar a la entidad con `@Column({ nullable: true, default: null })`
3. Soft delete: setear `nulledAt = new Date()`
4. En el GET de transactions agregar filtro `WHERE nulledAt IS NULL`
   para que las eliminadas no aparezcan en el listado
5. `npm run build` — debe pasar sin errores

---

## Verificación final
Después de todas las tareas ejecutar:
```bash
npm run build
```
Confirmar que estos endpoints siguen funcionando:
- GET /budgets/finances/:financeId
- GET /transactions/budget/:budgetId
- POST /expenses/plan
- PATCH /expenses/:id/complete
- GET /users/me

Si cualquiera de estos falla → reportar antes de continuar.