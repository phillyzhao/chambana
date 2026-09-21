# Chambana Missions — Handoff

## Project context

Chambana Missions is a UIUC-only campus challenge product. People join groups, receive shared missions, submit photo proof, and earn “nuts” as leaderboard points. The website is a mobile-first beta that should eventually become an iOS app.

The current interface is intentionally monochrome and skeletal. It is only for testing functionality. The exact UI/UX design will be implemented later. Do not spend time polishing the visual design unless explicitly asked.

## Current objective

The next chat should work in this order:

1. Explain the code that already exists in plain language so the owner understands the system.
2. Connect the project to a real Supabase project.
3. Connect the owner’s Gemini API key using Gemini 2.5 Flash.
4. Test that photo submissions are sent to Gemini and that Gemini evaluates whether the photo matches the mission’s proof criteria.
5. Verify the full beta flow with real accounts and test photos.

The owner already has a Gemini API key. Never put it in chat, source files, commits, or this handoff file. It belongs in `.env.local` or the deployment provider’s encrypted environment variables.

## Current stack

- Next.js 16 App Router
- TypeScript
- React 19
- Supabase Auth, PostgreSQL, Row Level Security, and Storage
- Google OAuth or email-link authentication through Supabase
- `sharp` for server-side photo normalization and metadata stripping
- Gemini REST API for photo verification
- Vitest and PGlite for local tests
- Node 24 recommended; `.nvmrc` contains `24`

Run locally:

```sh
nvm use
npm ci
npm run dev
```

Open `http://localhost:3000`.

Validation commands:

```sh
npm run typecheck
npm test
npm run build
npm run check
```

The preview works without credentials using labeled sample data. The preview cannot create real accounts, upload real photos, or award real points.

## Important files

- `src/app/globals.css` — current temporary monochrome skin.
- `src/app/missions/page.tsx` — mission dashboard and shared mission slots.
- `src/app/groups/page.tsx` — group search/discovery and organizer group creation.
- `src/app/groups/[id]/page.tsx` — group details, joining, invites, and organizer member review.
- `src/app/admin/page.tsx` — platform admin panel.
- `src/app/actions.ts` — authenticated server actions for mutations and photo uploads.
- `src/lib/data.ts` — server-side page data access and preview/demo data.
- `src/lib/supabase.ts` — Supabase browser/server/service clients.
- `src/lib/rules.ts` — campus email validation, form schemas, photo limits, and safety text.
- `src/lib/verification.ts` — Gemini photo verification adapter and submission worker.
- `src/app/api/cron/verify/route.ts` — authenticated queue recovery endpoint.
- `supabase/migrations/202609210001_beta.sql` — main database schema, functions, policies, storage bucket, and seed categories.
- `supabase/migrations/202609210002_review_status.sql` — group-safe submission status function.
- `supabase/config.toml` — local Supabase configuration.
- `README.md` — detailed setup, product rules, privacy model, and live acceptance test.
- `docs/architecture.md` — backend data flow and future iOS integration notes.
- `missions/mission-catalog.example.txt` — text format for adding missions later.
- `scripts/import-missions.mjs` — validates/imports unpublished mission drafts.
- `tests/` — database, authorization, lifecycle, catalog, redirect, cron, and Gemini adapter tests.

## Product rules already coded

- Only verified `@illinois.edu` accounts may use the beta.
- Platform admins explicitly approve organizer emails.
- Approved organizers create groups.
- Groups may be open, invite-only, or organization-based.
- Organization groups require platform verification before pending members can be approved.
- A group has three active mission slots by default.
- A mission belongs to the whole group. Any member can submit the proof.
- The first approved photo completes the mission for everyone in that group.
- One approved completion creates one unique nut transaction. Repeated requests cannot award points twice.
- Default mission window is 24 hours.
- Default replacement cooldown is 60 minutes.
- Declining a shared mission is restricted to the approved group organizer because it affects everyone.
- A timely submission may finish review after the mission deadline.
- Rejected proof can be resubmitted while the mission remains active.
- Videos are reserved in the schema but uploads and verification are photo-only for this beta.
- Public profiles, group information, and leaderboard scores are visible. Email addresses and proof photos are private.
- Prohibited content includes illegal activity, alcohol/drugs, harassment, trespassing, dangerous stunts, sexual content, coercion, hazing, and public humiliation.

## Supabase connection checklist

1. Create a new Supabase project owned by the team.
2. Apply both migrations in filename order using the Supabase SQL Editor or Supabase CLI.
3. Copy `.env.example` to `.env.local`.
4. Add:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
APP_URL=http://localhost:3000
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.5-flash
CRON_SECRET=long_random_secret
```

5. Enable Google in Supabase Auth and configure the Google OAuth callback URL shown by Supabase.
6. Keep email-link sign-in enabled as a fallback.
7. Add `http://localhost:3000/auth/callback` to Supabase redirect URLs during local testing.
8. Bootstrap the first platform admin in Supabase SQL Editor:

```sql
insert into public.platform_admins(email)
values ('your_netid@illinois.edu')
on conflict (email) do nothing;
```

9. Restart the dev server after changing `.env.local`.
10. Sign in as the platform admin and open `/admin`.

Do not apply these migrations to an unrelated production database. They manage permissions in the public schema and should be reviewed before applying to any existing project.

## Gemini 2.5 Flash connection

The adapter is in `src/lib/verification.ts`. It currently calls the Gemini REST endpoint with:

```env
GEMINI_MODEL=gemini-2.5-flash
```

The request sends:

- The mission title.
- The mission’s photo proof criteria.
- The normalized JPEG photo as inline image data.
- A system instruction that treats the photo and mission text as untrusted evidence.
- A structured JSON response schema.

Gemini must return:

```json
{
  "decision": "approved | rejected | needs_review",
  "confidence": 0.0,
  "reason": "short explanation",
  "unsafe": false
}
```

Automatic approval/rejection only happens when confidence is at least `0.90` and `unsafe` is false. Uncertain, unsafe, malformed, blocked, or unavailable results become `needs_review` for a platform admin. Missing Gemini credentials also routes to review rather than approving automatically.

The application does not ask Gemini to prove identity, date, location, or who performed the activity. It only asks whether the visible photo appears to satisfy the stated proof criteria. This limitation should be explained to the owner before relying on automatic approval.

## Photo submission flow

1. The member opens an active shared mission.
2. The server checks campus identity, group membership, deadline, consent, file type, and 8 MB size limit.
3. `sharp` rotates the image, resizes it, strips metadata, and converts it to a normalized JPEG.
4. The server creates a pending submission through `begin_submission`.
5. The server uploads the normalized image to the private `mission-proof` bucket.
6. A SHA-256 photo hash prevents the same member from reusing the same photo.
7. The verifier claims the submission with a short lease, sends it to Gemini, validates the structured response, and calls `settle_submission`.
8. `settle_submission` closes the group mission and inserts the unique nut transaction if approved.
9. A failed or interrupted verifier is recovered by `GET /api/cron/verify`.

The current server action attempts immediate verification. The cron endpoint is the recovery path for pending or expired leases. Configure a scheduler to call it every minute with:

```http
Authorization: Bearer YOUR_CRON_SECRET
```

## What to test next

After Supabase and Gemini are connected:

1. Sign in with a real verified Illinois account.
2. Confirm a personal Gmail address and lookalike domains are rejected.
3. Approve a second Illinois account as an organizer.
4. Create a group and publish at least four simple test missions from `/admin`.
5. Join the group with two member accounts.
6. Refresh mission slots and confirm three shared assignments appear.
7. Submit a clearly matching photo and inspect the Gemini result, submission status, and nut transaction.
8. Submit a clearly wrong photo and confirm rejection or manual review.
9. Send an ambiguous image and confirm it routes to admin review.
10. Confirm two near-simultaneous submissions cannot award points twice.
11. Test the photo size/type limit and iPhone Safari photo selection.
12. Test Gemini failure, malformed response, blocked response, and cron recovery.
13. Confirm public profile/leaderboard data is visible while signed out, while email addresses and proof photos remain private.

## Known limitations and future work

- The frontend is intentionally barebones and monochrome. A full UI/UX redesign comes later.
- The local preview has sample data only until Supabase credentials are configured.
- Video is not supported yet, although the schema keeps `media_kind` extensible.
- There is no public media feed yet.
- There is no payment, avatar marketplace, push notification, friend graph, or iOS client yet.
- The app needs a final photo retention policy, account deletion process, support contact, and production privacy terms before public signups.
- Gemini verification needs representative evaluation photos and human review before it should be trusted for automatic scoring.
- The current upload path uses a Next.js server action. Before the iOS app, expose the same validated workflow through a versioned API or Supabase Edge Function rather than calling Next.js action IDs from Swift.

## Handoff instruction for the next chat

Start by explaining the codebase in plain language. Then help configure Supabase using the checklist above. Then add the Gemini API key to the local environment and test `gemini-2.5-flash` with controlled sample photos. Keep the monochrome frontend unchanged unless specifically asked. Do not redesign the UI during backend integration.
