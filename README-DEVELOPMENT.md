# Local VPS development

Requires Node.js 24.13 or later and pnpm 11.25.0. Install with `pnpm install --frozen-lockfile`.

Copy `.env.example` to `.env`. For loopback development only, set `APP_URL=http://localhost:3000` and `COOKIE_SECURE=false`. Keep private review enabled. Next.js loads this file; account scripts use their process environment.

Run `pnpm dev`. For initial accounts outside Docker, run `DATA_DIR=./data node scripts/account.mjs editor@example.org "Test Editor" editor` in an interactive terminal. The database initialises from tracked SQL migrations. Use test-only accounts and manuscripts during development.

Run `pnpm build` and `pnpm test:vps` for the production HTTP workflow check. Tests run on 127.0.0.1:3337 and use a disposable database. Existing Sites data is not accessed.

For production configuration, proxy choices and backups, read DEPLOY-VPS.md.
