# FinHub Auth, Session and Onboarding Flow

## Overview

This document captures the current flow for:

- user registration
- authentication
- JWT generation and validation
- guarded requests
- current user resolution
- logout and token invalidation
- onboarding and its relation to the authenticated session

The project uses NestJS, Passport JWT, TypeORM, and a global `ResponseInterceptor`.

## Main Components

### Auth module

- Controller: [src/modules/api/modules/auth/infrastructure/controller/auth.controller.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/auth/infrastructure/controller/auth.controller.ts)
- Service: [src/modules/api/modules/auth/application/auth.service.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/auth/application/auth.service.ts)
- DTOs:
  - [src/modules/api/modules/auth/infrastructure/dto/signup.dto.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/auth/infrastructure/dto/signup.dto.ts)
  - [src/modules/api/modules/auth/infrastructure/dto/signin.dto.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/auth/infrastructure/dto/signin.dto.ts)

### JWT and guard

- JWT module: [src/core/config/security/jwt/jwt.module.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/core/config/security/jwt/jwt.module.ts)
- JWT provider: [src/core/config/security/jwt/jwt.provider.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/core/config/security/jwt/jwt.provider.ts)
- JWT strategy: [src/core/config/security/jwt/jwt.strategy.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/core/config/security/jwt/jwt.strategy.ts)
- JWT payload: [src/core/config/security/jwt/jwt.payload.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/core/config/security/jwt/jwt.payload.ts)
- Current user decorator: [src/common/decorator/current-user.request.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/common/decorator/current-user.request.ts)

### User and onboarding

- User entity: [src/modules/api/modules/users/infrastructure/database/user.entity.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/users/infrastructure/database/user.entity.ts)
- User repository implementation: [src/modules/api/modules/users/infrastructure/repository/user.repository.impl.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/users/infrastructure/repository/user.repository.impl.ts)
- Users controller: [src/modules/api/modules/users/infrastructure/controller/users.controller.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/users/infrastructure/controller/users.controller.ts)
- Users service: [src/modules/api/modules/users/application/services/users.service.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/users/application/services/users.service.ts)
- Onboarding completion listener: [src/modules/api/modules/users/application/onboarding.listener.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/users/application/onboarding.listener.ts)

### Response wrapping

- Global response interceptor: [src/core/interceptors/response.interceptor.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/core/interceptors/response.interceptor.ts)

All successful controller responses are wrapped as:

```json
{
  "success": true,
  "data": {}
}
```

Controllers should return raw data objects and arrays. They should not wrap manually.

## User Session Model

The current session model is stateless JWT with server-side invalidation by token version.

### Payload fields

Current payload:

```ts
{
  userId: string;
  email: string;
  userProfileId?: string;
  tokenVersion?: number;
}
```

### Persisted session-related fields on user

User entity currently persists:

- `provider`
- `onboarding`
- `tokenVersion`

Important fields in [user.entity.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/users/infrastructure/database/user.entity.ts):

- `onboarding` defaults to `PENDING`
- `tokenVersion` defaults to `0`

## Registration Flow

### Endpoint

- `POST /auth/signup`

### High-level flow

1. `AuthController.signup` receives `SignUpDto`.
2. Password is normalized to lowercase with `usePassword().passwordLowerCase`.
3. Password hash is created with `usePassword().passwordHash`.
4. `AuthService.signup` checks if the user already exists by email.
5. If not found:
   - a `User` is created with:
     - random UUID
     - email
     - password hash
     - provider `LOCAL`
     - `tokenVersion: 0`
   - a `UserProfile` is created
6. Response is returned through `signUpToClient`.

### Notes

- Signup does not issue a JWT token.
- Session starts at signin or Google login, not at signup.

## Local Signin Flow

### Endpoint

- `POST /auth/signin`

### High-level flow

1. `AuthController.signin` receives email and password.
2. Password is normalized to lowercase.
3. `AuthService.signin` loads the user by email.
4. Password is validated with `usePassword().passwordIsValid`.
5. If valid, JWT payload is built with:
   - `userId`
   - `email`
   - `userProfileId`
   - `tokenVersion`
6. `JwtProvider.generateToken` signs the access token using:
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
7. Controller returns token and account type.

### Result

The returned token is the active access token used by all guarded routes.

## Google Login Flow

### Endpoint

- `POST /auth/google`

### High-level flow

1. The request contains Firebase `idToken`.
2. `AuthService.loginWithGoogle` verifies it using Firebase Admin.
3. The code searches for an existing local user by email.
4. If user does not exist:
   - creates `User` with:
     - provider `GOOGLE`
     - empty password
     - onboarding `PENDING`
     - `tokenVersion: 0`
   - creates `UserProfile`
   - returns JWT
5. If user exists:
   - builds JWT from existing user
   - returns token, account type, and current onboarding state

### Important note

This path depends on `findByEmail(decodedToken.email)`.

If email matching is inconsistent outside this flow, it can lead to creation of a new user in `PENDING` instead of reusing the expected user.

## JWT Module and Token Creation

### JWT module

`SecurityJwtModule` registers:

- `JwtModule`
- `PassportModule`
- `JwtProvider`
- `JwtStrategy`
- `UserRepository` provider

### Token creation

`JwtProvider.generateToken(payload)` signs the token using Nest `JwtService`.

No refresh token flow exists today.

The session depends entirely on:

- the access token still being valid by expiration
- the `tokenVersion` in the token matching the user row

## Guarded Request Flow

### Standard pattern

Protected routes use:

```ts
@UseGuards(AuthGuard('jwt'))
```

Examples:

- `/auth/logout`
- `/users/onboarding`
- `/users/me`
- multiple budgets, incomes, savings, accounts, profile routes

### What `AuthGuard('jwt')` does here

1. Reads the bearer token from the `Authorization` header.
2. Uses `JwtStrategy`.
3. `JwtStrategy.validate(payload)` loads the user by `payload.userId`.
4. If user does not exist, request is rejected.
5. If `payload.tokenVersion !== user.tokenVersion`, request is rejected with unauthorized.
6. If valid, `request.user` is populated with:
   - `userId`
   - `userProfileId`
   - `email`
   - `tokenVersion`

## Current User Resolution

The decorator `@CurrentUser()` reads `request.user`.

If no authenticated user is present, it throws `UnauthorizedException('User not found')`.

That means any controller that depends on the authenticated user should use:

```ts
@UseGuards(AuthGuard('jwt'))
@CurrentUser() user: JwtPayload
```

## Logout and Token Invalidation

### Endpoint

- `POST /auth/logout`

### Flow

1. Route is protected with `AuthGuard('jwt')`.
2. `@CurrentUser()` resolves the authenticated payload.
3. `AuthService.logout` loads the user with `findAuthById`.
4. Repository method `invalidateTokens(userId, currentVersion)` increments `tokenVersion`.
5. Any previously issued token with the old version becomes invalid.

### Effect

This invalidates all current access tokens for that user, not only one device.

### Current model limitation

There is no per-device session table and no refresh token rotation.

## Users Me Flow

### Endpoint

- `GET /users/me`

### Flow

1. Request is authenticated with JWT guard.
2. `@CurrentUser()` injects the current payload.
3. `UsersService.getCurrentUser` loads the user by `payload.userId`.
4. `UserRepository.findById` includes:
   - `userProfile`
   - `finances`
5. `UserMapper.toClient` shapes the output.

### Returned user-facing fields include

- `id`
- `email`
- `provider`
- `onboarding`
- `userProfile`
- `finances`

## Onboarding Flow

### Entry point

- `POST /users/onboarding`

### Current behavior

This route is now JWT-protected and bound to the authenticated user:

1. `UsersController.onboarding` requires `AuthGuard('jwt')`
2. `@CurrentUser()` extracts the authenticated payload
3. `UsersService.onboardingByUserId(user.userId, body)` is called
4. The service reloads the user by `userId`
5. The service normalizes `body.userInfo.email` to the persisted user email

This is important because earlier the flow depended on the email coming in the body. That made onboarding fragile if the body email did not represent the same authenticated user.

### Event chain

The onboarding process is event-driven:

1. `user.onboarding.started`
2. `user-profile.setup.completed`
3. `finances.setup.completed`
4. `budget.setup.completed`
5. `onboarding.completed`

### Listeners involved

#### User profile

- Listener: [user-profile.listener.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/user-profile/application/user-profile.listener.ts)
- Updates:
  - `displayName`
  - `gender`
  - `phone`

#### Finances

- Listener: [onboarding-finances.listener.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/finances/application/onboarding-finances.listener.ts)
- Creates finances row if it does not exist

#### Budget

- Listener: [onboarding-budget.listener.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/budgets/application/onboarding-budget.listener.ts)
- Creates initial budget

#### Incomes

- Listener: [onboarding-incomes.listener.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/incomes/application/listeners/onboarding-incomes.listener.ts)
- Creates income sources
- Generates planned incomes
- Emits `onboarding.completed`

#### Final onboarding state

- Listener: [onboarding.listener.ts](c:/Users/Ingmi/personal/finanzas/finhub-server/src/modules/api/modules/users/application/onboarding.listener.ts)
- Calls `completeOnboarding(userId)`
- Writes onboarding state to `COMPLETED`

## Current Security and Session Assumptions

- Access tokens are bearer tokens
- There is no server-stored session object
- Session validity is enforced through:
  - JWT signature
  - JWT expiration
  - `tokenVersion`
- User identity in protected routes should come from JWT, not from body params like email

## Observed Sensitive Areas

These are the places most likely to create confusion or regressions:

### 1. Onboarding and identity source

The safe path is now `onboardingByUserId`.

The older `onboarding(data)` path still exists in `UsersService` and uses `data.userInfo.email`. It is not currently used by the controller, but it remains in the codebase and could be reused accidentally.

### 2. Google login can create a new user in `PENDING`

If `loginWithGoogle` does not find the user by email, it creates a new `GOOGLE` user with:

- `onboarding: 'PENDING'`
- `tokenVersion: 0`

If there is an email mismatch or duplicate-user situation, this can look like a user "went back" to pending when in reality a different row is being used.

### 3. Logout invalidates every token for the user

This is correct for the current implementation, but it is broader than a single-device logout.

### 4. Response wrapping is automatic

Services and controllers should return plain objects. The final response shape is handled globally.

## Quick Reference

### Auth endpoints

- `POST /auth/signup`
- `POST /auth/signin`
- `POST /auth/google`
- `POST /auth/logout`

### User/session endpoints

- `POST /users/onboarding`
- `GET /users/me`

### What the frontend should send for protected routes

```http
Authorization: Bearer <access_token>
```

### What the backend extracts from JWT

```ts
{
  userId,
  email,
  userProfileId,
  tokenVersion
}
```

## Suggested Next Checks

If you want to continue hardening this area, the next useful checks would be:

1. remove or deprecate `UsersService.onboarding(data)` so only the authenticated path remains
2. add structured request logs for `userId` on signin, onboarding, logout, and `me`
3. verify there are no duplicate users by email/provider in the database
4. consider a refresh-token or per-device session model if logout should be scoped per device
