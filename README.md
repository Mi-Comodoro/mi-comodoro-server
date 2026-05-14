# FinHub Server

API backend para la gestion de finanzas personales y del hogar, construida con NestJS, TypeORM y PostgreSQL.

Su responsabilidad principal es exponer endpoints HTTP para autenticacion, onboarding, presupuestos, ingresos, gastos, transacciones, ahorros, cuentas y gestion del perfil de usuario, manteniendo una separacion estricta entre dominio, casos de uso e infraestructura.

## Proposito

- Centralizar la logica de negocio financiera del ecosistema FinHub.
- Exponer una API autenticada para clientes web y otros consumidores.
- Mantener una arquitectura modular y hexagonal que facilite el mantenimiento y la evolucion controlada.

## Stack tecnologico

- NestJS
- TypeScript
- TypeORM
- PostgreSQL
- Passport JWT
- Swagger
- class-validator / class-transformer
- Firebase Admin SDK
- EventEmitter2

## Arquitectura

El proyecto sigue una arquitectura hexagonal por modulo dentro de `src/modules/api/modules/`.

Flujo estructural:

`domain -> application -> infrastructure`

### Capas

- `domain/`
  Define contratos y modelos de negocio.
  Incluye entidades de dominio, enums e interfaces de repositorio.

- `application/`
  Implementa casos de uso y la orquestacion de reglas de negocio.
  Los services consumen unicamente contratos del dominio.

- `infrastructure/`
  Resuelve los detalles tecnicos.
  Incluye controllers, DTOs, entities de TypeORM, mappers e implementaciones de repositorio.

### Reglas de implementacion

- Los controllers delegan en services y no deben contener logica de persistencia.
- Los services consumen repositorios mediante interfaces usando string tokens.
- Las implementaciones de repositorio TypeORM viven en `infrastructure/repositories/`.
- Las rutas privadas usan `@UseGuards(AuthGuard('jwt'))`.
- El usuario autenticado se resuelve con `@CurrentUser()`.
- Las respuestas exitosas no se envuelven manualmente; `ResponseInterceptor` estandariza el contrato de respuesta.
- Los errores deben expresarse con excepciones nativas de NestJS.
- El logging de aplicacion se canaliza a traves de `LoggerProviderService`.

## Estructura del proyecto

```text
src/
|-- common/                  # Decoradores, constantes y utilidades transversales
|-- core/                    # Bootstrap, configuracion, seguridad, filtros, interceptores y providers
|-- modules/
|   `-- api/
|       `-- modules/
|           |-- accounts/
|           |-- auth/
|           |-- bills/
|           |-- budgets/
|           |-- categories/
|           |-- expenses/
|           |-- finances/
|           |-- health/
|           |-- incomes/
|           |-- savings/
|           |-- shared/
|           |-- transactions/
|           |-- user-profile/
|           `-- users/
|-- scripts/                 # Scripts operativos como seeds
`-- types/                   # Tipos compartidos
```

### Estructura esperada por modulo

```text
module/
|-- domain/
|   |-- [entity].ts
|   |-- enums/
|   `-- repositories/
|-- application/
|   `-- services/
`-- infrastructure/
    |-- controller/
    |-- database/entities/
    |-- dto/
    |-- mapper/
    `-- repositories/
```

## Modulos funcionales

El backend incluye actualmente los siguientes modulos de negocio:

- `auth`: registro local, inicio de sesion local, inicio de sesion con Google, refresh de token y logout.
- `users`: resolucion del usuario autenticado y flujo de onboarding.
- `user-profile`: gestion del perfil del usuario.
- `finances`: configuracion financiera asociada al usuario.
- `budgets`: creacion, consulta, activacion y resumen historico de presupuestos.
- `incomes`: flujos de ingresos planificados y no planificados.
- `expenses`: flujos de gastos planificados y no planificados.
- `transactions`: consulta y mantenimiento de transacciones.
- `savings`: metas, asignaciones y ahorros planificados.
- `accounts`: cuentas financieras del usuario.
- `categories`: catalogo de categorias.
- `bills`: estructuras relacionadas con facturas.
- `health`: endpoint basico de salud del servicio.
- `shared`: elementos compartidos a nivel de modulo.

## Contratos transversales

### Autenticacion

- JWT es el mecanismo principal de autenticacion.
- El payload autenticado se valida mediante `JwtStrategy`.
- La invalidacion de sesion se soporta mediante `tokenVersion`.

### Contrato de respuesta HTTP

Las respuestas exitosas siguen el contrato estandarizado por el interceptor global:

```json
{
  "success": true,
  "data": {}
}
```

### Documentacion de API

- Swagger se habilita en entornos `local` y `development`.
- La ruta base de documentacion es `api-docs`.

## Ejecucion local

### Requisitos

- Node.js `22.11.x`
- npm `11.5.2`
- PostgreSQL accesible desde la configuracion local

### Instalacion

```bash
npm install
```

### Comandos disponibles

```bash
npm run start
npm run start:dev
npm run start:prod
npm run build
npm run lint
npm run format
npm run seed:categories
```

### Bootstrap de la aplicacion

- El puerto por defecto es `9000` cuando `APP_PORT` no esta definido.
- Swagger se registra solo fuera de produccion.
- Los pipes, filtros e interceptores globales se configuran durante el arranque.

## Configuracion

El proyecto utiliza `@nestjs/config` con servicios de configuracion modulares.

### Variables de entorno observables en el codigo

#### Aplicacion

- `NODE_ENV`
- `APP_NAME`
- `APP_URL`
- `APP_PORT`

#### Swagger

- `SWAGGER_URL`

#### JWT

- `JWT_SECRET`
- `JWT_EXPIRES_IN`

#### PostgreSQL

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

#### Firebase Admin

- `FB_PROJECT_ID`
- `FB_CLIENT_EMAIL`
- `FB_PRIVATE_KEY`

## Persistencia

- La aplicacion usa PostgreSQL a traves de TypeORM.
- `autoLoadEntities` esta habilitado.
- `synchronize` esta habilitado actualmente en `DatabaseModule`.

Esto implica que el comportamiento de sincronizacion de esquema debe tratarse con cuidado en entornos controlados.

## Seguridad

- Las rutas privadas estan protegidas con `AuthGuard('jwt')`.
- El usuario autenticado se resuelve mediante `@CurrentUser()`.
- Los tokens se generan desde `JwtProvider`.
- La invalidacion de sesion se basa en `tokenVersion`.

## Logging y observabilidad

- El proyecto usa `LoggerProviderService` como proveedor central de logs.
- Los interceptores y filtros globales estandarizan la trazabilidad de requests y el manejo de errores.
- Existe un endpoint de salud disponible a traves del modulo `health`.

## Documentacion adicional

- [CLAUDE.md](./CLAUDE.md): contexto operativo y reglas del proyecto.

## Desarrollo

### Requisitos
- Node 22 (ver .nvmrc)
- PostgreSQL 15+
- pnpm

### Setup
```bash
nvm use
pnpm install
cp .env.example .env   # completar variables
```

### Variables de entorno requeridas
```
DATABASE_URL=postgresql://user:pass@localhost:5432/micomodoro
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Migraciones
```bash
npx typeorm migration:run -d src/core/config/database/typeorm.config.ts
```

### Backup
```bash
./scripts/backup.sh
```

### Branching
- main → producción (solo releases taggeados)
- develop → staging / integración
- feat/* fix/* → ramas de trabajo, salen de develop

## Criterios de mantenimiento

Este README documenta unicamente informacion estable y verificable en el codigo actual:

- proposito del servicio
- stack
- arquitectura
- estructura
- contratos transversales
- ejecucion local
- configuracion observable

Se excluyen intencionalmente tareas temporales, roadmap y detalles de implementacion que todavia puedan cambiar.
