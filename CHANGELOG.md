# Changelog

Formato: [Semantic Versioning](https://semver.org)

## [1.0.0-beta] — 2026-05-14

### Hito B — Prueba cerrada

#### Added
- Módulos: Budget, Transactions, Income, Expenses, Goals, Savings
- Cuentas por Pagar y por Cobrar (AP/AR)
- Analytics: Flujo de Caja, Gastos por Categoría, Ahorro, Salud Financiera
- Financial Health Score (4 pilares: flujo, ahorro, gastos, deudas)
- Autenticación Google OAuth + JWT refresh
- Dashboard con gauge de salud financiera

#### Security
- synchronize: false — migraciones manuales con TypeORM
- Índices en tabla transactions
- Idempotencia en endpoints POST críticos (X-Idempotency-Key)
- Soft delete en todas las entidades (nulledAt)
- AuthGuard en todos los endpoints autenticados

#### Infrastructure
- Backup automático con pg_dump + retención 7 días
