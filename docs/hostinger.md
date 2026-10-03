# Hostinger deployment runbook

Production domain: **https://playchambana.com**. The last exact Hostinger deployment recorded here was verified September 28, 2026: completed commit `6e7e7554` on `main`, deployed September 26 at 19:02 with Node 24 and auto-deployment enabled. Later releases have been pushed; their exact completed Hostinger commit still needs inspection. On October 3, public production showed the group-category display and health returned 200. These observations do not identify the exact deployed revision. The setup instructions below are a recovery reference, not a request to repeat existing setup.

## 1. Confirm hosting before buying

In hPanel, look for **Websites → Add website → Node.js Apps**. Hostinger documents managed Node apps on Business/Cloud plans; a VPS is another option. Confirm your specific plan supports:

- Node 24, Next.js server rendering/actions, and native `sharp` installation.
- A 10 MB request body and at least 60 seconds request execution. Test this; framework configuration does not override a host limit.
- Private environment variables, HTTPS, logs, and an external or host scheduler.

This app cannot run as static HTML or in WordPress hosting. Do not purchase a plan based only on its domain features. See [Hostinger's Node deployment guide](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/).

## 2. Deploy the repository

Connect `phillyzhao/chambana` in the Node.js app setup. Use repository root, Next.js, Node 24, `npm ci && npm run build`, and `npm start` when custom start settings are available. Honor the host-provided `PORT`. Do not use `next dev` in production.

Configure deployment-required variables from `.env.example` as private host environment values (the two `NEXT_PUBLIC_SUPABASE_*` values are intentionally public). Expected production `APP_URL` is `https://playchambana.com`. Microsoft is already configured and verified; expected `AUTH_MICROSOFT_ENABLED=true`. `TURBOPACK_FILESYSTEM_CACHE=false` is an optional local ExFAT workaround; omit it on Hostinger to retain default caching. The owner must choose the monitored `SUPPORT_EMAIL` and SMTP provider/sender before those settings are filled. Do not upload `.env.local` or place keys in GitHub.

Run `npm run preflight -- --production` in that environment, then deploy. The preflight validates configuration shape, not provider credentials or host capabilities. Public variables must be available at build time; rebuild after changing them. If using multiple app instances, review Next.js shared cache and Server Action encryption-key requirements before scaling.

## 3. Domain and auth

The domain is already attached. During recovery, apply **only the DNS records given by your Hostinger app** and do not change DNS for other domains. Confirm HTTPS and use the bare domain as canonical. The October 3 audit found HTTPS `www` serving 200 rather than redirecting. The app now includes an exact-host Next.js 308 redirect from `www.playchambana.com` to the bare HTTPS origin, preserving path/query and request method; confirm it on the real domain after deployment. Localhost, preview hosts and the bare domain must not loop or redirect through this rule.

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

Use [launch acceptance](launch-acceptance.md) for the case-by-case evidence matrix, consent-gated Gemini evaluation and iPhone email-link diagnosis. `npm run check` reports the app and PGlite database suites separately; its current baseline is 82 + 68 = 150 unique tests. These local checks do not replace hosted acceptance.

If deployment fails, return the hosting app to its previous verified commit and environment configuration. Do not reset the production database. Migrations are forward-only and the new fields are additive; fix schema issues with a new migration. Keep backups and test restore procedures before launch.
