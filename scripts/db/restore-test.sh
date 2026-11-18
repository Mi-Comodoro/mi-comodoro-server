#!/usr/bin/env bash
# Prueba de restauración: restaura un respaldo en una base TEMPORAL, comprueba que los datos están y la borra.
# Un respaldo que nunca se ha restaurado no es un respaldo. Úsalo después de cada cambio importante y,
# como mínimo, una vez al mes.
#
# Nunca toca la base de producción: crea y elimina "restore_test_<fecha>".
#
# Variables: las mismas de conexión que backup.sh y
#   BACKUP_DIR   dónde buscar (por defecto /var/backups/mi-comodoro)
#   BACKUP_FILE  archivo concreto a probar; si no se indica se usa el más reciente
#   COMPARE_DB   base de origen para comparar conteos de filas (opcional, por defecto la de conexión)
#
# Uso: scripts/db/restore-test.sh [archivo.dump]
set -euo pipefail

PGHOST="${PGHOST:-${DB_HOST:-localhost}}"
PGPORT="${PGPORT:-${DB_PORT:-5432}}"
PGUSER="${PGUSER:-${DB_USER:-postgres}}"
SOURCE_DB="${COMPARE_DB:-${PGDATABASE:-${DB_NAME:-}}}"
[ -n "${DB_PASSWORD:-}" ] && [ -z "${PGPASSWORD:-}" ] && export PGPASSWORD="$DB_PASSWORD"
export PGHOST PGPORT PGUSER
BACKUP_DIR="${BACKUP_DIR:-/var/backups/mi-comodoro}"

log() { printf '%s [restore-test] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

file="${1:-${BACKUP_FILE:-}}"
if [ -z "$file" ]; then
  file="$(ls -1t "$BACKUP_DIR"/*.dump 2>/dev/null | head -n1 || true)"
fi
[ -n "$file" ] && [ -f "$file" ] || { log "ERROR: no hay respaldo para probar en $BACKUP_DIR"; exit 1; }

# Integridad del archivo
if [ -f "${file}.sha256" ]; then
  (cd "$(dirname "$file")" && sha256sum -c "$(basename "$file").sha256" >/dev/null) \
    && log "Checksum OK" || { log "ERROR: el checksum no coincide, el archivo está dañado"; exit 1; }
else
  log "AVISO: no hay archivo .sha256 junto al respaldo"
fi

scratch="restore_test_$(date -u +%Y%m%dT%H%M%S)"
cleanup() { psql -d postgres -qAt -c "DROP DATABASE IF EXISTS \"$scratch\"" >/dev/null 2>&1 || true; }
trap cleanup EXIT

log "Restaurando $(basename "$file") en la base temporal ${scratch}"
started=$(date +%s)
psql -d postgres -qAt -c "CREATE DATABASE \"$scratch\"" >/dev/null
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$scratch" "$file"
elapsed=$(( $(date +%s) - started ))

count() { psql -d "$1" -qAt -c "SELECT count(*) FROM $2" 2>/dev/null || echo "-"; }

status=0
printf '\n%-22s %12s %12s\n' "tabla" "restaurada" "origen"
for table in users budgets transactions saving_goals planned_savings expenses_planned incomes_planned user_groups migrations; do
  restored="$(count "$scratch" "\"$table\"")"
  source_count="-"
  [ -n "$SOURCE_DB" ] && source_count="$(count "$SOURCE_DB" "\"$table\"")"
  printf '%-22s %12s %12s\n' "$table" "$restored" "$source_count"
  # Si el origen tiene filas y lo restaurado está vacío o falta la tabla, la restauración falló
  if [ "$source_count" != "-" ] && [ "$source_count" != "0" ] && { [ "$restored" = "-" ] || [ "$restored" = "0" ]; }; then
    status=1
  fi
done

tables=$(psql -d "$scratch" -qAt -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'")
printf '\n'
if [ "$status" -eq 0 ] && [ "$tables" -gt 0 ]; then
  log "RESTAURACIÓN OK: ${tables} tablas, tiempo de restauración ${elapsed} s (este es tu RTO medido para este volumen)"
else
  log "ERROR: la restauración no reprodujo los datos esperados"
  exit 1
fi
