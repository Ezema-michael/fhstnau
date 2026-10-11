# FHST Journal and Scientific Conference platform

Source exported from the current `fhst-digital-platform` Sites repository, commit `fb27111b134749ce578e93c8269c25ac0bdbda59`.

Includes the faculty website, journal and conference pages, author/reviewer/editor portal, editable content, publications, sample assets and database migrations.

## Hosting dependencies

This is a Cloudflare Worker/Vinext application using D1 (`DB`), R2 (`BUCKET`) and Sites-owned ChatGPT authentication. It is not yet a standalone VPS deployment. VPS hosting requires replacement authentication and database/storage adapters or an equivalent compatible runtime.

Live database records, user accounts and uploaded manuscripts are not included. Included test assets are samples.

Set `FHST_EDITOR_USER_ID` or `FHST_EDITOR_EMAIL` as server-side runtime configuration for the initial editor. The GitHub copy preserves environment-based editor configuration instead of the hosted owner's hardcoded identity. Never commit credentials.

See [development instructions](README-DEVELOPMENT.md) for installation and build details.
