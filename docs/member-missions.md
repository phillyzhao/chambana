# Member accounts, proof, and nuts

The current mission library has a separate real participation flow at `/app`.
It retains the existing preview access gate and iPhone/desktop design.
The old beta routes, tables, balances, and verification jobs remain retired.

## Member flow

1. Open `/app`, request an email, and open its sign-in link in the same browser. The current hosted email template sends a link, not a numeric code.
2. Save a name, unique handle, and optional interests.
3. Open a published mission and select photo or video proof.
4. Submit the private upload for review. Pending submissions earn no nuts.
5. See pending, approved, or rejected submissions in the profile/activity view. A rejection includes the owner's reason and permits another attempt.

Desktop uses `/app?view=desktop` and the same account, submissions, and balance.
`/design-preview` remains a demonstration, with a link to the real app.
Groups and messaging are placeholders in the real app until those features have a real backend.

## Owner review

Open `/mission-admin/submissions`, using the existing mission-owner access key.
The mission editor also links to this page.
Open the private proof, then approve or reject it.
Rejection requires a reason.
The queue shows up to 200 oldest pending submissions and 50 recent decisions.

Approval changes the submission and inserts its reward in one database transaction.
Each user/mission and submission can produce only one ledger entry.
Repeated approval is idempotent; a conflicting decision is rejected.
There is no automatic approval path.
The submission captures the mission title, instructions, proof requirement, revision, and nut reward so later mission edits cannot change an outstanding reward.

## Configuration

- Apply `supabase/migrations/202611110011_member_missions.sql` after migration 0010.
- Retain `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and the existing mission admin secrets.
- Set `APP_URL` to the exact application origin. Local testing uses `http://127.0.0.1:3017`.
- Add `${APP_URL}/account/callback` to Supabase Auth's redirect allowlist. The retired `/auth/callback` is not used.
- Supabase email signups must be enabled with email confirmation required. The app currently uses the hosted link-based templates. Standard PKCE links must open in the browser that requested them. After opening a link in another tab of that browser, **Check sign-in** resumes onboarding. The server still supports OTP verification for a future code-based template, but the current UI does not ask for a code the email does not contain.
- `CHAMBANA_MISSION_LIBRARY_ENABLED=true` enables the catalog and new submissions. Turning it off still allows existing submitted work to be reviewed and an upload already started to finish.

Do not commit private environment files or put the service key in browser code.

## Data and privacy

New tables: `member_profiles`, `mission_submissions`, `member_nut_ledger`.
Members can read only their own rows via row-level security, and cannot write reward or review state directly.
Server actions/routes validate the current verified identity; owner review requires the separate owner session.

The new private bucket is `member-mission-proof`.
The retired `mission-proof` bucket is unchanged.
Photos accept JPEG, PNG, and WebP up to 10 MB.
Videos accept MP4, MOV, and WebM up to 50 MB.
Uploads go directly to Storage using a path chosen by the server and an insert-only signed upload token.
Finalization verifies the actual media header and stored content type/size.
Proof previews use short-lived private signed URLs for the submitter or owner.

Unfinished uploads expire after two hours and are bounded to 20 attempts per member per hour.
Cancellation closes the submission but retains its private object: an issued upload token can still be valid, so deleting immediately would permit a late write to recreate it.
An orphan/retention cleanup job is a later operational step; nothing deletes review evidence automatically.

## Verification

`npm run check` runs TypeScript, application tests, all database migrations/tests, and a production build.
Focused tests cover verified account ownership, profile writes, callbacks, session cookies, required proof, file validation, submission routes, rejection/retry, owner-only decisions, reward snapshots, idempotent rewards, RLS, and real mobile/desktop page props.

Before a production release, complete a real email sign-in, private upload, owner review, refresh, and sign-out on both layouts.
The owner performs the live approval; automated tests use isolated fixture data.
Production deployment is separate from applying the additive database migration.

### November 11, 2026 local verification

- TypeScript, 516 application tests, 72 all-migration database tests, and the production build passed after the link-only email correction.
- Migration 0011 was applied to the linked Chambana Supabase project and verified in migration history.
- The three new tables are accessible to the server; anonymous submission reads are denied. Both private storage buckets were checked, including unchanged legacy limits.
- Only the Auth redirect allowlist was updated remotely, adding the local `/account/callback` and `https://playchambana.com/account/callback` while preserving the old entry. Other Auth settings and email templates were left unchanged.
- Local owner login and the empty review queue were verified in the browser. A sign-in email was requested through the real form; member verification, a real proof upload, and the owner's live approval remain pending the owner's interaction.
- The received email was confirmed to contain only a sign-in link. The real signup screen now matches it and checks the authenticated session instead of requesting a nonexistent code. A read-only account check found an older verified identity but no completed new member session or profile; email-confirmed status alone is not evidence of this flow completing.
- The new website code has not been pushed or deployed.
