# FHST VPS deployment

This branch is the standalone Node.js/Next.js edition. It uses SQLite and filesystem storage on a persistent Docker volume. Email/password accounts work without ChatGPT. The Sites deployment is separate and is not changed by deploying this branch.

## Before deployment

- An Ubuntu/Linux VPS with Docker Engine and the Compose plugin.
- A subdomain you control, for example `review.fhstnau.org`, with an A record pointing at the VPS. Only add an AAAA record if IPv6 routing is configured.
- HTTPS termination through the existing reverse proxy or the optional Caddy container.
- Enough disk space for the database, manuscripts, images, container images and backups.
- One application replica on local disk. Do not put the SQLite volume on NFS or share it between several app replicas.

The current package is for private Faculty evaluation. There is no public self-registration or automated email delivery. Administrators provision accounts and reset passwords interactively. A verified-email registration and recovery workflow should be added before general public author registration.

## 1. Get the VPS branch

```bash
sudo mkdir -p /opt/fhst
sudo chown "$USER":"$USER" /opt/fhst
git clone --branch vps-deployment https://github.com/Ezema-michael/fhstnau.git /opt/fhst
cd /opt/fhst
cp .env.example .env
chmod 600 .env
nano .env
```

Set `DOMAIN` to the real hostname and `APP_URL` to its exact HTTPS origin. Keep `REVIEW_PRIVATE=true` and `COOKIE_SECURE=true`. Passwords do not belong in `.env` or GitHub.

The new VPS database starts empty. Existing Sites accounts, content edits stored in D1, submitted manuscripts and R2 files are **not** automatically copied. The repository includes draft content and fictional samples. A separate, controlled export/import is needed if existing live records must migrate; do not copy identity headers or access tokens.

## 2. Choose the proxy arrangement

### Existing Caddy, Nginx or other proxy

Use this option when another site already occupies ports 80 and 443. The base Compose file exposes the app only at `127.0.0.1:3100`; it does not start another proxy.

```bash
docker compose up -d --build
docker compose ps
curl --fail http://127.0.0.1:3100/api/health
```

For a reverse proxy installed directly on the VPS, proxy the review hostname to `127.0.0.1:3100`, preserve the public Host header and set `X-Real-IP` from the actual client address. Set a request-size limit of 12 MB and permit HTTPS. Do not trust a client-provided `X-Real-IP`.

If the existing Caddy runs in Docker, use a shared network:

```bash
docker network create fhst_proxy
# Use the existing Caddy container name from docker ps:
docker network connect fhst_proxy aurasalon-caddy-1
docker compose -f compose.yml -f deploy/compose.external-proxy.yml up -d --build
```

Add the following block to the existing Caddy configuration, replacing the example hostname:

```caddyfile
review.fhstnau.org {
    request_body {
        max_size 12MB
    }
    reverse_proxy fhst-app:3000 {
        header_up X-Real-IP {remote_host}
    }
}
```

Validate and reload the existing proxy using its deployment procedure. Persist the `fhst_proxy` network in the existing Caddy Compose configuration too; a one-time `docker network connect` is lost when that container is recreated. The `aurasalon-caddy-1` name is an example from your existing VPS; verify it with `docker ps` first. Avoid deleting or restarting unrelated services.

### Dedicated VPS with ports 80/443 available

```bash
docker compose -f compose.yml -f deploy/compose.caddy.yml up -d --build
docker compose -f compose.yml -f deploy/compose.caddy.yml ps
```

Caddy obtains HTTPS certificates after DNS and network access are correct. Allow inbound 80/443 and your existing SSH port through the VPS firewall. Do not expose port 3100 publicly. Use the same Compose file combination for subsequent updates and restarts.

## 3. Create accounts

Wait until the app is healthy, then run:

```bash
docker compose exec app node scripts/account.mjs editor@example.org "Faculty Editor" editor
docker compose exec app node scripts/account.mjs reviewer@example.org "Faculty Reviewer" reviewer
docker compose exec app node scripts/account.mjs author@example.org "Test Author" author
```

Replace the example details with real ones. Enter a unique temporary password of 12–128 characters at the hidden prompt. Send credentials individually through your chosen secure channel. The user must change the temporary password before using the site. Saving a reviewer/editor role in the portal does not send an email or provision a new password account.

To reset a password, run the same command with that person's current email, name and intended role. This revokes their sessions and requires another first-login password change. Account roles are explicit; there is no hardcoded privileged email.

Sessions use random tokens stored as hashes, expire after eight hours, and are carried in HttpOnly, SameSite cookies. Sign-in attempts are limited by account and proxy-supplied IP. Mutating browser requests require the configured origin. Access is checked again by portal endpoints.

## 4. Faculty review

Visit `https://YOUR_HOSTNAME/login`, sign in and change the temporary password. Anonymous users should see the sign-in page. The complete site is protected while `REVIEW_PRIVATE=true`; this is independent of whether public submissions are marked open in website content.

Test an author creating and uploading a draft, submission, editor assignment, reviewer feedback, revision, acceptance, final PDF preparation and publication. Also test that an unassigned reviewer cannot download a private manuscript. Fictional samples can be restored or deleted from Portal → Testing samples by an editor.

## 5. Update

Take a backup first. From `/opt/fhst`:

```bash
git pull --ff-only origin vps-deployment
docker compose up -d --build
docker compose ps
```

Use your selected overlay too if applicable. SQL migrations run at first database access, record checksums and refuse changes to already-applied migrations. Failed migrations roll back. The deployment uses the checkout you build; there is no CI/CD auto-deployment configured by this preparation.

## Backups and restore

The `fhst_data` volume contains the SQLite database, WAL state and all uploaded files. Never run `docker compose down -v` on a live deployment.

For an online database-only snapshot:

```bash
docker compose exec app node scripts/backup.mjs
```

A database-only snapshot is not a complete manuscript backup. For a consistent complete backup, stop the application during the archive:

```bash
mkdir -p backups
docker compose stop app
docker compose run --rm --no-deps --user root --entrypoint tar app -C /data -czf /backups/fhst-full-backup.tar.gz .
docker compose cp app:/backups/fhst-full-backup.tar.gz ./backups/fhst-full-backup.tar.gz
docker compose start app
```

Copy the archive to separate, access-controlled storage outside the VPS. Rename each backup locally to preserve history; never rely on one overwritten archive. Verify extraction and test recovery on an isolated deployment regularly. Backups contain manuscript files and account hashes and must remain private.

To restore, stop the app, take a current backup, and restore the complete archive into a fresh empty data volume using a compatible version of the application. Check its ownership is UID/GID 1000 and start only after verifying the restore. Do not extract over a running database or reuse a partial archive. An application rollback may also require a matching database backup if migrations changed the schema.

## Public launch later

Faculty approval, official contacts, privacy/retention terms, fees and licensing must be finalised first. Review the need for verified email registration/recovery, journal corrections/version history, separate anonymised reviewer files, preservation and monitoring. Changing `REVIEW_PRIVATE=false` opens public pages; it does not add those workflows or open manuscript submissions. Portal permissions remain enforced.

## Validation and limits

Run `pnpm build` and `pnpm test:vps`. The automated integration test uses a temporary database and actual production HTTP routes for sign-in, forced password change, access restrictions, manuscript upload, assignment, review and publication. It does not contact the Faculty or migrate existing Sites data.

This environment did not provide Docker Engine, so image building, the actual Compose deployment, DNS and HTTPS must be checked on your VPS. This package has not been deployed to a server by Codex.
