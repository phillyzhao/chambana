# Chambana Missions — mobile web beta

A mobile-first Next.js + TypeScript website with a Supabase/Postgres backend and server-side Gemini photo verification. Built from the five UI mockups and the product decisions in this task. Original notes and mockups are preserved.

## What runs now

- A clearly labeled design preview works without credentials. Sample groups, missions, and scores are illustrative; preview mode cannot create accounts or award real points.
- The real application has campus authentication, public profiles, group discovery, invitation codes/links, organization approval, shared missions, photo submission, scoring, and platform administration.
- The real Supabase project is connected. The migrations have been applied, Illinois email-link sign-in has been verified, and the first platform admin has created accounts and approved organizers.
- Seven temporary challenges are published; four require human review enforced in SQL. Catalog replacement preserves existing assignments and scores.
- Production Microsoft sign-in is verified on desktop and iPhone Safari for two Illinois users; personal Outlook accounts were rejected. The September 23 cookie-size repair resolved the reproduced Microsoft callback 500. **iPhone email-link login remains unresolved** and needs a fresh failed attempt correlated with host logs.
- Google rejected the configured Gemini 2.5 Flash model. With owner approval, local configuration now uses Flash 3.6. Synthetic API-contract cases passed across runs after 503/429 failures and targeted retries, but no real photo recognition, supervision/oversight, safety moderation, or representative photo evaluation has been performed.

## Run locally

The owner’s local workspace is `/Volumes/Crucial X10/Chambana`. Work only with that SSD mounted; `/Users/zphil0/Chambana` is a compatibility symlink to it. Do not recreate a separate internal-drive checkout. See [workspace instructions](AGENTS.md).

Use Node 24 (`.nvmrc`), installed directly or through nvm. Homebrew is not required; Supabase runs with `npx`.

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open http://localhost:3000. For checks: `npm run check`. Tests use PGlite (real Postgres compiled to WASM) with lightweight Auth/Storage schema fixtures; they do not require Docker or cloud credentials. They test SQL constraints, permissions, RLS, mission transitions, duplicate awards, verifier leases, Gemini request/response handling with mocks, and the catalog parser. They do not replace live email-link/Microsoft OAuth, Supabase Storage, hosted concurrency/load testing, or Gemini evaluation.

## Current live status

Production is `https://playchambana.com`. Supabase setup, the first platform admin, organizer approval, deployment, and Microsoft desktop/iPhone acceptance are complete. Migrations 001–008 were confirmed applied on October 3; do not repeat setup or reapply them. This is still a beta, not a verified production-ready service. The owner paused the launch-readiness goal on October 3. See [handoff](handoff.md) for completed checks and the [live acceptance checklist](#live-acceptance-test-requires-your-accounts) for pending work.

1. Confirm Hostinger's completed release and finish authenticated category, organization, ownership-transfer, and reporting acceptance.
2. Audit production configuration, canonical redirects, authenticated cron and scheduled recovery; health alone does not prove these.
3. Obtain the owner's SMTP provider/sender details, configure them privately on the host, and verify a real notification in a monitored Illinois inbox.
4. Evaluate consented, non-personal representative photos against human labels. Mocked or synthetic contract tests do not establish Gemini readiness.
5. Complete multi-account submission/scoring/admin-review and real iPhone upload acceptance, including one fresh failed email-link diagnosis.
6. Obtain the owner's support inbox, retention/deletion policy, privacy terms, and final mission review before public signups.

## Finish connecting the real beta

1. **Keep the Supabase schema under migrations.** The handoff records migrations `001`–`008` as applied. For future schema changes, create a new migration and use the project-local CLI:

   ```sh
   npx supabase db push --dry-run
   npx supabase db push
   ```

   Do not apply these migrations to an unrelated existing project: they explicitly manage public-schema permissions.
2. **Keep environment variables private.** `.env.local` contains the project URL, publishable key, server-only service-role key, Gemini API key, and local `APP_URL`. Never paste private keys into chat or commit this file. Configure the same variables as encrypted values at the production host.
3. **Keep email links available and diagnose the iPhone issue.** Earlier Illinois email-link account creation was verified, but iPhone email-link login is unresolved. Expected Supabase settings are Site URL `https://playchambana.com`, production redirect `https://playchambana.com/auth/callback`, and the local development callback `http://localhost:3000/auth/callback`. Verify current settings without recreating the project.
4. **Preserve verified Microsoft authentication.** The application uses `azure` with the `email` scope. The single-tenant Illinois registration and Supabase Azure provider are configured. Production desktop and iPhone Safari sign-in succeeded after `d81d31b`; personal Outlook rejection was also verified. Keep tenant restrictions and cookie compaction. See [Microsoft setup and email-link diagnosis](docs/microsoft-auth.md#production-callback-retest).
5. **Bootstrap a platform admin.** This is already complete for the initial admin. To add another admin, run this in Supabase's SQL Editor with their lowercase Illinois email:

   ```sql
   insert into public.platform_admins(email)
   values ('your_netid@illinois.edu')
   on conflict (email) do nothing;
   ```

   The email must be lowercase. Sign in with that account and open `/admin`. Select registered campus emails to approve organizers, or preapprove an email before its signup. Platform admin access is managed in the database; organizer approval never grants platform admin access.

6. **Test Gemini before relying on it.** `GEMINI_MODEL=gemini-3.6-flash` replaces the unavailable 2.5 model. `npm run test:live` explicitly contacts real providers and consumes quota; regular `npm test` does not. Existing checks are synthetic API-contract tests only: no real photo recognition, supervision/oversight, safety moderation, or representative accuracy evaluation has been completed. Uncertain evidence, safety concerns, malformed/incomplete responses, and API failures go to admin review; they never auto-award points.
7. **Maintain the temporary catalog.** `missions/temporary-catalog.json` contains seven published missions. `npm run missions:replace` validates without writing; add `--write` to atomically publish this list and unpublish prior entries. Existing assignments/points remain unchanged. Four entries require human review. The text importer still creates unpublished drafts for additional content, not replacement.
8. **Verify the existing Hostinger deployment.** Confirm the completed commit, Node 24, clean install/build, native `sharp`, private configuration, HTTPS, and real upload/body/timeout behavior. The target is at least 10 MB request bodies and 60-second requests; framework configuration does not prove the host permits them. Use `npm ci && npm run build`, then `npm start`; do not reprovision existing hosting.
9. **Verify canonical routing and scheduled recovery.** Expected `APP_URL` is `https://playchambana.com`. A trusted scheduler should call the authenticated `/api/cron/verify` every minute using a private Authorization header. Each invocation processes at most two photos plus a bounded notification batch. A one-off successful invocation does not establish that the scheduler is installed or recovering expired leases.
10. **Run the live acceptance test below.** The owner must select `SUPPORT_EMAIL`, SMTP provider and verified sender, retention/deletion policy, and privacy terms. Configure SMTP only through private host settings after direction; never put credentials in Git or chat. Verify actual Illinois inbox receipt. See [Hostinger deployment](docs/hostinger.md), [operations](docs/operations.md), and [security review](docs/security-review.md).

## Product rules implemented

| Area                   | Beta behavior                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Access                 | Confirmed `@illinois.edu`; Microsoft verified on production desktop/iPhone; iPhone email-link issue unresolved |
| Profiles               | Display name, bio, all-time score public to everyone; email private                  |
| Organizers             | Explicit platform-admin email approval, including before signup                      |
| Groups                 | Open join, expiring invite link/code, or organization request + organizer approval   |
| Organizations          | Platform verification required before approving membership requests                  |
| Missions               | Three slots **per group** by default; one group completion per assignment            |
| Completion             | Any active member submits a photo; first approved submission closes the mission      |
| Decline                | Approved group organizer only, because declining affects every member                |
| Default window         | 24 hours; admin-configurable for new assignments                                     |
| Default cooldown       | 60 minutes; admin-configurable for new assignments                                   |
| Decline replacement    | Later of original expiry or decline time + cooldown                                  |
| Expiry replacement     | Original expiry + cooldown                                                           |
| Completion replacement | Approval time + cooldown                                                             |
| Replenishment          | Approved current owner clicks “Refresh slots”; uses server time, never device time    |
| Catalog exhaustion     | Slot stays empty when no eligible unused mission remains                             |
| Repeats                | Same mission template is never repeated for the same group in beta                   |
| Points                 | One ledger record credits group score and submitting person's score; no purchases    |
| AI threshold           | Auto-approve/reject only when confidence ≥ 0.90 and `unsafe=false`; otherwise review |
| Photos                 | JPG/PNG/WebP, ≤ 8 MB, decoded/rotated/resized, EXIF stripped, stored as private JPEG |
| Videos                 | Media kind reserved in schema; uploads and verification remain photo-only            |

Existing assignments snapshot criteria, points, duration, and cooldown. Changing settings affects new assignments; reducing the slot count does not cancel existing missions. A photo submitted before expiry can finish review afterward. A pending review holds its shared slot. Rejection permits a new attempt only while the mission remains active and before its deadline. Changing or withdrawing a published catalog entry does not rewrite in-flight assignment snapshots.

### Privacy and permissions

Public tables contain profile display data, profile pictures, group details, active-member counts, categories, published catalog entries, and point transactions. Public point transactions also disclose which person earned points for which group. The member directory is available to active members and platform admins; university emails, proof paths, and AI results are private. Group members see a teammate's submission status, not the photo or private explanation. The submitter sees their own explanation. Platform admins can create five-minute signed photo URLs. Completed proof uploads are also cataloged in the private archive, which survives group deletion; final retention/deletion policy remains an owner decision.

State changes use checked database functions, with direct client writes denied. Private tables have RLS. Internal upload/AI functions are service-role-only. Group-row locks serialize shared mission transitions; a unique ledger constraint independently prevents repeated rewards. Lease tokens prevent stale AI workers from overriding later reviews. Approval does not mean an AI has proven identity, timestamp, or real-world participation; evaluate false approvals on representative photos before relying on automatic scoring.

### Deliberately deferred

iOS app, video processing, cosmetics, payments, public media feed, friend graph, push notifications, realtime subscriptions, weekly seasons, automatic mission rotation in unattended groups, and scalable image/fraud moderation. Profiles/groups/leaderboards provide public discovery in this beta. Report resolution is tracked; broad account suspension, content takedown, self-service deletion, and automatic media retention jobs need a subsequent operational pass before an unrestricted launch. Failed upload cleanup is best-effort; configure orphan cleanup when deploying long-term storage.

## Live acceptance test (requires your accounts)

1. Sign in with a verified Illinois account; confirm personal Gmail and lookalike domains cannot gain access.
2. Use the existing platform admin and consented test accounts; do not repeat initial bootstrap. Test adding/saving/clearing categories, organization-only join controls, ownership transfer to an already-approved organizer, and reporting by the former owner but not the current owner. Use disposable groups and record original state.
3. Join with two ordinary member accounts. Publish at least four test missions, refresh slots, and verify there are three shared assignments.
4. Use consented, non-personal fixtures. Confirm private storage, review reason, and exactly one ledger award. Submit concurrently from another member and retry the first request; total points must not increase twice. Evaluate actual Gemini accuracy only with a labeled, consented representative dataset.
5. Trigger a Gemini failure and uncertain verdict, and resolve through the admin panel. Confirm a stale worker cannot override a manual verdict.
6. Exercise decline, expiry, approval cooldown, invite expiry, organization verification, and member approval. Changing a phone's time must not grant a replacement or allow an expired submission.
7. Confirm profiles/leaderboards are visible while signed out, but private proof/email tables and server-only functions are inaccessible.
8. Test iPhone Safari camera/library formats, email-link redirects, image size limits, and the production host's request timeout/body limits.

## References

- [Supabase server-side auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
- [Supabase Azure/Microsoft sign-in](https://supabase.com/docs/guides/auth/social-login/auth-azure)
- [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
