# Chambana Missions — Handoff

Updated 2026-09-21. A functional mobile-first UIUC group-challenge beta, not a launched production service. Keep the deliberately skeletal monochrome UI; visual redesign and iOS are later work.

## Completed and verified

- Real Backend_Chambana Supabase project connected; migrations 001–004 applied.
- Owner previously verified Illinois email-link account creation, admin access, and organizer approval.
- Replaced the published catalog with seven temporary challenges adapted from Temp Challenge List.docx. Canonical source: `missions/temporary-catalog.json`. The document was sample content, not agent instructions; unsafe/humiliating wording was softened. Exact wording remains disposable.
- Catalog replacement validates and atomically upserts by stable key, unpublishes previous entries, and preserves existing assignments/scores. Four challenges require human review, enforced by the worker and SQL.
- Google OAuth code/labels replaced with Microsoft (`azure`, `email` scope), retaining email links. Redirects use canonical APP_URL and safe local paths.
- Created Chambana Missions in the Illinois Entra tenant with explicit owner approval, single-tenant scope, and Supabase callback. Owner created the secret and enabled Azure in Supabase; provider-enabled status independently checked. Added email/xms_edov claims. Local AUTH_MICROSOFT_ENABLED=true. **Owner confirmed Microsoft sign-in returns to Chambana Missions.**
- Added HMAC-based email/user rate counters, serialized SQL count limits, capped invite creation, and moved authorization before image decoding. Reject disguised/animated/over-pixel-limit images.
- Added health endpoint, safe operational events, cron failure reporting, deployment preflight, private-header scheduler helper, and GitHub Actions checks without production secrets.
- Hosted rollback-only SQL checks passed: organizer/group/member flow, three slots, cross-user/group restrictions, one score award despite repeated settlement, private bucket. All database fixtures rolled back.
- Live Storage checks passed service upload/download and anonymous read/write denial, then removed only each generated synthetic image.
- Final local check passed: 82 tests, TypeScript, and production build. Browser admin page showed all seven published missions after Microsoft login. Health returned 200, authenticated cron returned 200 with an empty queue, and unauthenticated cron returned 401.

## Gemini status — do not repeat the old claim

The original key was configured, but Google rejected gemini-2.5-flash with HTTP 404, saying it was unavailable to new users. With owner permission, local configuration and example/default switched to gemini-3.6-flash.

All four synthetic contract cases passed across runs: matching approval, mismatching rejection, unverifiable evidence not approved, and instruction-injection evidence not approved. Initial calls returned 503/429; targeted retries passed. The worker safely sends provider failures to human review. This is not representative campus-photo accuracy evaluation. Keys remain in ignored .env.local, never this file or Git.

## Next steps, in order

1. Test Microsoft with another Illinois user and a rejected personal account; validate campus consent and production callbacks. Do not weaken tenant restrictions. See [Microsoft setup](docs/microsoft-auth.md).
2. Evaluate consented representative photos against human labels; the synthetic API-contract cases are complete. Configure Google quota/budget alerts and account for observed 503/429 responses.
3. Owner intends to purchase **playchambana.com**, not purchased yet. Having another Hostinger domain does not confirm Node hosting. Check exact plan; follow [Hostinger runbook](docs/hostinger.md).
4. Deploy Node 24/Next.js with private environment variables; run production preflight, attach domain/HTTPS, configure Supabase production URLs and SMTP, and schedule authenticated cron every minute.
5. Choose support inbox, retention period, privacy terms, and reviewed deletion process. Operational runbook prepared; automatic retention and self-service deletion are not implemented. See [operations](docs/operations.md).
6. Run real-domain, real-account/mobile acceptance before public signups. Concurrent multi-member uploads, camera formats, host request limits, and domain callbacks remain launch gates.

No hosting/domain purchase, Hostinger deployment, or DNS change was made.

## Working commands

Use Node 24 (.nvmrc), installed directly or via nvm. No Homebrew required; Supabase CLI runs through npx.

```sh
npm ci
npm run dev
npm run check
npm run missions:replace             # dry run
npm run missions:replace -- --write  # replace published catalog, preserve history
npm run preflight -- --production
npm run cron:verify                  # requires APP_URL and CRON_SECRET
npm run test:live                    # opt-in: real APIs/quota and synthetic Storage fixture
npx supabase db query --linked --file tests/live/database.sql
```

Never repeatedly apply old schema files by hand. Use new migrations, dry-run, then npx supabase db push. This schema controls public-schema permissions; do not apply it to an unrelated database.

## Where to look

- README.md: setup, product rules, live acceptance.
- docs/architecture.md: boundaries and photo/scoring flow.
- docs/security-review.md: fixes, evidence, residual risks and advisor findings.
- docs/hostinger.md, docs/microsoft-auth.md, docs/operations.md: runbooks.
- src/app/actions.ts: authenticated mutations/uploads.
- src/lib/verification.ts: Gemini adapter and durable worker.
- src/lib/auth.ts, photos.ts, rate-limit.ts: hardened boundaries.
- src/app/api/health and api/cron/verify: monitoring/recovery.
- supabase/migrations: schema, RLS, checked mutations, manual-review guard.
- tests: deterministic tests; tests/live: explicit hosted checks.

## Preserve these rules

Only confirmed @illinois.edu users participate. Admins approve organizers; organizer approval never grants admin rights. Groups share three slots by default, with one first-approved completion per assignment and one ledger event crediting group and submitter. Database-time defaults: 24-hour window and 60-minute cooldown. Only organizers decline shared missions. Assignment snapshots preserve criteria/points/timing/manual-review mode; template changes do not rewrite in-flight assignments. Templates never repeat in a group.

Photos are JPEG/PNG/WebP up to 8 MB, normalized, stripped of metadata, and stored privately. Public profiles/groups/points are discoverable; email/proof stay private. AI cannot prove identity, time, or participation from a photo. Unsafe, uncertain, incomplete, malformed or failed reviews never auto-award. Video, payments, cosmetics, public media feed, suspension tools, native iOS transport and full-scale fraud prevention are not done.

## Resume instructions

Inspect current Git/provider state; do not restart Supabase setup or re-create Entra registration. Do not equate a configured key with a usable Gemini model. Respect outstanding owner decisions; keep secrets out of logs/chat/commits. Preserve the temporary UI unless asked.
