#!/usr/bin/env bash
# Respaldo lógico de PostgreSQL (pg_dump, formato custom, comprimido).
#
# Conexión: variables estándar de libpq (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE) o las DB_*
# del .env de la aplicación. La contraseña se recomienda en ~/.pgpass (chmod 600) en vez de en el
# entorno. Nunca se imprime.
#
# Variables:
#   BACKUP_DIR           destino local (por defecto ~/backups/mi-comodoro, sin necesitar sudo)
#   RETENTION_DAYS       días que se conservan los respaldos locales (por defecto 14)
#   BACKUP_OFFSITE_DEST  destino rclone para copiar fuera del servidor (p. ej. "b2:mi-bucket/db"); opcional
#   BACKUP_PING_URL      URL a la que se avisa al terminar bien (healthchecks.io o similar); opcional
#
# Uso: scripts/db/backup.sh
set -euo pipefail

PGHOST="${PGHOST:-${DB_HOST:-localhost}}"
PGPORT="${PGPORT:-${DB_PORT:-5432}}"
PGUSER="${PGUSER:-${DB_USER:-postgres}}"
PGDATABASE="${PGDATABASE:-${DB_NAME:?Falta PGDATABASE o DB_NAME}}"
[ -n "${DB_PASSWORD:-}" ] && [ -z "${PGPASSWORD:-}" ] && export PGPASSWORD="$DB_PASSWORD"
export PGHOST PGPORT PGUSER PGDATABASE

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/mi-comodoro}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

log() { printf '%s [backup] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

# Los respaldos contienen datos financieros y personales: solo el dueño puede leerlos
umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
final="$BACKUP_DIR/${PGDATABASE}-${stamp}.dump"
partial="${final}.partial"
trap 'rm -f "$partial"' EXIT

log "Iniciando respaldo de ${PGDATABASE} en ${PGHOST}:${PGPORT}"
started=$(date +%s)
pg_dump --format=custom --compress=6 --no-owner --no-privileges --file="$partial"

# El archivo debe poder leerse como respaldo válido antes de darlo por bueno
tables=$(pg_restore --list "$partial" | grep -c ' TABLE DATA ' || true)
if [ "$tables" -lt 1 ]; then
  log "ERROR: el respaldo no contiene datos de tablas; se descarta"
  exit 1
fi

mv "$partial" "$final"
trap - EXIT
(cd "$BACKUP_DIR" && sha256sum "$(basename "$final")" > "$(basename "$final").sha256")
size=$(du -h "$final" | cut -f1)
log "OK ${final} (${size}, ${tables} tablas con datos, $(( $(date +%s) - started )) s)"

# Copia fuera del servidor: un respaldo en el mismo disco no protege contra la pérdida del disco
if [ -n "${BACKUP_OFFSITE_DEST:-}" ]; then
  if command -v rclone >/dev/null 2>&1; then
    rclone copyto "$final" "${BACKUP_OFFSITE_DEST%/}/$(basename "$final")"
    rclone copyto "${final}.sha256" "${BACKUP_OFFSITE_DEST%/}/$(basename "$final").sha256"
    log "Copia externa OK en ${BACKUP_OFFSITE_DEST}"
  else
    log "ERROR: BACKUP_OFFSITE_DEST está definido pero rclone no está instalado"
    exit 1
  fi
else
  log "AVISO: sin copia externa (BACKUP_OFFSITE_DEST no definido); el respaldo solo vive en este servidor"
fi

# Retención local
removed=$(find "$BACKUP_DIR" -maxdepth 1 -name "${PGDATABASE}-*.dump*" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
log "Retención ${RETENTION_DAYS} días: ${removed} archivos antiguos eliminados"

if [ -n "${BACKUP_PING_URL:-}" ]; then
  curl -fsS -m 10 --retry 3 "$BACKUP_PING_URL" >/dev/null && log "Aviso enviado"
fi
