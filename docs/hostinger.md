# Hostinger deployment runbook

Target domain: **playchambana.com** (owner has not purchased it yet). Having another domain at Hostinger does not establish that the account has Node.js hosting. No deployment or DNS changes have been made.

## 1. Confirm hosting before buying

In hPanel, look for **Websites → Add website → Node.js Apps**. Hostinger documents managed Node apps on Business/Cloud plans; a VPS is another option. Confirm your specific plan supports:

- Node 24, Next.js server rendering/actions, and native `sharp` installation.
- A 10 MB request body and at least 60 seconds request execution. Test this; framework configuration does not override a host limit.
- Private environment variables, HTTPS, logs, and an external or host scheduler.

This app cannot run as static HTML or in WordPress hosting. Do not purchase a plan based only on its domain features. See [Hostinger's Node deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).

## 2. Deploy the repository

Connect `phillyzhao/chambana` in the Node.js app setup. Use repository root, Next.js, Node 24, `npm ci && npm run build`, and `npm start` when custom start settings are available. Honor the host-provided `PORT`. Do not use `next dev` in production.

Configure all variables from `.env.example` as private host environment values (the two `NEXT_PUBLIC_SUPABASE_*` values are intentionally public). Set `APP_URL` to the actual HTTPS hostname used for testing; later set it to `https://playchambana.com`. Keep `AUTH_MICROSOFT_ENABLED=false` until the provider is configured and ready for acceptance testing. Set a monitored `SUPPORT_EMAIL`. Do not upload `.env.local` or place keys in GitHub.

Run `npm run preflight -- --production` in that environment, then deploy. The preflight validates configuration shape, not provider credentials or host capabilities. Public variables must be available at build time; rebuild after changing them. If using multiple app instances, review Next.js shared cache and Server Action encryption-key requirements before scaling.

## 3. Domain and auth

Purchase the domain yourself, add it to this hosting app, and apply **only the DNS records given by your Hostinger app**. Do not change DNS for your other domain. Confirm HTTPS, choose the bare domain as canonical, and redirect `www` to it.

In Supabase Authentication → URL Configuration:

- Site URL: `https://playchambana.com`
- Redirect URL: `https://playchambana.com/auth/callback`
- Keep `http://localhost:3000/auth/callback` for local development.

Microsoft's Web redirect URI remains the **Supabase** `/auth/v1/callback` URL, not the domain's `/auth/callback`. See [Microsoft setup](microsoft-auth.md). Configure production SMTP and test delivery to Illinois inboxes before inviting users.

## 4. Recovery and monitoring

Run `npm run cron:verify` every minute from a trusted runner with `APP_URL` and `CRON_SECRET` set privately. The script sends the secret in a header, rejects redirects, times out after 55 seconds, and exits nonzero for failed jobs. A managed Hostinger web app does not guarantee cron access; use a trusted external scheduler if necessary. Never put the secret in a URL or public workflow.

Monitor `GET /api/health` for 200. This checks the public database path and required server configuration, **not** Gemini, SMTP, or the scheduler. Alert on health/cron failures and `photo_provider_http_*`, `photo_review_needs_human`, `photo_upload_failed`, and `queue_*` events in private server logs. Events contain IDs/status codes, not photos, emails, or secret values.

For a VPS reverse proxy, forward the public host accurately, allow 10 MB bodies, and set appropriate upstream timeouts. Keep the Node port private behind HTTPS. Do not add wildcard Server Action origins to work around a proxy mistake.

## 5. Go/no-go and rollback

Before opening signups, run the README acceptance checklist on the real hostname: email/Microsoft callbacks, two-member mission flow, admin review, actual phone photos near the upload limit, duplicate-submit protection, and cron recovery. Confirm privacy/support/retention decisions in [operations](operations.md).

If deployment fails, return the hosting app to its previous verified commit and environment configuration. Do not reset the production database. Migrations are forward-only and the new fields are additive; fix schema issues with a new migration. Keep backups and test restore procedures before launch.
