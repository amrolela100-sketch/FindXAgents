#!/usr/bin/env bash
# LOW-7: Daily PostgreSQL backup script
#
# Usage:
#   DATABASE_URL="postgresql://..." BACKUP_DIR="/backups" ./scripts/backup-db.sh
#
# Recommended: run via cron or Render cron job daily at 02:00 UTC
#   0 2 * * * /app/scripts/backup-db.sh >> /var/log/findx-backup.log 2>&1
#
# Retention: keeps last 7 daily backups, auto-deletes older ones.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/tmp/findx-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="findx_${TIMESTAMP}.sql.gz"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[backup] ERROR: DATABASE_URL is not set"
  exit 1
fi

mkdir -p "$BACKUP_DIR"

echo "[backup] Starting backup: $FILENAME"

# Dump and compress in one pipe — avoids large uncompressed temp files
pg_dump "$DATABASE_URL"   --no-owner   --no-acl   --format=plain   | gzip -9 > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -sh "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[backup] Done: $BACKUP_DIR/$FILENAME ($SIZE)"

# Rotate: delete backups older than RETENTION_DAYS
echo "[backup] Cleaning up backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -name "findx_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete
echo "[backup] Remaining backups:"
ls -lh "$BACKUP_DIR"/findx_*.sql.gz 2>/dev/null || echo "  (none)"
