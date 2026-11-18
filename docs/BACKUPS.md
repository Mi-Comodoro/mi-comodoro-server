# Respaldos y restauración de la base de datos

La base de datos guarda datos financieros y personales de las personas usuarias. Perderla, o no poder
recuperarla, es el peor incidente posible. Este documento define cómo se respalda, cómo se comprueba que
el respaldo sirve y qué hacer si hay que restaurar.

> Estado: los scripts están probados en local (respaldo, checksum, restauración en base temporal con
> conteos idénticos, detección de archivo dañado y retención). **Falta instalarlos y probarlos en el
> servidor** (secciones 2 y 5): hasta que se ejecute la primera prueba de restauración allí, no hay
> evidencia de que los respaldos de producción funcionen.

## 1. Objetivos

| Objetivo | Valor | Significado |
|---|---|---|
| **RPO** (cuántos datos se pueden perder) | ≤ 24 h | respaldo diario |
| **RTO** (cuánto tarda volver a operar) | medido en cada prueba | `restore-test.sh` imprime el tiempo de restauración |
| Retención local | 14 días | `RETENTION_DAYS` |
| Copia fuera del servidor | obligatoria | un respaldo en el mismo disco no protege si el disco falla |

24 horas de RPO es razonable para la beta. Cuando haya usuarios que registran movimientos a diario y
miles de ellos, el siguiente paso es archivado continuo de WAL con recuperación a un punto en el tiempo
(PITR), normalmente con Postgres administrado. Los respaldos lógicos de este documento seguirán siendo
útiles para migrar y para recuperar tablas concretas.

## 2. Instalación en el servidor (una sola vez)

Se ejecuta con el usuario que corre el runner/aplicación (`jarvis`), no como `root`.

```bash
# 1) Herramientas: la versión de pg_dump debe ser igual o mayor que la del servidor de Postgres
pg_dump --version && psql --version
sudo apt-get install -y postgresql-client rclone   # si falta alguna

# 2) Carpeta de respaldos, solo accesible por el dueño
sudo mkdir -p /var/backups/mi-comodoro && sudo chown jarvis:jarvis /var/backups/mi-comodoro
chmod 700 /var/backups/mi-comodoro

# 3) Credenciales fuera del entorno: ~/.pgpass  (host:puerto:base:usuario:contraseña)
echo "127.0.0.1:5432:NOMBRE_BASE:USUARIO:CONTRASEÑA" >> ~/.pgpass && chmod 600 ~/.pgpass

# 4) Copia externa (ejemplo con rclone; Backblaze B2, S3, Google Drive, etc.)
rclone config                                   # crear el remoto, p. ej. "respaldos"
```

Probar a mano **antes de programar nada**:

```bash
cd /var/www/intranet/mi-comodoro-server
export PGHOST=127.0.0.1 PGUSER=USUARIO PGDATABASE=NOMBRE_BASE
BACKUP_OFFSITE_DEST="respaldos:mi-comodoro/db" scripts/db/backup.sh
scripts/db/restore-test.sh        # restaura el más reciente en una base temporal y la borra
```

La salida de `restore-test.sh` debe terminar en `RESTAURACIÓN OK` con conteos de filas iguales entre la
base restaurada y la de origen.

### Programación diaria (cron del usuario `jarvis`)

```cron
# Respaldo diario a las 03:00 (hora del servidor) y prueba de restauración los domingos a las 04:00
0 3 * * *  cd /var/www/intranet/mi-comodoro-server && PGHOST=127.0.0.1 PGUSER=USUARIO PGDATABASE=NOMBRE_BASE BACKUP_OFFSITE_DEST="respaldos:mi-comodoro/db" BACKUP_PING_URL="https://hc-ping.com/TU-UUID" scripts/db/backup.sh >> /var/log/mi-comodoro-backup.log 2>&1
0 4 * * 0  cd /var/www/intranet/mi-comodoro-server && PGHOST=127.0.0.1 PGUSER=USUARIO PGDATABASE=NOMBRE_BASE scripts/db/restore-test.sh >> /var/log/mi-comodoro-backup.log 2>&1
```

`BACKUP_PING_URL` (opcional) permite un monitor tipo healthchecks.io: si el aviso diario **no llega**, el
monitor alerta. Así un respaldo que deja de ejecutarse no pasa desapercibido.

## 3. Qué hace cada script

- `scripts/db/backup.sh`: `pg_dump` en formato custom comprimido → archivo temporal → comprueba que es un
  respaldo legible y que contiene datos → lo renombra, escribe su `.sha256`, copia fuera del servidor
  (si hay `BACKUP_OFFSITE_DEST`), borra los locales con más de `RETENTION_DAYS` y avisa al monitor.
  Los archivos se crean con permisos `600` y la carpeta con `700`. Falla con código distinto de 0 si algo sale mal.
- `scripts/db/restore-test.sh`: verifica el checksum, restaura en `restore_test_<fecha>`, compara conteos de
  tablas clave con el origen, mide el tiempo y borra la base temporal. **Nunca toca la base de producción.**

## 4. Restaurar de verdad (incidente)

1. **Parar escrituras**: `pm2 stop mi-comodoro-server` (y el frontend si se quiere mostrar mantenimiento).
2. **Elegir el respaldo**: el más reciente en `/var/backups/mi-comodoro` o, si el disco se perdió, bajarlo de la copia externa
   (`rclone copy respaldos:mi-comodoro/db/ARCHIVO.dump /var/backups/mi-comodoro/`) y verificar `sha256sum -c`.
3. **Si la base original sigue existiendo**, conservarla renombrada antes de tocar nada:
   `psql -d postgres -c 'ALTER DATABASE NOMBRE_BASE RENAME TO NOMBRE_BASE_viejo'` (requiere que no haya conexiones).
4. **Restaurar** en una base nueva con el mismo nombre:
   ```bash
   psql -d postgres -c 'CREATE DATABASE NOMBRE_BASE'
   pg_restore --no-owner --no-privileges --exit-on-error --dbname=NOMBRE_BASE /var/backups/mi-comodoro/ARCHIVO.dump
   ```
5. **Aplicar migraciones pendientes** si el respaldo es anterior a un despliegue: `pnpm migration:run`.
6. **Arrancar** `pm2 start mi-comodoro-server` y comprobar `/api/v1/health` y un inicio de sesión.
7. **Registrar el incidente**: causa, hora, datos perdidos (diferencia entre la hora del respaldo y la del fallo) y decisiones.
   Si hubo pérdida o exposición de datos personales, activa el plan de incidentes (ver la revisión legal).

## 5. Qué hay que verificar y quién lo hace

| Qué | Cuándo | Evidencia |
|---|---|---|
| Primera prueba de restauración en el servidor | antes de abrir la beta | salida `RESTAURACIÓN OK` + RTO medido |
| Prueba semanal automática (cron) | cada domingo | línea en `/var/log/mi-comodoro-backup.log` |
| Alerta si falta el respaldo diario | continua | monitor (healthchecks.io o similar) |
| Prueba manual completa de la sección 4 en un servidor de prueba | cada 6 meses | acta breve en Notion |

## 6. Pendiente / límites conocidos

- Los respaldos contienen datos personales y financieros **sin cifrar en el archivo**. Mitigaciones actuales:
  permisos `600/700` y copia externa en un bucket privado con cifrado en reposo. Siguiente paso: cifrar el archivo
  (`age`/`gpg`) con una clave que **no** esté en el servidor.
- El respaldo es lógico y diario (RPO 24 h); no hay recuperación a un punto en el tiempo.
- Los respaldos antiguos deben respetar las solicitudes de eliminación de datos (Ley 1581): definir cuánto tiempo
  se conservan (hoy 14 días locales; definir lo mismo para la copia externa) y documentarlo en la política de privacidad.
- Un respaldo restaurado en otra máquina trae los datos reales: tratar esa máquina con el mismo cuidado que producción.
