#!/bin/bash
# NiPOST Connect — PostgreSQL Backup Script
# Add to cron: 0 2 * * * /var/www/nipost-connect/deploy/backup.sh >> /var/log/nipost-backup.log 2>&1

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
DB_NAME="${POSTGRES_DB:-nipost_connect}"
DB_USER="${POSTGRES_USER:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/nipost-connect}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="nipost_connect_${DATE}.sql.gz"

# ── Create backup dir ─────────────────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── Dump database ─────────────────────────────────────────────────────────────
echo "[$(date)] Starting backup: $FILENAME"
pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[$(date)] Backup complete: $FILENAME ($SIZE)"

# ── Remove old backups ────────────────────────────────────────────────────────
find "$BACKUP_DIR" -name "nipost_connect_*.sql.gz" -mtime "+${KEEP_DAYS}" -delete
REMAINING=$(find "$BACKUP_DIR" -name "nipost_connect_*.sql.gz" | wc -l)
echo "[$(date)] Retained $REMAINING backups (last ${KEEP_DAYS} days)"

# ── Optional: Upload to remote storage ───────────────────────────────────────
# Uncomment and configure for S3/Cloudflare R2:
# aws s3 cp "$BACKUP_DIR/$FILENAME" "s3://your-bucket/nipost-backups/$FILENAME"

echo "[$(date)] Done."
