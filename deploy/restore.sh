#!/bin/bash
# NiPOST Connect — Database Restore Script
# Usage: ./restore.sh nipost_connect_20260701_020000.sql.gz

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/nipost-connect}"
DB_NAME="${POSTGRES_DB:-nipost_connect}"
DB_USER="${POSTGRES_USER:-postgres}"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file.sql.gz>"
  echo "Available backups:"
  ls -lh "$BACKUP_DIR"/nipost_connect_*.sql.gz 2>/dev/null || echo "  (none found)"
  exit 1
fi

FULL_PATH="$BACKUP_DIR/$BACKUP_FILE"
if [ ! -f "$FULL_PATH" ]; then
  echo "File not found: $FULL_PATH"
  exit 1
fi

echo "WARNING: This will DROP and recreate the database '$DB_NAME'."
read -p "Type YES to continue: " confirm
if [ "$confirm" != "YES" ]; then echo "Aborted."; exit 0; fi

echo "[$(date)] Restoring from $BACKUP_FILE..."
dropdb -U "$DB_USER" "$DB_NAME" --if-exists
createdb -U "$DB_USER" "$DB_NAME"
gunzip -c "$FULL_PATH" | psql -U "$DB_USER" "$DB_NAME"
echo "[$(date)] Restore complete."
