# Derechos del titular: acceso y supresión (Ley 1581 de 2012)

Decisión de producto: **la persona sabe y decide**. Si pide eliminar sus datos, se le informa con claridad, tiene que
confirmarlo escribiendo una frase, y sus datos permanecen **hasta 90 días** en el sistema antes del borrado permanente.
Durante ese plazo puede cancelar.

## Endpoints (autenticados, módulo `privacy`)

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/privacy/export` | **Acceso**: devuelve todos sus datos en JSON (3 por minuto) |
| `GET` | `/privacy/deletion` | Estado: `requested`, `requestedAt`, `scheduledAt`, `daysLeft` |
| `POST` | `/privacy/deletion` | **Supresión**: `{ "confirmation": "ELIMINAR MI CUENTA" }` programa el borrado a 90 días |
| `DELETE` | `/privacy/deletion` | Cancela la solicitud antes del borrado permanente |

Al solicitar: se cierran todas sus sesiones (`token_version` + tokens de refresco revocados) y puede volver a entrar para
cancelar. Mientras tanto la cuenta sigue funcionando.

**Bloqueo:** quien organiza un grupo con otras personas activas recibe `409` y debe traspasar la organización o eliminar
el grupo antes. No se decide por las demás personas.

## Qué contiene la exportación
Cuenta (sin contraseña), perfil, configuración, evidencia de consentimiento, sesiones (sin hash de token), cuentas,
ingresos, presupuestos y sus ingresos/ahorros/gastos planificados, movimientos, metas e historial, facturas, deudas y
cuentas por cobrar (con sus pagos/cobros), amistades, notificaciones, puntuaciones de salud y su participación en grupos.
**De otras personas solo se incluye el identificador interno**, nunca su correo ni su nombre.

## Qué pasa en el borrado permanente
Una tarea diaria (`AccountPurgeCron`, 03:30) borra las cuentas cuyo plazo venció, cada una en **una transacción** (si algo
falla, se deshace y se reintenta al día siguiente).

El esquema casi no tiene llaves foráneas hacia `users` (11 tablas guardan el identificador sin restricción), así que borrar
la fila de `users` **no basta**. El orden, comprobado contra la base real (102 columnas uuid revisadas, 0 registros restantes):

1. Grupos que organizaba: si queda otra persona activa, se **traspasa la organización** (primero co-organizadores, luego el
   miembro más antiguo); si no, se borra el grupo con todo lo que cuelga de él.
2. Lo **compartido con otras personas** (gastos de un grupo, aportes, reparto de gastos de viaje) se reasigna al usuario
   «**Persona eliminada**» (`00000000-0000-4000-8000-000000000000`): las cuentas de los demás no cambian y no quedan huérfanos.
3. Sale de los grupos y de los presupuestos compartidos (`budgets.partner_id`).
4. Se borran las tablas sin llave foránea (puntuaciones de salud, historial de metas, sesiones, configuración) y las
   dependencias **sin cascada** (movimientos y ahorros planificados, que PostgreSQL revisa en medio de la cascada).
5. Se borra `users`: cuentas, presupuestos, metas, facturas, deudas, amistades, notificaciones y consentimientos caen en cascada.
6. Con acceso por Google se borra también el registro de Firebase (mejor esfuerzo; si falla se registra sin el correo).

«Persona eliminada» no puede iniciar sesión (contraseña vacía, marcada como eliminada).

## Variables
| Variable | Defecto | Efecto |
|---|---|---|
| `ACCOUNT_DELETION_RETENTION_DAYS` | `90` | Días antes del borrado permanente (1 a 365) |
| `ACCOUNT_PURGE_CRON` | `30 3 * * *` | Programación de la tarea de borrado |

## Pendiente de decisión legal (importante)
- **El plazo de 90 días frente a los plazos de la ley.** La Ley 1581 da 15 días hábiles para resolver un reclamo de supresión.
  Conservar los datos 90 días tras la solicitud es una decisión de producto (permite arrepentirse) que **debe validar el
  abogado**; si no la acepta, basta bajar `ACCOUNT_DELETION_RETENTION_DAYS` (por ejemplo, a 15) o borrar de inmediato.
- **Evidencia de consentimiento:** se borra con la cuenta (`ON DELETE CASCADE`). El abogado decide si conservar un registro mínimo.
- **Respaldos:** los datos eliminados permanecen en los respaldos hasta que se sobrescriben (14 días locales; definir el plazo
  de la copia externa) y no se restauran salvo por un desastre. Debe constar en la política.
- **`audit_logs`** conserva la IP y el administrador que actuó (seguridad); su plazo está por definir.

## Límites conocidos
- El borrado del registro de Firebase usa el SDK de administración y **no se probó contra Firebase real** (solo con pruebas unitarias).
- La interfaz (botón de descarga, solicitud con advertencias y aviso de cuenta programada) va en un PR aparte del dashboard.
- Si una persona es la única organizadora y los demás miembros se van durante los 90 días, el grupo se borra al vencer el plazo.
