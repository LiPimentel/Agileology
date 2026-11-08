# Endurecimiento de seguridad (antes de cambiar el dominio)

Qué se hizo en esta rama, qué debes hacer tú fuera del código y cómo comprobar que funciona.

## 1. Qué cambió en el código

| Área | Cambio |
|---|---|
| Dependencias | `sanitize-html`, `zod`, `nodemailer` y `prisma` actualizados a versiones sin fallos conocidos, con versión exacta. `npm audit`: 22 → 13, todas de herramientas de desarrollo. |
| Cabeceras | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`; se quita `X-Powered-By`. |
| CSP | Política de contenido por petición con *nonce* (`src/lib/csp.ts`, `src/proxy.ts`): solo corren los scripts con el nonce de esa petición. |
| HSTS | Solo se envía por HTTPS. Empieza en 180 días. |
| IP real | `src/lib/clientIp.ts`: con `TRUSTED_IP_HEADER` solo se cree a la cabecera de tu proxy. |
| Límites | El inicio de sesión se limita por correo **y por IP**; el limitador libera memoria; un código 2FA no se puede usar dos veces. |
| Inicio de sesión | Mismo mensaje y mismo tiempo tenga o no cuenta el correo; la IP queda en la auditoría. |
| Sesiones | En la base de datos solo se guarda el SHA-256 del token. |
| 2FA | El secreto se guarda cifrado (AES-256-GCM) con `TWO_FACTOR_KEY`. |
| Contenedor | Corre como usuario `node` (no root), sin capacidades de Linux, con comprobación de salud (`/api/health`). |
| Respaldos | `scripts/backup.sh`: base + archivos, cifrados, con prueba de lectura y limpieza automática. |

## 2. Variables de entorno nuevas (`.env`)

- `TWO_FACTOR_KEY`: 64 caracteres hexadecimales (`openssl rand -hex 32`). **Guárdala fuera del servidor.** Si se pierde, hay que volver a activar el 2FA.
- `TRUSTED_IP_HEADER=cf-connecting-ip`: pon esto cuando uses Cloudflare. Sin esto, la IP se toma de `X-Forwarded-For`, que cualquiera puede falsificar.
- `APP_BIND=127.0.0.1`: cuando solo el túnel (en la misma máquina) deba llegar a la app.

## 3. Pasos tuyos (no son código)

1. **Cloudflare Tunnel** hacia `http://localhost:3000` (gratis), con `APP_BIND=127.0.0.1` y `TRUSTED_IP_HEADER=cf-connecting-ip`.
2. **Cloudflare Access** (Zero Trust, gratis hasta 50 usuarios): una aplicación para `agileologywave.com/admin*` que solo deje entrar a tu correo. Es una segunda puerta delante del login.
3. `NEXT_PUBLIC_SITE_URL=https://agileologywave.com` y `COOKIE_SECURE=true` (o quitar la línea) en `.env`.
4. **Programar el respaldo**: copia `scripts/com.agileology.backup.plist.example` a `~/Library/LaunchAgents/`, corrige tu usuario y `launchctl load`. **Guarda la frase de `~/.agileology-backup-pass` en un gestor de contraseñas**: sin ella no se pueden abrir los respaldos. Copia también la carpeta de respaldos fuera del equipo (disco externo o nube).
4b. Una vez al mes, restaura un respaldo en una base de prueba (apartado 5) para estar seguros de que sirve.
5. Borra `ADMIN_SEED_PASSWORD` de `.env` si esa ya no es tu contraseña real.
6. Mantén Wix activo hasta que el sitio nuevo responda por el dominio (ver el plan de salida).

## 4. Después de desplegar esta versión

- Todas las sesiones se cierran una vez (cambió cómo se guardan): vuelve a entrar.
- Cifra los secretos 2FA existentes, una sola vez:
  `docker compose run --rm --no-deps -T -v "$PWD/scripts:/app/scripts:ro" app npx tsx scripts/encrypt-2fa-secrets.ts --apply`
  (antes sin `--apply` para ver qué haría). La aplicación lee los dos formatos, así que el orden no importa.
- En Linux: `mkdir -p uploads && chown 1000:1000 uploads` (el contenedor ya no es root).
- Borra las sesiones antiguas: `docker exec agileology-db psql -U agileology -d agileology -c 'delete from "Session"'`.

## 5. Restaurar un respaldo

```
# base de datos (descifra y restaura en una base NUEVA llamada agileology_prueba)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass file:$HOME/.agileology-backup-pass -in db-FECHA.dump.enc \
  | docker exec -i agileology-db pg_restore -U agileology -d agileology_prueba --create --no-owner
# archivos
openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass file:$HOME/.agileology-backup-pass -in uploads-FECHA.tar.gz.enc | tar -xzf - -C uploads
```

## 6. Qué NO cubre (riesgos aceptados o pendientes)

- No hay roles: todo administrador lo ve y lo puede todo (incluida la auditoría).
- El limitador de intentos vive en memoria de un solo proceso (basta para una instancia).
- Un código 2FA se rechaza si se repite, pero esa memoria se pierde al reiniciar la app.
- `npm audit` mantiene 13 alertas en herramientas de desarrollo (`eslint` y similares): no corren en producción.
- Los respaldos viven en el mismo equipo hasta que los copies fuera.
