# Database Backup Strategy

## LOW-7: Automated Daily Backups

FindX uses a shell-script-based backup strategy for PostgreSQL.

### Local / Self-hosted

```bash
# One-time backup
DATABASE_URL="postgresql://..." ./scripts/backup-db.sh

# Daily cron (add to crontab)
0 2 * * * DATABASE_URL="..." BACKUP_DIR="/backups" /app/scripts/backup-db.sh
```

### Render Deployment

1. Enable **Point-in-Time Recovery** on your Render PostgreSQL instance (paid plans).
2. Alternatively, add a **Render Cron Job** service:
   - **Command:** `./scripts/backup-db.sh`
   - **Schedule:** `0 2 * * *`
   - **Environment:** `DATABASE_URL`, `BACKUP_DIR=/tmp/backups`

### Backup Retention

The script keeps the **last 7 daily backups** and auto-deletes older ones.
Adjust `RETENTION_DAYS` env var to change this.

### Restore

```bash
gunzip -c findx_20260101_020000.sql.gz | psql "$DATABASE_URL"
```

### Verification

After each backup, spot-check row counts:
```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM leads;"
```
