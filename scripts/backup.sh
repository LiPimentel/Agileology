#!/usr/bin/env bash
# Encrypted backup of the database and the uploaded files, with automatic clean-up.
#
#   scripts/backup.sh
#
# Needs a passphrase file (default ~/.agileology-backup-pass, mode 600). KEEP A COPY OF THAT
# PASSPHRASE SOMEWHERE ELSE (password manager): without it the backups cannot be opened.
# Each run proves the new database backup can be read back before it counts as done.
set -euo pipefail

cd "$(dirname "$0")/.."
DEST="${BACKUP_DIR:-$HOME/Backups/agileology/auto}"
PASS_FILE="${BACKUP_PASSPHRASE_FILE:-$HOME/.agileology-backup-pass}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
DB_CONTAINER="${DB_CONTAINER:-agileology-db}"
STAMP="$(date +%Y%m%d-%H%M%S)"

[ -f "$PASS_FILE" ] || { echo "ERROR: falta la frase de cifrado en $PASS_FILE (crea una larga y aleatoria: openssl rand -base64 36 > \"$PASS_FILE\" && chmod 600 \"$PASS_FILE\")"; exit 1; }
perm="$(stat -c '%a' "$PASS_FILE" 2>/dev/null || stat -f '%Lp' "$PASS_FILE")"   # GNU first, then macOS/BSD
[ "$perm" = "600" ] || { echo "ERROR: $PASS_FILE debe tener permisos 600"; exit 1; }

umask 077
mkdir -p "$DEST" "$HOME/Backups/agileology"
ENC=(openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass "file:$PASS_FILE")
DEC=(openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass "file:$PASS_FILE")

DB_OUT="$DEST/db-$STAMP.dump.enc"
docker exec "$DB_CONTAINER" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' | "${ENC[@]}" -out "$DB_OUT"
# Read it back: decrypt and let pg_restore list the contents. A broken backup fails loudly here.
"${DEC[@]}" -in "$DB_OUT" | docker exec -i "$DB_CONTAINER" pg_restore -l >/dev/null

UP_OUT="$DEST/uploads-$STAMP.tar.gz.enc"
tar -C uploads -czf - . | "${ENC[@]}" -out "$UP_OUT"
"${DEC[@]}" -in "$UP_OUT" | tar -tzf - >/dev/null

# Keep the last $KEEP_DAYS days.
# Only this script's own files, in this folder only (never anything else a wrong BACKUP_DIR might hold).
find "$DEST" -maxdepth 1 -type f \( -name 'db-*.enc' -o -name 'uploads-*.enc' \) -mtime +"$KEEP_DAYS" -delete

echo "OK $(date '+%F %T') · base: $(du -h "$DB_OUT" | cut -f1) · archivos: $(du -h "$UP_OUT" | cut -f1) · destino: $DEST"
