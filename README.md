# FHST Journal and Scientific Conference — VPS edition

Standalone Next.js/Node.js application with SQLite, private filesystem uploads and ordinary email/password accounts. Docker Compose persists the database and manuscripts, and defaults to private Faculty review.

See [DEPLOY-VPS.md](DEPLOY-VPS.md) for installation, proxy configuration, accounts, updates and backups. Use the `vps-deployment` branch for VPS deployment; the Sites version remains separately hosted.

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test:vps
```

Copy `.env.example` to `.env` and configure your hostname before starting. Existing Sites data and uploaded files are not part of this repository and require separate migration. Public self-registration and email password recovery are not included in this Faculty-review edition.
