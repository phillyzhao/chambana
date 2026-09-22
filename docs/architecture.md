# Backend map

The browser renders Next.js pages and submits forms to server actions. Server actions authenticate with Supabase, validate input, and invoke specific Postgres functions as the user. RLS and database function checks enforce permissions even if a caller bypasses the UI. All application secrets stay in server environment variables.

## Photo path

1. User action verifies campus identity, rate limits, required consent, and declared image type/size.
2. `begin_submission` checks group membership, the server deadline, and per-hour limits; under a group lock, it reserves the mission's one pending proof slot.
3. Only after authorization/reservation, the server decodes the actual format, rejects animated/disguised/over-pixel-limit files, removes metadata, normalizes to JPEG, and saves it to private storage. `finish_upload` records a hash and makes the durable job pending. Failure closes the attempt without awarding points.
4. `claim_submission` atomically issues a two-minute lease and increments attempts. Manual-review mission snapshots skip Gemini. Otherwise Gemini gets the normalized image, mission proof criteria, and a constrained output schema.
5. Schema validation and the confidence/safety policy select approval, rejection, or manual review. The server never trusts arbitrary AI tool instructions.
6. `settle_submission` locks the group and assignment, checks the lease, saves the outcome, closes an approved mission, and inserts a unique point transaction. Approval and reward are one SQL transaction.
7. Interrupted jobs are recovered by the authenticated cron endpoint. Provider failures go to admin review. After three abandoned attempts, the job goes to admin review. A stale callback cannot overwrite an admin verdict.

## Tables

- `profiles`: public display fields only; auth email stays in `auth.users`.
- `platform_admins`, `organizer_emails`: private access lists.
- `groups`, `group_categories`: discovery information and selected mission pools.
- `group_members`, `group_invites`: private membership/access state.
- `categories`, `missions`: central, platform-reviewed catalog.
- `settings`: default slot/timer settings.
- `assignments`: group-specific snapshots of published missions.
- `submissions`: photo reference, state, AI evidence, retry lease.
- `nut_transactions`: unique completion ledger; group and person rankings are views of the same event.
- `reports`, `audit_log`: moderation intake and admin history.
- `request_limits`: service-only fixed-window counters with HMAC-hashed subjects; expired counters are cleaned by cron.

## Catalog and auth

`missions/temporary-catalog.json` is the current seven-mission catalog. Replacement is transactional and keyed: it upserts these missions and unpublishes prior entries without rewriting existing assignment snapshots or points. `manual_review` is snapshotted at assignment creation and enforced again in SQL settlement so the AI worker cannot auto-award a manual-only challenge.

Microsoft uses Supabase's Azure provider with email scope, a single-tenant Illinois Entra registration, and canonical `APP_URL` callbacks. The feature flag defaults off; email-link fallback remains available. Read the deployment and Microsoft runbooks before changing provider settings.

## Future iOS integration

Supabase Auth, database functions, storage, and scoring remain reusable. The current photo processing is in a Next.js server action, which is a web-specific transport. Before building the native client, expose that same checked upload/verification service through a versioned authenticated API or Edge Function; do not try to call undocumented Next.js action IDs from Swift. Native video requires a new upload path, background processing, cost limits, supported codecs, and a video-verification adapter. The schema's `media_kind` leaves room for that work without claiming it already exists.
