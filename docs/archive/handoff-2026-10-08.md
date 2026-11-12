# Chambana Missions — Handoff

Updated 2026-10-08. A functional mobile-first UIUC group-challenge beta, not a launched production service. Keep the deliberately skeletal monochrome UI; visual redesign and native iOS are later work. Historical entries below are dated evidence, not instructions to repeat completed setup.

## Requested website changes — October 8

- Stopped mission countdowns show “Ready to refresh” without a countdown prefix; future cooldowns still show the next-mission countdown.
- Group discovery accepts several filters, combining their results. All groups clears them. My groups can be combined with join types; search and URLs preserve the applied selection.
- Applied the owner's shorter homepage/Origin copy, removed the homepage subtitle, and added a blank About FAQ with a menu link.
- Added browser camera preview, JPEG capture, retake, and the existing file-upload choice. Capture uses the existing consent, authenticated action, server deadlines, private storage, and review path. Camera tracks stop on capture, cancel, collapsed details, hidden page, and unmount; late permission responses are also stopped.
- Node 24.21.0 typecheck, 98 app + 68 database tests, and the Next.js 16.3.6 production build passed. Vitest now ignores macOS AppleDouble files on the external SSD. Local browser checks passed for expired timers, filter selection/reset/search, camera capture/consent/upload replacement/cancellation/permission denial, and 390px layouts. Camera checks used a synthetic camera and a mocked submission action; real cameras, physical iPhone Safari, authenticated uploads, and hosted deployment still need verification.
- Local review artifacts and the reproducible component harness are in ignored `test-results/october-8-ui/` on the SSD. These are local checks, not production acceptance evidence.
- Before the requested GitHub push, rebased onto upstream `2796f4f` to preserve the merged sharp security update. Repaired its stale package lock from sharp 0.35.4 to 0.35.5 and matching image dependencies. Clean-install validation and the full 166-test/typecheck/build check passed again on the combined revision.

## Current resumed work — October 3

The owner resumed the full launch-readiness goal after the SSD move and authorized pushing meaningful, tested progress to GitHub. Work remains incomplete. Work started from checkpoint `48dddae`; code release `5d1aba0` is now confirmed deployed, and all local work stays on the mounted SSD.

**Owner-provided acceptance evidence, October 3:** the attached Hostinger screenshot (filename timestamp 10:16:27 AM) shows `playchambana.com` Running, the Current deployment Completed on branch `main` at commit `5d1aba00`, Next.js, Node 24.x, and auto-deployment/SSL enabled. Hostinger displays deployment time `2026-10-03 09:43` and duration 55 seconds; the screenshot does not label its timezone. This confirms deployment of the group-controls release and canonical-redirect code, not the redirect's actual browser behavior. The owner also confirmed both checklist step 2 (adding a category, saving/reloading, adding a second category, and clearing all selections back to All categories) and step 3 (no Join requests section for Test 1/open or Test 2/invite-only, with the section present for Test 3/organization). These are owner-reported production UI acceptance results. Cross-account category display, future mission draws, actual organization request/approval, ownership transfer, and reporting after transfer remain unverified. Marcos is unavailable now and will participate later; do not treat the second-account checks as completed.

- The owner selected Test 1 with Marcos's account as the preferred transfer counterpart, allowing another existing test group if more feasible. Membership and organizer eligibility still need inspection. The browser tool repeatedly refused access because its admin-enforced security-policy check was unavailable; no bypass was attempted. The owner's screenshot and confirmations now establish deployment, category-control acceptance, and organization-only join-request visibility. Transfer/reporting and actual organization request/approval remain pending.
- Added an exact-host Next.js 308 redirect from `www.playchambana.com` to `https://playchambana.com`, preserving path/query and request method. Seven HTTP checks against `next start --hostname 127.0.0.1 --port 3191` passed: root, path/query, synthetic callback query, POST redirect, canonical host, localhost, and lookalike-host exclusion. The local server was stopped afterward. Deployment of this code is confirmed by the owner-provided Hostinger screenshot. The owner subsequently opened `https://www.playchambana.com/groups?mode=all` and confirmed the expected final address; the October 3 screenshot (filename timestamp 10:25:07 AM) shows `playchambana.com/groups?mode=all` with the groups page loaded. This passes real-browser canonical destination and path/query preservation. The actual HTTP status/redirect chain and production POST preservation were not captured; local results do not establish those production behaviors.
- Corrected the earlier test-count interpretation: **150 unique tests = 82 app + 68 database**. The original combined run already included the database tests; the separate 68-test reruns duplicated that coverage. The earlier 218-test claim was incorrect. `npm test` now runs named `test:app` and `test:database` processes so both counts are explicit in local and GitHub CI output.
- A repeated build on ExFAT failed while opening persisted Turbopack data (`invalid digit found in string`); the cache contained AppleDouble `._` metadata files. Added the documented optional filesystem-cache switches and set `TURBOPACK_FILESYSTEM_CACHE=false` only in ignored local configuration. Production keeps default caching when the variable is absent. Two successive builds then passed without moving files off the SSD. Final Node 24.21.0 `npm run check` passed TypeScript, 82 app tests, 68 database tests, and the Next.js 16.3.6 build.
- Prepared [launch acceptance](docs/launch-acceptance.md): group/account cases, private configuration and cron evidence, monitored notification receipt, a consent-gated Gemini evaluation with explicit metric denominators, concurrency/scoring/private-proof/admin-review checks, and real iPhone upload/email-link diagnosis. No consented dataset or iPhone tester is available, so the representative evaluation and device tests were not run. No personal photos or keys were exposed; no email provider, sender, support inbox, privacy policy or retention period was chosen.
- Refreshed the Hostinger/operations runbooks to distinguish dated deployment evidence and avoid repeating applied migrations. The current verified release is now `5d1aba00` from the owner-provided screenshot. No schema or monochrome UI change was made.

**Highest-value next action:** when Marcos is available, confirm active membership/organizer eligibility and complete transfer, former-owner reporting, current-owner exclusion, and restoration. The solo www destination check has passed and need not be repeated. Technical gates still lack direct evidence for these multi-account flows, actual organization approval, production redirect status/method handling, private host configuration/scheduler recovery, real notification receipt, representative Gemini performance, concurrent scoring/private Storage/admin review, host request limits and fresh iPhone email-link diagnosis. Owner inputs still needed: SMTP provider/verified sender credentials through private host settings, monitored Illinois recipient/support inbox, privacy/retention/deletion decisions, and consented evaluation data/device participation. Do not claim production readiness.

## Earlier paused checkpoint — October 3

The owner temporarily paused the launch-readiness goal and requested a GitHub push plus an SSD-only workspace; the resume request is recorded above. The working location is `/Volumes/Crucial X10/Chambana`; `/Users/zphil0/Chambana` is a compatibility symlink. If Crucial X10 is disconnected, stop instead of creating an internal-drive copy. See `AGENTS.md`.

The SSD copy was reconciled against the internal checkout; project file contents, including private local configuration, matched before cutover. A recovery archive is saved outside Git at `/Volumes/Crucial X10/Chambana-backups/before-ssd-cutover-20261003.tar.gz`; all 18,500 archived non-Git files were checked against the source with no mismatch. The independent internal checkout was removed after verification. ExFAT permission differences are handled with repository-local `core.filemode=false`, and AppleDouble metadata is ignored. After cutover, `npm run check` again passed from the SSD (TypeScript, 150 tests, Next.js 16.3.6 build), as did the separate 68-test database suite. No UI or schema changes were made.

- Started with a clean `main` at `1cfe63a`. `git fetch origin main` found the already-merged Next.js 16.3.6 update at `95c5c1f`; fast-forwarded without replaying feature work. Its missing lockfile update caused `npm ci --dry-run --ignore-scripts --no-audit --no-fund` to fail. Synchronized `package-lock.json` with the existing 16.3.6 manifest, then `npm ci --no-audit --no-fund` succeeded.
- Node 24.21.0 `npm run check` passed: TypeScript, 150 total tests, and a Next.js 16.3.6 production build. Also ran `npx --no-install vitest run tests/database.test.ts` separately: 68 tests passed, repeating coverage already included in the 150 total. The build's unrelated parent-directory lockfile warning was nonfatal.
- Reconciled README and Microsoft runbook with the recorded desktop/iPhone Microsoft success. iPhone email-link login remains unresolved; no fresh device attempt was completed.
- `npx --no-install supabase migration list --linked` confirmed local/remote migrations 001–008 match. No migration was applied. Read-only checks found `mission-proof` private and zero pending, processing, uploading, or human-review submissions. Azure and email Auth providers report enabled. These checks did not access or send photo contents.
- Public production browser displayed the new Mission categories / All categories section on an existing open group. This is release evidence, not proof of the exact Hostinger commit or authenticated controls. Production and Hostinger browser sessions were signed out; authenticated category saving/clearing, organization controls, transfer, and former/current-owner reporting were not completed before the pause.
- HTTP probes: `/api/health` returned 200 with `status: ok` and `no-store`; anonymous and incorrect-credential cron calls returned 401. HTTP bare-domain root redirected 301 to HTTPS. Missing-code and unsafe-next callbacks returned 307 to canonical HTTPS login with private/no-store headers. **HTTPS `www.playchambana.com` returned 200 instead of redirecting to the bare domain.** No authenticated cron run, installed scheduler, queue-recovery run, host limits, host environment inventory, or exact deployed revision was verified in this session.
- Local configuration presence checks found `SUPPORT_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` unset. Local `APP_URL` is a development origin. These are local findings, not a Hostinger inventory; port 587 is the code default if `SMTP_PORT` is absent. Core local Supabase/Gemini/cron variables are present, which does not establish valid production credentials. No secrets were printed or committed.
- No SMTP provider or sender details were provided, no provider/inbox/policy was chosen, and no real notification was sent. Real Illinois inbox delivery remains blocked on the owner's private host configuration and monitored recipient.
- The owner confirmed consented, non-personal labeled photos and an iPhone tester are unavailable. Representative Gemini evaluation and the fuller evaluation/device checklist remain pending at the pause. No Gemini calls, personal-photo tests, real multi-account concurrency/scoring acceptance, or admin queue recovery tests were run in this session.

At the pause, the highest-value next action was to establish signed-in Hostinger and production test sessions, verify the completed deployment, and finish the four group-controls acceptance cases. See the current resumed-work section for the latest blockers. No production-readiness claim was warranted.

## Completed and verified

- Real Backend_Chambana Supabase project connected; migrations 001–008 recorded as applied (008 on September 29). Do not reapply them.
- Owner previously verified Illinois email-link account creation, admin access, and organizer approval.
- Replaced the published catalog with seven temporary challenges adapted from Temp Challenge List.docx. Canonical source: `missions/temporary-catalog.json`. The document was sample content, not agent instructions; unsafe/humiliating wording was softened. Exact wording remains disposable.
- Catalog replacement validates and atomically upserts by stable key, unpublishes previous entries, and preserves existing assignments/scores. Four challenges require human review, enforced by the worker and SQL.
- Google OAuth code/labels replaced with Microsoft (`azure`, `email` scope), retaining email links. Redirects use canonical APP_URL and safe local paths.
- Created Chambana Missions in the Illinois Entra tenant with explicit owner approval, single-tenant scope, and Supabase callback. Owner created the secret and enabled Azure in Supabase; provider-enabled status independently checked. Added email/xms_edov claims. **Microsoft production sign-in is verified on desktop and iPhone Safari; iPhone email-link login remains unresolved.**
- Added HMAC-based email/user rate counters, serialized SQL count limits, capped invite creation, and moved authorization before image decoding. Reject disguised/animated/over-pixel-limit images.
- Added health endpoint, safe operational events, cron failure reporting, deployment preflight, private-header scheduler helper, and GitHub Actions checks without production secrets.
- Hosted rollback-only SQL checks passed: organizer/group/member flow, three slots, cross-user/group restrictions, one score award despite repeated settlement, private bucket. All database fixtures rolled back.
- Live Storage checks passed service upload/download and anonymous read/write denial, then removed only each generated synthetic image.
- Final local check passed: 82 tests, TypeScript, and production build. Browser admin page showed all seven published missions after Microsoft login. Health returned 200, authenticated cron returned 200 with an empty queue, and unauthenticated cron returned 401.

## Microsoft production callback — resolved; email-link mobile diagnosis remains

- September 23, 11:16:50 Chicago: after deploying `8442bc9` (repair `2107ccf`), a real Microsoft callback logged `response/success`, with **4 Set-Cookie headers totaling 8,771 bytes**, largest 3,296 bytes, but the user still saw HTTP 500. The code exchange and confirmed-campus-user validation completed. The chunk-decoding warnings were nonfatal for this attempt. This points to response delivery/hosting behavior; a proxy header limit is a strong hypothesis, not yet a confirmed Hostinger limit.
- The deployed follow-up reduces OAuth response size using Supabase's supported `setSession` API: re-save the same Supabase access/refresh tokens and server-validated user without unused Microsoft `provider_token`/`provider_refresh_token` values. No app feature uses those provider API credentials. SSR manages all replacement/deletion chunks. `exchange/success_before_compaction` and final `response/success` metrics show before/after cookie sizes. Microsoft production acceptance subsequently passed as recorded below.
- **Verified September 23:** after deploying `d81d31b`, Microsoft sign-in completed successfully on desktop and iPhone Safari for a second Illinois user (Marcos), and a personal Outlook account was rejected. This supports the oversized OAuth-cookie response hypothesis and resolves the previously reproducible production callback 500. Email-link login through an iPhone link is now reported not to work and needs separate diagnosis.

Earlier investigation (historical, superseded by the successful September 23 retest):

- The app is deployed at `https://playchambana.com`; public pages and the health endpoint were reachable. Hostinger confirms `d4527fb` is the completed current deployment, so its included `9bde9cb` proxy change is live.
- Before the cookie-size follow-up, a real Microsoft authorization code reproduced a production `/auth/callback` HTTP 500. That Microsoft failure was resolved by the September 23 retest.
- The login request creates valid, unchunked Supabase PKCE verifier cookies. Requests with deliberately invalid authorization codes are handled with the intended redirect, rather than a 500. The browser-visible 500 was reproduced only after Microsoft supplied a real code.
- Hostinger runtime logs still repeatedly show `@supabase/ssr: chunked cookie decoded to invalid JSON`, meaning a request is receiving mismatched Supabase cookie chunks. The library treats those cookies as absent. Commit `9bde9cb` makes `/auth/*` and `/api/*` bypass the general proxy refresh so the OAuth callback is the sole Supabase cookie writer; this did not resolve the live callback failure.
- Hostinger also records `failed to get redirect response TypeError: fetch failed` from Next.js's Server Action redirect handling. Next.js catches that failure and falls back to a normal redirect; its logged timestamp has not been tied to the real Microsoft callback and it is not yet established as the 500 cause.
- The investigation used runtime logs and cookie-header byte counts. If an authentication regression recurs, use a fresh attempt and redact all credentials/codes; do not repeat the resolved Microsoft investigation by default. Keep email links available and do not loosen tenant restrictions.
- A separate `Server is not running` message appeared during an earlier Hostinger startup; it is not evidence of the current authentication cause.

### Callback repair prepared September 23 — desktop production verification complete

- Before the repair, Marcos reported email-link login working on iPhone, but Microsoft failing in desktop Chrome, Incognito, and iPhone Safari. Later acceptance reversed the current status: Microsoft succeeded, and iPhone email-link login was reported failing.
- Corrected an earlier hypothesis: Next.js 16.3.5 already merges `cookies()` writes into a returned Route Handler response. Returning a new redirect is not itself proof that cookies were lost. This callback also does not stream a React layout.
- The callback now owns one explicit response and writes every Supabase cookie update and cache-prevention header directly to it. Cookie-write errors are no longer swallowed by the shared Server Component helper. Exceptions redirect safely to login; newly written partial/rejected session chunks are expired without clearing an existing session when an invalid link wrote no replacement session. Ineligible-user sign-out is scoped to the current session.
- Added `auth_callback` diagnostics with a random request ID, failure stage, controlled outcome, HTTP error status when available, and outgoing cookie counts/byte lengths. `X-Auth-Callback-Id` links the browser response to logs. No cookie values, codes, emails, tokens, or raw exception messages are included in these diagnostics.
- Node 24 `npm run check` passed: 91 tests, TypeScript, and production build. Nine new tests use the real installed Supabase SSR/auth libraries with simulated HTTP responses, covering small and large sessions, stale chunks, campus/confirmed-email restrictions, error cleanup, cookie-write exceptions, and safe redirects. They do not prove Hostinger or real Microsoft acceptance.
- The initial repair was pushed as `2107ccf` (merged on main at `8442bc9`) and the owner's fresh production logs confirm its diagnostics are live. The size-reduction follow-up, `d81d31b`, is verified working for Microsoft desktop login. No package upgrades or provider changes were made; the experimental PKCE flow-ID feature remains disabled. See [Microsoft setup](docs/microsoft-auth.md#production-callback-retest).

## Gemini status — do not repeat the old claim

The original key was configured, but Google rejected gemini-2.5-flash with HTTP 404, saying it was unavailable to new users. With owner permission, local configuration and example/default switched to gemini-3.6-flash.

Only synthetic API-contract cases have been tested: matching approval, mismatching rejection, unverifiable evidence not approved, and instruction-injection evidence not approved. Initial calls returned 503/429; targeted retries passed. **No real user-photo recognition, supervision/oversight, safety moderation, or representative campus-photo evaluation has been performed.** Gemini must not be considered production-ready or trusted for automatic scoring. The worker sends provider failures and uncertain evidence to human review. Keys remain in ignored .env.local, never this file or Git.

## Next steps — launch priority

### Group controls follow-up — September 29

Removed the leaderboard scoring footnote. Group reporting is limited to active members other than the current owner, enforced in both the page and database; ownership transfer immediately changes eligibility, and revoking organizer approval does not let an owner report their own group. Join-request controls appear only for organization groups. All group types show selected mission categories (or All categories); the approved current owner can add/remove selections, with changes applying to future mission draws and preserving current assignments. Clearing selections restores the full catalog.

Migration `202609290008_group_categories_and_reporting.sql` was applied successfully to the linked production project on September 29 after a dry-run confirmed only 008 was pending. Local Node 24 verification passed: TypeScript, production build, 150 total tests, and a separate repeat of the 68 database tests. The earlier app-only interpretation of the 150-test total was corrected on October 3. Coverage includes rendered controls by group type, category validation and mission selection, reporting eligibility, and ownership transfer. Hostinger deployment completion and authenticated browser acceptance of this release remain to be verified after the requested GitHub push. Include saving/clearing categories and checking both former/new owners after a transfer.

### Community feature release — September 28

This release adds a group filter dropdown (including My groups), active-member counts and a member directory, leaving/canceling membership, ownership transfer to an already-approved organizer, public profile pictures, owner-only mission refresh, admin editing of group descriptions with clickable web links, named report targets, and a global About menu linking Team/Origin/Mission sections. The owner explicitly confirmed: ordinary members cannot refresh; owners must delete or transfer ownership before leaving; transfer recipients must already be approved organizers.

Migration `202609280007_community_features.sql` adds the permissions, avatar bucket/path, member-directory/count RPCs, readable report snapshots, and durable notification queue. It was applied successfully to linked production project `Backend_Chambana` on September 28, after a dry-run confirmed that only 007 was pending. Join/leave/report-resolution email delivery uses SMTP with retries through the existing authenticated cron and an after-response attempt. The owner requested the GitHub push; Hostinger automatically deploys `main`. Verification of this release's completed Hostinger deployment remains pending. No actual notification emails have been sent. See [operations](docs/operations.md#community-updates--september-28).

**Owner follow-up — email provider and sender address:** explicitly deferred September 28. Choose the provider and sending email address, verify that sender, then configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` privately on the host. Until configured, notifications remain queued and email preflight/cron reports incomplete configuration; photo processing still runs. Verify real Illinois inbox receipt after setup. Do not select or provision a provider on the owner's behalf.

**About content confirmed September 28:** Team lists Marcos Monroe — Co-Founder and Phillip Zhao — Co-Founder. The owner will provide additional About details later. No biographies or origin story have been invented; Origin remains a placeholder and Mission uses the existing app tagline.

Local verification passed on Node 24: 137 tests, TypeScript, production build, and clean diff checks. Tests exercise owner transfer/demotion, owner-only refresh, leave and notification idempotency, organization approval notifications, member-directory access, report names after deletion, email leases/retries with mocked SMTP, and avatar authorization/cleanup. Browser demo checks confirmed organization filtering, all filter choices, and About section navigation; the mobile viewport had no horizontal overflow. After applying 007, the existing hosted rollback-only SQL acceptance checks passed (group/member/mission flow, optional categories, deletion guards, private archive preservation and review synchronization); all fixtures rolled back, and no Storage objects were created or deleted. Those hosted checks do not cover every new community flow. Authenticated end-to-end acceptance and real inbox delivery remain outstanding.

### Previously deployed features

Group deletion and a central private photo archive are deployed: the approved owner must retype the exact group name, checked again in the database. Migration `202609260006_delete_groups.sql` removes the group's memberships, invitations, assignments, live submissions, and associated points; reports and a deletion audit remain. Active uploads/reviews delay deletion. Per the owner's updated request, photos are preserved in private Storage and `photo_archive` catalogs every completed upload with group/uploader/mission/review metadata; a trigger keeps reviews current and the migration backfills existing completed uploads. Archive records survive group deletion, and only platform admins/server credentials can read them. The proposed photo cleanup queue was removed before deployment; no real photos were deleted. Upload consent and deletion confirmation disclose the archive. See [operations](docs/operations.md#group-deletion). Storage capacity/billing and final retention policy remain to be confirmed; no unlimited-capacity claim or secondary photo use is implied.

**Deployment verified September 28:** GitHub main and Hostinger's current completed deployment both point to `6e7e7554` (deployed September 26 at 19:02, Node 24). Linked project `Backend_Chambana` lists migrations 001–006 as applied; `supabase db push --linked --dry-run` reports no pending migrations. No redeployment or migration reapplication was needed. Node 24 verification passed: 114 tests, TypeScript, and production build; production `/api/health` returned `{"status":"ok"}`. Expanded `tests/live/database.sql` passed against the hosted database, including empty-category group creation, three slots, exact-name/owner deletion guards, admin-only archive reads, synchronized review status, deletion of group records/points, archive/audit preservation, and isolation from another test group. All fixture rows rolled back; these SQL checks do not upload photos or prove Storage-object preservation end to end. The authenticated production groups page shows the optional-category form. A fresh browser create/delete acceptance test remains to be completed.

Microsoft sign-in is verified for two Illinois users on desktop and iPhone Safari, and personal Outlook accounts are rejected. iPhone email-link authentication remains unresolved; the October 3 request restores fresh diagnosis to the launch acceptance checklist, pending an iPhone tester.

1. Complete fresh browser acceptance of the deployed optional-category and group-deletion features using a disposable group. **Owner deferred this browser test on September 28.** No browser test group was submitted or deleted in that session. Migration `202609260005_optional_group_categories.sql` and the corresponding app are already live and hosted SQL checks pass. Categories are optional: leaving all unchecked draws from every published category, including future categories; explicit selections still filter missions. See the deployment verification above; do not reapply migrations 005/006.
2. Evaluate consented representative photos against human labels. This must include actual Gemini photo recognition and supervision/oversight behavior; synthetic API-contract cases alone are insufficient. Configure Google quota/budget alerts and account for observed 503/429 responses.
3. Keep the deployed `playchambana.com` environment and scheduled recovery documented; confirm production secrets, Supabase URLs/SMTP, HTTPS, and authenticated cron in the real environment. Follow [Hostinger runbook](docs/hostinger.md).
4. Choose support inbox, retention period, privacy terms, and reviewed deletion process. Operational runbook prepared; automatic retention and self-service deletion are not implemented. See [operations](docs/operations.md).
5. Run real-domain, real-account/mobile acceptance before public signups. Concurrent multi-member uploads, camera formats, host request limits, and domain callbacks remain launch gates.
6. Diagnose one fresh failed iPhone email-link attempt. Record timestamp/timezone, final origin/path with secret query/fragment values redacted, HTTP status, callback ID and matching host events. Never save a live sign-in link or token in this file. See [Microsoft setup](docs/microsoft-auth.md#production-callback-retest).

Hostinger deployment and the `playchambana.com` domain are now in place. Production Microsoft callback behavior is no longer a desktop or iPhone Safari blocker; iPhone email-link behavior remains unresolved.

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

October 6 About update: removed the Mission section and menu entry, added the owner's Origin copy, changed the headline to “Connected, together,” and positioned Phillip Zhao before Marcos Monroe with equal Co-Founder labels. Updated the shared metadata tagline. Node 24.21.0 typecheck and production build passed; the locally served `/about` returned HTTP 200 and verified copy, founder order, and absence of the removed section/link. Browser visual review and hosted deployment were not performed for this update.

Inspect current Git/provider state; do not restart Supabase setup or re-create Entra registration. Do not equate a configured key with a usable Gemini model. Respect outstanding owner decisions; keep secrets out of logs/chat/commits. Preserve the temporary UI unless asked.
