# LEGAL-06 — Auditoría Access Token Google

**Fecha:** 2026-05-14  
**Resultado:** PASSED (con Fix C aplicado)  
**Rama:** fix/legal-06-audit  
**Revisor:** Miguel Alvarez

---

## Contexto

El flujo de autenticación con Google usa **Firebase Admin SDK** (`admin.auth().verifyIdToken(idToken)`).
El cliente envía un Firebase ID token — nunca un Google access_token directamente.
El servidor verifica el ID token y extrae claims (`email`, `picture`, `uid`).

---

## Checklist

- [x] access_token NO aparece en logs
  - `AuthService.loginWithGoogle` solo loguea `data.name`, nunca el token recibido.
- [x] access_token NO persiste en DB
  - `UserEntity` no tiene columna `access_token` ni `google_token`.
  - Solo se persiste: email, provider, onboarding, tokenVersion.
- [x] Solo el Firebase ID token es usado para extraer nombre/foto en primer login
  - `decodedToken.email` y `decodedToken.picture` son los únicos claims usados.
  - El `idToken` no se loguea en ningún punto del flujo.
- [x] URL de foto limpia (sin parámetros sensibles) — **Fix C aplicado**
  - `decodedToken.picture?.split('?')[0]` elimina query params antes de persistir.

---

## Fixes aplicados

| Fix | Archivo | Línea | Descripción |
|-----|---------|-------|-------------|
| C   | `auth/application/auth.service.ts` | 137 | Sanitizar URL de foto: `decodedToken.picture?.split('?')[0]` |

---

## Superficie analizada

| Archivo | Hallazgo |
|---------|----------|
| `auth/application/auth.service.ts` | Flujo OAuth completo revisado |
| `auth/infrastructure/controller/auth.controller.ts` | POST /auth/google — no loguea body |
| `auth/infrastructure/dto/signin.dto.ts` | `GoogleSignInDto` — solo recibe `idToken` y `name` |
| `users/infrastructure/database/user.entity.ts` | Sin columnas de token de terceros |
| `user-profile/infrastructure/database/entities/user-profile.entity.ts` | Campo `photo` nullable — ahora recibe URL sanitizada |
