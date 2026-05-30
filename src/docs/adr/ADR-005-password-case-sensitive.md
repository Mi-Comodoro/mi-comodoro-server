# ADR-005: Passwords case-sensitive

**Fecha:** 2026-05-30
**Estado:** Aplicado

## Contexto

El sistema normalizaba passwords a minúsculas antes de hashear (`passwordLowerCase`).
Esto reducía la entropía efectiva: "Password123!" y "password123!" eran equivalentes,
eliminando la distinción entre mayúsculas y minúsculas del espacio de contraseñas.

## Decisión

1. **Signup**: `passwordHash` recibe el password tal como llega desde el cliente, sin
   ninguna normalización. La función `passwordLowerCase` fue eliminada del utils.

2. **Signin** — verificación en dos pasos con migración silenciosa:
   - Se intenta verificar el password original (case-sensitive). Si es válido → OK.
   - Si falla, se intenta con lowercase (fallback legacy). Si coincide, el usuario
     migra automáticamente: se re-hashea el password original y se persiste.
   - Si ninguno coincide → `UnauthorizedException`.

## Consecuencia

- Nuevos usuarios registran passwords case-sensitive desde el primer login.
- Usuarios legacy migran silenciosamente en su próximo inicio de sesión exitoso.
- No requiere migración de base de datos.
- La función `passwordLowerCase` fue removida del módulo `usePassword` por ser dead code.
