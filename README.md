# Chambana Missions — mobile web beta

A mobile-first Next.js + TypeScript website with a Supabase/Postgres backend and server-side Gemini photo verification. Built from the five UI mockups and the product decisions in this task. Original notes and mockups are preserved.

## What runs now

- A clearly labeled design preview works without credentials. Sample groups, missions, and scores are illustrative; preview mode cannot create accounts or award real points.
- The real application has campus authentication, public profiles, group discovery, invitation codes/links, organization approval, shared missions, photo submission, scoring, and platform administration.
- The real Supabase project is connected. The migrations have been applied, Illinois email-link sign-in has been verified, and the first platform admin has created accounts and approved organizers.
- Seven temporary challenges are published; four require human review enforced in SQL. Catalog replacement preserves existing assignments and scores.
- Microsoft sign-in is implemented and configured, and the owner confirmed the local callback returns to Chambana Missions. The deployed production callback still returns HTTP 500 after a real Microsoft authorization code, so production authentication is not complete.
- Google rejected the configured Gemini 2.5 Flash model. With owner approval, local configuration now uses Flash 3.6. Synthetic API-contract cases passed across runs after 503/429 failures and targeted retries, but no real photo recognition, supervision/oversight, safety moderation, or representative photo evaluation has been performed.

## Run locally

Use Node 24 (`.nvmrc`), installed directly or through nvm. Homebrew is not required; Supabase runs with `npx`.

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open http://localhost:3000. For checks: `npm run check`. Tests use PGlite (real Postgres compiled to WASM) with lightweight Auth/Storage schema fixtures; they do not require Docker or cloud credentials. They test SQL constraints, permissions, RLS, mission transitions, duplicate awards, verifier leases, Gemini request/response handling with mocks, and the catalog parser. They do not replace live email-link/Microsoft OAuth, Supabase Storage, hosted concurrency/load testing, or Gemini evaluation.

## Current live status

The Supabase connection, local environment variables, email-link sign-in, first platform admin, organizer approval workflow, and Hostinger deployment have been verified. The remaining path to a live beta is:

1. Resolve and verify the production Microsoft callback 500, then complete multi-account Microsoft acceptance.
2. Review the seven published temporary missions; catalog replacement is complete.
3. Complete Gemini live/representative-photo recognition and supervision evaluation.
4. Configure production redirects and queue recovery.
5. Run the full live acceptance test before opening signups.

## Finish connecting the real beta

1. **Keep the Supabase schema under migrations.** The hosted database has migrations `001`–`004` applied. For future schema changes, create a new migration and use the project-local CLI:

   ```sh
   npx supabase db push --dry-run
   npx supabase db push
   ```

   Do not apply these migrations to an unrelated existing project: they explicitly manage public-schema permissions.
2. **Keep environment variables private.** `.env.local` contains the project URL, publishable key, server-only service-role key, Gemini API key, and local `APP_URL`. Never paste private keys into chat or commit this file. Configure the same variables as encrypted values at the production host.
3. **Use email-link sign-in for the currently verified path.** Email-link authentication is working with verified `@illinois.edu` accounts. Add `http://localhost:3000/auth/callback` and the eventual production `https://YOUR_DOMAIN/auth/callback` in Supabase Authentication → URL Configuration; set the Site URL to the relevant environment's canonical origin.
4. **Microsoft is configured, but production auth is unresolved.** The application uses `azure` with the `email` scope. The single-tenant Illinois registration exists, Supabase Azure is enabled, and the owner verified the callback locally. The Hostinger production callback still returns HTTP 500 after Microsoft authorization; local `AUTH_MICROSOFT_ENABLED=true`, and email links remain available. Follow [Microsoft setup](docs/microsoft-auth.md) and inspect fresh Hostinger runtime logs before considering production auth complete.
5. **Bootstrap a platform admin.** This is already complete for the initial admin. To add another admin, run this in Supabase's SQL Editor with their lowercase Illinois email:

   ```sql
   insert into public.platform_admins(email)
   values ('your_netid@illinois.edu')
   on conflict (email) do nothing;
   ```

   The email must be lowercase. Sign in with that account and open `/admin`. Select registered campus emails to approve organizers, or preapprove an email before its signup. Platform admin access is managed in the database; organizer approval never grants platform admin access.

6. **Test Gemini before relying on it.** `GEMINI_MODEL=gemini-3.6-flash` replaces the unavailable 2.5 model. `npm run test:live` explicitly contacts real providers and consumes quota; regular `npm test` does not. Existing checks are synthetic API-contract tests only: no real photo recognition, supervision/oversight, safety moderation, or representative accuracy evaluation has been completed. Uncertain evidence, safety concerns, malformed/incomplete responses, and API failures go to admin review; they never auto-award points.
7. **Maintain the temporary catalog.** `missions/temporary-catalog.json` contains seven published missions. `npm run missions:replace` validates without writing; add `--write` to atomically publish this list and unpublish prior entries. Existing assignments/points remain unchanged. Four entries require human review. The text importer still creates unpublished drafts for additional content, not replacement.
8. **Deploy to Hostinger.** Use a Hostinger Business/Cloud Node.js plan or a VPS—not static-only or WordPress-only hosting. Confirm it supports Node 24, Next.js server actions, native `sharp`, at least 10 MB request bodies, 60-second requests, encrypted environment variables, HTTPS, and a scheduler. Connect the repository, select Node 24, build with `npm ci && npm run build`, and start with `npm start`. Vercel is not suitable for this upload implementation without a direct-to-storage redesign because Vercel Functions limit request bodies to 4.5 MB while this app accepts photos up to 8 MB.
9. **Attach the domain and schedule queue recovery.** Add the domain in Hostinger, use its provided DNS records, and wait for HTTPS. Set `APP_URL=https://YOUR_DOMAIN`, then set Supabase's Site URL and add `https://YOUR_DOMAIN/auth/callback`. Configure Hostinger's scheduler, or another trusted scheduler, to call `GET https://YOUR_DOMAIN/api/cron/verify` every minute with `Authorization: Bearer YOUR_CRON_SECRET`. This handles submissions interrupted after upload and recovers expired worker leases. Each invocation processes at most two photos concurrently.
10. **Run the live acceptance test below.** Set a monitored `SUPPORT_EMAIL`, resolve the production auth callback 500, test Gemini with consented representative photos and human labels, choose retention/deletion policies, and finalize privacy terms before public signups. See [Hostinger deployment](docs/hostinger.md), [operations](docs/operations.md), and [security review](docs/security-review.md). Target domain is `playchambana.com`; Hostinger deployment is complete, but production auth and live Gemini evaluation remain outstanding.

## Product rules implemented

| Area                   | Beta behavior                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Access                 | Verified `@illinois.edu` email and local Microsoft callback; production Microsoft callback currently returns 500 |
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
| Replenishment          | Member clicks “Refresh slots”; uses server time, never device time                   |
| Catalog exhaustion     | Slot stays empty when no eligible unused mission remains                             |
| Repeats                | Same mission template is never repeated for the same group in beta                   |
| Points                 | One ledger record credits group score and submitting person's score; no purchases    |
| AI threshold           | Auto-approve/reject only when confidence ≥ 0.90 and `unsafe=false`; otherwise review |
| Photos                 | JPG/PNG/WebP, ≤ 8 MB, decoded/rotated/resized, EXIF stripped, stored as private JPEG |
| Videos                 | Media kind reserved in schema; uploads and verification remain photo-only            |

Existing assignments snapshot criteria, points, duration, and cooldown. Changing settings affects new assignments; reducing the slot count does not cancel existing missions. A photo submitted before expiry can finish review afterward. A pending review holds its shared slot. Rejection permits a new attempt only while the mission remains active and before its deadline. Changing or withdrawing a published catalog entry does not rewrite in-flight assignment snapshots.

### Privacy and permissions

Public tables contain profile display data, group details, categories, published catalog entries, and point transactions. Public point transactions also disclose which person earned points for which group. Membership lists, university emails, proof paths, and AI results are private. Group members see a teammate's submission status, not the photo or private explanation. The submitter sees their own explanation. Platform admins can create five-minute signed photo URLs.

State changes use checked database functions, with direct client writes denied. Private tables have RLS. Internal upload/AI functions are service-role-only. Group-row locks serialize shared mission transitions; a unique ledger constraint independently prevents repeated rewards. Lease tokens prevent stale AI workers from overriding later reviews. Approval does not mean an AI has proven identity, timestamp, or real-world participation; evaluate false approvals on representative photos before relying on automatic scoring.

### Deliberately deferred

iOS app, video processing, cosmetics, payments, public media feed, friend graph, push notifications, realtime subscriptions, weekly seasons, automatic mission rotation in unattended groups, and scalable image/fraud moderation. Profiles/groups/leaderboards provide public discovery in this beta. Report resolution is tracked; broad account suspension, content takedown, self-service deletion, and automatic media retention jobs need a subsequent operational pass before an unrestricted launch. Failed upload cleanup is best-effort; configure orphan cleanup when deploying long-term storage.

## Live acceptance test (requires your accounts)

1. Sign in with a verified Illinois account; confirm personal Gmail and lookalike domains cannot gain access.
2. Bootstrap the platform admin, approve a second account as organizer, and create an open group with at least one category.
3. Join with two ordinary member accounts. Publish at least four test missions, refresh slots, and verify there are three shared assignments.
4. Submit a real photo. Confirm private storage, Gemini evaluation, review reason, and exactly one ledger award. Submit concurrently from another member and retry the first request; total points must not increase twice.
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
