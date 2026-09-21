# Chambana Missions — mobile web beta

A mobile-first Next.js + TypeScript website with a Supabase/Postgres backend and server-side Gemini photo verification. Built from the five UI mockups and the product decisions in this task. Original notes and mockups are preserved.

## What runs now

- A clearly labeled design preview works without credentials. Sample groups, missions, and scores are illustrative; preview mode cannot create accounts or award real points.
- The real application has campus authentication, public profiles, group discovery, invitation codes/links, organization approval, shared missions, photo submission, scoring, and platform administration.
- Database migrations and automated tests run locally. No cloud project has been provisioned, no production migrations applied, and no actual student photos sent to Gemini during development.

## Run locally

Use Node 24 LTS (`.nvmrc`). The installed Supabase client requires Node 22 or newer.

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open http://localhost:3000. For checks: `npm run check`. Tests use PGlite (real Postgres compiled to WASM) with lightweight Auth/Storage schema fixtures; they do not require Docker or cloud credentials. They test SQL constraints, permissions, RLS, mission transitions, duplicate awards, verifier leases, Gemini request/response handling with mocks, and the catalog parser. They do not replace live Google OAuth, Supabase Storage, hosted concurrency/load testing, or Gemini evaluation.

## Connect the real beta

1. **Create a Supabase project owned by your team.** In a new project, apply SQL files in `supabase/migrations/` in filename order using the SQL Editor. Alternatively install the Supabase CLI, run `supabase link --project-ref YOUR_PROJECT_REF`, then `supabase db push`. Do not apply these migrations to an unrelated existing project: they explicitly manage public-schema permissions.
2. **Configure environment variables.** Create `.env.local` using `.env.example` as the template. Add the project URL, publishable key, and server-only service-role key. Never paste private keys into chat or commit them. Set `APP_URL` to the exact website origin (localhost during development).
3. **Configure campus sign-in.** Enable Google in Supabase Authentication → Providers with a Google OAuth client owned by your team. Add Supabase's callback URL from that provider screen to the Google client's authorized redirect URIs. In Supabase URL Configuration, add `http://localhost:3000/auth/callback` and your deployed `https://YOUR_HOST/auth/callback`; set the Site URL accordingly. Both the application and database enforce the exact `@illinois.edu` domain; Google's `hd` parameter is just an account-selection hint. Disable unused providers.
4. **Keep email-link sign-in enabled as a fallback.** Some Illinois accounts may not have Google sign-in available. Enable email confirmations, configure SMTP for delivery beyond development limits, and use the PKCE email-link flow. Confirm the email template links through Supabase's confirmation URL before returning to `/auth/callback`. Test this flow in the same browser that requested the link.
5. **Bootstrap a platform admin.** Replace the example with your actual Illinois email, then run this in Supabase's SQL Editor:

   ```sql
   insert into public.platform_admins(email)
   values ('your_netid@illinois.edu')
   on conflict (email) do nothing;
   ```

   The email must be lowercase. Sign in with that account and open `/admin`. Select registered campus emails to approve organizers, or preapprove an email before its signup. Platform admin access is managed in the database; organizer approval never grants platform admin access.

6. **Connect Gemini.** Put your Google AI Studio API key in `GEMINI_API_KEY` and an available image-capable model in `GEMINI_MODEL` (initial adapter default: `gemini-2.5-flash`). Confirm model access in your Google project. Missing keys, uncertain evidence, safety concerns, malformed responses, and API failure route to admin review; they never auto-award points. No actual API call has been tested without your credentials.
7. **Load your mission catalog.** Use `missions/mission-catalog.example.txt` as the format. Run `npm run missions:import -- your-missions.txt` to validate without writing, then add `--write` when ready. Imports create drafts only. Review/publish them in `/admin`. No production missions are prepublished.
8. **Deploy the Node application.** Use a host that supports Node 24, Next.js server actions, native `sharp`, request bodies of at least 10 MB, and requests lasting at least 60 seconds. Run `npm ci`, `npm run build`, then `npm start`. Set the same environment variables securely on the host, change `APP_URL`, and update OAuth callback allowlists. Providers with request-body limits below 10 MB need a direct-upload workflow before photo uploads will work there; the Next.js body-size option cannot override a host limit.
9. **Schedule queue recovery.** Generate a random `CRON_SECRET`. Configure your host's scheduler to call `GET /api/cron/verify` every minute with `Authorization: Bearer YOUR_CRON_SECRET`. This handles submissions interrupted after upload and recovers expired worker leases. Each invocation processes at most two photos concurrently. Normal submissions start verification immediately in their server action. Supabase scheduled triggers are not configured automatically.
10. **Run the live acceptance test below.** Then decide the support contact, photo retention period, deletion process, and final privacy terms currently marked unfinished on `/guidelines` before opening real signups.

## Product rules implemented

| Area                   | Beta behavior                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Access                 | Verified `@illinois.edu` email; Google or email-link sign-in                         |
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
8. Test iPhone Safari camera/library formats, email-link/Google redirects, image size limits, and the production host's request timeout/body limits.

## References

- [Supabase server-side auth](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs)
- [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
