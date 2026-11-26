# Acceso a la beta cerrada

La beta es por invitación. Una persona pide acceso desde la landing, un admin lo aprueba en el panel y recibe un enlace de un solo uso para registrarse.

## Flujo

1. **Solicitud** (`POST /beta-access/requests`, público). Guarda correo, versión de la política y la fecha que pone la base de datos. No guarda IP ni nombre. Responde siempre `202 { received: true }`, también si el correo ya había pedido (no revela quién pidió). Un campo trampa (`website`) descarta bots sin avisarles. Límite de 5 solicitudes por minuto por IP.
2. **Aprobación** (admin, `POST /admin/beta-access/:id/approve`). Genera un token de 32 bytes, guarda solo su hash SHA-256 y devuelve el token **una vez**. Vence a los 14 días (`beta_invite_days`). Volver a aprobar una solicitud ya aprobada emite un token nuevo y deja sin valor el anterior; no consume cupo. Queda registro en la auditoría (sin el correo).
3. **Registro** con `inviteToken` en `POST /auth/signup` o `POST /auth/google` (cuenta nueva). La invitación debe estar aprobada, vigente y emitida para ese mismo correo. Al crearse la cuenta la solicitud pasa a `registered`, **se borra el correo de la solicitud** y se guarda el id de la cuenta.
4. `GET /beta-access/invitations/:token` (público) devuelve el correo para precargar el registro; un token inválido, vencido o usado responde siempre `404`.

## Interruptor

`BETA_INVITE_REQUIRED` (por defecto `false`). Apagado, el registro funciona como siempre (y una invitación válida igual se marca como usada). Encendido, sin invitación el registro responde `403` con `error: "BetaInviteRequired"`. Activarlo **solo cuando el dashboard (registro con invitación) y la landing (formulario) estén desplegados**; si no, nadie podría registrarse.

## Cupo

`beta_max_users` en Admin > Configuración (por defecto 10) limita las aprobaciones: cuentan las solicitudes `approved` y `registered`. Aprobar con el cupo lleno responde `409`. `GET /admin/beta-access/summary` devuelve los conteos.

## Retención y privacidad

Finalidad única: gestionar el acceso a la beta. Un cron diario (04:00) borra:

| Estado | Se borra |
|---|---|
| Rechazada | a los 30 días de la decisión |
| Pendiente sin respuesta | a los 12 meses |
| Aprobada con invitación vencida y sin usar | 30 días después de vencer |
| Registrada | no tiene correo; se borra con la cuenta (`AccountDeletionService`) |

La solicitud de una persona registrada entra en «descargar mis datos» como `betaAccess` (versión, fechas), sin correo. Ver `docs/PRIVACY.md` y `docs/LEGAL.md`. Los plazos son una propuesta pendiente de revisión legal y viven en `RETENTION_DAYS` (`beta-access.config.ts`).

## Endpoints de admin

Solo `admin` y `super_admin` (`AdminGuard`): `GET /admin/beta-access?status=`, `GET /admin/beta-access/summary`, `POST /admin/beta-access/:id/approve`, `POST /admin/beta-access/:id/reject`. Ninguna respuesta de listado incluye el hash ni el token.

## Pendiente

- Envío de la invitación por correo: hoy el admin copia el enlace y lo manda a mano. Falta elegir proveedor y un correo de dominio propio.
