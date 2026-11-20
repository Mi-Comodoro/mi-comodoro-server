# Autorización de tratamiento de datos (Ley 1581 de 2012)

El servidor guarda la **evidencia** de que cada persona aceptó la Política de Tratamiento de Datos: qué versión,
cuándo, desde qué IP y con qué dispositivo. El texto de la política y de la casilla está en Notion
(«BORRADOR v2 — Política de Tratamiento de Datos»); este documento solo cubre el código.

## Interruptor

| Variable | Defecto | Efecto |
|---|---|---|
| `LEGAL_CONSENT_REQUIRED` | `false` | Si es `true`, no se crea una cuenta (por correo ni con Google) sin la versión vigente aceptada, y las personas con cuenta deben aceptarla al entrar |
| `LEGAL_POLICY_VERSION` | `2.0` | Versión vigente. Al cambiarla, todos deben volver a aceptar |

Mientras `LEGAL_CONSENT_REQUIRED` sea `false` **nada cambia para las personas usuarias**: el servidor graba la
evidencia si llega una versión válida, pero no exige nada y el frontend muestra la pantalla de siempre.

## Cómo activarlo (en este orden, a la vez)
1. Completar y revisar la política v2 (puntos pendientes en Notion) y publicarla en `/privacy` del dashboard.
2. Desplegar servidor y dashboard con este cambio.
3. Poner `LEGAL_CONSENT_REQUIRED=true` en el `.env` del servidor y reiniciar. La casilla aparece en el registro y
   las personas existentes ven un aviso que deben aceptar para seguir.

Publicar la política y activar la casilla **a la vez** evita que la autorización apunte a un texto que no existe.

## Endpoints
- `GET /legal/versions` (público): `{ policyVersion, consentRequired }`.
- `GET /legal/consent` (autenticado): estado de la persona (`accepted`, `acceptedVersion`, `needsAcceptance`).
- `POST /legal/consent { version }` (autenticado): acepta la versión vigente. Idempotente; rechaza versiones viejas.
- `POST /auth/signup` y `POST /auth/google` aceptan `acceptedPolicyVersion`. Con el interruptor encendido, una cuenta
  nueva sin la versión vigente recibe `400` con `error: "ConsentRequired"` (código estable que usa el frontend).

## Datos guardados (`user_consents`)
Usuario, tipo (`privacy_policy`), versión, fecha y hora, IP (máx. 64), agente de usuario (máx. 255) y fecha de
revocación (reservada). La clave foránea es `ON DELETE CASCADE`: **al eliminar una cuenta se borra también su
evidencia**. Qué conservar tras una supresión es una decisión para el abogado.

## Limitaciones conocidas
- **La IP guardada es la que ve el servidor.** Mientras el BFF de Nuxt no reenvíe la IP real del cliente
  (`X-Forwarded-For`) y `TRUST_PROXY` no esté configurado para esa cadena de proxies, la IP de la evidencia será
  la del BFF y no la de la persona. Es el mismo pendiente del límite de tasa por IP.
- El flujo de **Google** (cuenta nueva) pide la casilla después del popup y reutiliza las mismas credenciales
  de Google; no se ha probado de punta a punta porque requiere un token real de Firebase.
- Aún no hay revocación desde la aplicación: se hace por correo (procedimiento en Notion).
- Los **Términos y Condiciones** no existen todavía y no tienen su propia aceptación.
