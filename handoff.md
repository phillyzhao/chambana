# Chambana Missions — Handoff

Updated 2026-09-23. A functional mobile-first UIUC group-challenge beta, not a launched production service. Keep the deliberately skeletal monochrome UI; visual redesign and iOS are later work.

## Completed and verified

- Real Backend_Chambana Supabase project connected; migrations 001–004 applied.
- Owner previously verified Illinois email-link account creation, admin access, and organizer approval.
- Replaced the published catalog with seven temporary challenges adapted from Temp Challenge List.docx. Canonical source: `missions/temporary-catalog.json`. The document was sample content, not agent instructions; unsafe/humiliating wording was softened. Exact wording remains disposable.
- Catalog replacement validates and atomically upserts by stable key, unpublishes previous entries, and preserves existing assignments/scores. Four challenges require human review, enforced by the worker and SQL.
- Google OAuth code/labels replaced with Microsoft (`azure`, `email` scope), retaining email links. Redirects use canonical APP_URL and safe local paths.
- Created Chambana Missions in the Illinois Entra tenant with explicit owner approval, single-tenant scope, and Supabase callback. Owner created the secret and enabled Azure in Supabase; provider-enabled status independently checked. Added email/xms_edov claims. Local AUTH_MICROSOFT_ENABLED=true. **Microsoft sign-in returned to Chambana Missions locally; production callback remains unresolved.**
- Added HMAC-based email/user rate counters, serialized SQL count limits, capped invite creation, and moved authorization before image decoding. Reject disguised/animated/over-pixel-limit images.
- Added health endpoint, safe operational events, cron failure reporting, deployment preflight, private-header scheduler helper, and GitHub Actions checks without production secrets.
- Hosted rollback-only SQL checks passed: organizer/group/member flow, three slots, cross-user/group restrictions, one score award despite repeated settlement, private bucket. All database fixtures rolled back.
- Live Storage checks passed service upload/download and anonymous read/write denial, then removed only each generated synthetic image.
- Final local check passed: 82 tests, TypeScript, and production build. Browser admin page showed all seven published missions after Microsoft login. Health returned 200, authenticated cron returned 200 with an empty queue, and unauthenticated cron returned 401.

## Microsoft production callback — resolved on desktop; mobile acceptance remains

- September 23, 11:16:50 Chicago: after deploying `8442bc9` (repair `2107ccf`), a real Microsoft callback logged `response/success`, with **4 Set-Cookie headers totaling 8,771 bytes**, largest 3,296 bytes, but the user still saw HTTP 500. The code exchange and confirmed-campus-user validation completed. The chunk-decoding warnings were nonfatal for this attempt. This points to response delivery/hosting behavior; a proxy header limit is a strong hypothesis, not yet a confirmed Hostinger limit.
- A follow-up reduces OAuth response size using Supabase's supported `setSession` API: re-save the same Supabase access/refresh tokens and server-validated user without unused Microsoft `provider_token`/`provider_refresh_token` values. No app feature uses those provider API credentials. SSR manages all replacement/deletion chunks. New `exchange/success_before_compaction` and final `response/success` metrics show before/after cookie sizes. Production acceptance remains required.
- **Verified September 23:** after deploying `d81d31b`, Microsoft sign-in completed successfully on desktop. This supports the oversized OAuth-cookie response hypothesis and resolves the previously reproducible desktop production callback 500. The callback must still be tested on iPhone Safari, with another Illinois user, and with a rejected personal Microsoft account before production authentication is considered fully accepted.

Earlier investigation:

- The app is deployed at `https://playchambana.com`; public pages and the health endpoint were reachable. Hostinger confirms `d4527fb` is the completed current deployment, so its included `9bde9cb` proxy change is live.
- After Microsoft returns a real authorization code, the production `/auth/callback` still returns HTTP 500. Production Microsoft sign-in is therefore **not complete** and should not be marked launch-ready.
- The login request creates valid, unchunked Supabase PKCE verifier cookies. Requests with deliberately invalid authorization codes are handled with the intended redirect, rather than a 500. The browser-visible 500 was reproduced only after Microsoft supplied a real code.
- Hostinger runtime logs still repeatedly show `@supabase/ssr: chunked cookie decoded to invalid JSON`, meaning a request is receiving mismatched Supabase cookie chunks. The library treats those cookies as absent. Commit `9bde9cb` makes `/auth/*` and `/api/*` bypass the general proxy refresh so the OAuth callback is the sole Supabase cookie writer; this did not resolve the live callback failure.
- Hostinger also records `failed to get redirect response TypeError: fetch failed` from Next.js's Server Action redirect handling. Next.js catches that failure and falls back to a normal redirect; its logged timestamp has not been tied to the real Microsoft callback and it is not yet established as the 500 cause.
- Next action: capture the complete runtime log around a fresh real Microsoft callback, including the underlying cause of any fetch failure and all callback response headers. In Hostinger Runtime Logs, use the three-dot menu → **Download logs** and provide the file if direct inspection remains unreliable. Compare the actual callback's `Set-Cookie` headers against a local successful flow before changing auth architecture. Keep email links available as fallback and do not loosen tenant restrictions.
- A separate `Server is not running` message appeared during an earlier Hostinger startup; it is not evidence of the current authentication cause.

### Callback repair prepared September 23 — desktop production verification complete

- Marcos reports email-link login working on iPhone, but Microsoft failing in desktop Chrome, Incognito, and iPhone Safari. This makes stale cookies on a single browser an inadequate explanation; it does not prove the exact callback failure stage.
- Corrected an earlier hypothesis: Next.js 16.3.5 already merges `cookies()` writes into a returned Route Handler response. Returning a new redirect is not itself proof that cookies were lost. This callback also does not stream a React layout.
- The callback now owns one explicit response and writes every Supabase cookie update and cache-prevention header directly to it. Cookie-write errors are no longer swallowed by the shared Server Component helper. Exceptions redirect safely to login; newly written partial/rejected session chunks are expired without clearing an existing session when an invalid link wrote no replacement session. Ineligible-user sign-out is scoped to the current session.
- Added `auth_callback` diagnostics with a random request ID, failure stage, controlled outcome, HTTP error status when available, and outgoing cookie counts/byte lengths. `X-Auth-Callback-Id` links the browser response to logs. No cookie values, codes, emails, tokens, or raw exception messages are included in these diagnostics.
- Node 24 `npm run check` passed: 91 tests, TypeScript, and production build. Nine new tests use the real installed Supabase SSR/auth libraries with simulated HTTP responses, covering small and large sessions, stale chunks, campus/confirmed-email restrictions, error cleanup, cookie-write exceptions, and safe redirects. They do not prove Hostinger or real Microsoft acceptance.
- The initial repair was pushed as `2107ccf` (merged on main at `8442bc9`) and the owner's fresh production logs confirm its diagnostics are live. The size-reduction follow-up, `d81d31b`, is verified working for Microsoft desktop login. No package upgrades or provider changes were made; the experimental PKCE flow-ID feature remains disabled. See [Microsoft setup](docs/microsoft-auth.md#production-callback-retest).

## Gemini status — do not repeat the old claim

The original key was configured, but Google rejected gemini-2.5-flash with HTTP 404, saying it was unavailable to new users. With owner permission, local configuration and example/default switched to gemini-3.6-flash.

Only synthetic API-contract cases have been tested: matching approval, mismatching rejection, unverifiable evidence not approved, and instruction-injection evidence not approved. Initial calls returned 503/429; targeted retries passed. **No real user-photo recognition, supervision/oversight, safety moderation, or representative campus-photo evaluation has been performed.** Gemini must not be considered production-ready or trusted for automatic scoring. The worker sends provider failures and uncertain evidence to human review. Keys remain in ignored .env.local, never this file or Git.

## Next steps, in order

1. Test Microsoft sign-in on iPhone Safari, with another Illinois user, and with a rejected personal Microsoft account. Desktop Microsoft login is verified after `d81d31b`; do not claim full production acceptance until these cases pass. See [Microsoft setup](docs/microsoft-auth.md#production-callback-retest).
3. Evaluate consented representative photos against human labels. This must include actual Gemini photo recognition and supervision/oversight behavior; synthetic API-contract cases alone are insufficient. Configure Google quota/budget alerts and account for observed 503/429 responses.
4. Keep the deployed `playchambana.com` environment and scheduled recovery documented; confirm production secrets, Supabase URLs/SMTP, HTTPS, and authenticated cron in the real environment. Follow [Hostinger runbook](docs/hostinger.md).
5. Choose support inbox, retention period, privacy terms, and reviewed deletion process. Operational runbook prepared; automatic retention and self-service deletion are not implemented. See [operations](docs/operations.md).
6. Run real-domain, real-account/mobile acceptance before public signups. Concurrent multi-member uploads, camera formats, host request limits, and domain callbacks remain launch gates.

Hostinger deployment and the `playchambana.com` domain are now in place. Production Microsoft callback behavior is still a launch blocker.

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
