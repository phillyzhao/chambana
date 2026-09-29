# Beta operations and remaining launch gates

## Support, retention, and deletion

Before public signups, the owner must select a monitored `SUPPORT_EMAIL`, a proof retention period, and final privacy terms. The guidelines page displays the configured contact. No retention period has been invented or enabled by this coding pass.

Until a reviewed deletion implementation exists, handle verified requests manually:

1. Confirm the requester controls the account; do not rely on a supplied user ID alone. Never ask for passwords or API keys.
2. Inventory only that account's profile, memberships, owned groups, submissions/proof objects, `photo_archive` records (including deleted groups), reports, and point history. Determine whether group ownership must be transferred and which records must be retained/anonymized under the published policy.
3. Obtain an explicit, scoped deletion confirmation and review foreign-key/cascade effects. Do not blindly delete from `auth.users`: scoring and group ownership are linked.
4. Remove approved proof objects through the Storage API, record `proof_deleted_at` in both any live submission and its archive record, and handle affected database records according to the reviewed plan. Storage and Postgres writes are not one atomic transaction; record failures and retry only the exact paths.
5. Verify private links no longer work and document completion. Explain any backup-retention delay and retained records to the requester.

`proof_deleted_at` is schema groundwork, not an active cleanup service. There is no automated retention or self-service account deletion yet. Never delete pending/admin-review evidence as routine cleanup. Failed-upload orphan cleanup also remains an operational follow-up.

## Group deletion

### Community updates — September 28

The groups filter includes All groups, Open to everyone, Organizations, Invite only, and My groups. Counts include all active members, including the current owner; pending requests are excluded. Active members and platform admins can open the member directory, which contains public profile names/pictures and the owner's role, never email addresses.

Regular members can leave or cancel a pending request. Leaving preserves previous submissions and point history, but removes mission access. Owners cannot leave while they own the group: they can delete it or transfer ownership to another active, confirmed-campus member who is already an approved organizer. Transfer immediately removes the old owner's group controls without changing their global organizer approval or granting the recipient platform-admin access. The old owner can then leave as a member. Only the approved current owner can refresh missions; this is enforced in SQL as well as both mission screens. Platform admins can edit the group description; HTTP(S) and www addresses render as safe links.

Profile photos are public through `/api/avatars/[id]`, stored separately in the private `profile-avatars` bucket, and normalized with the existing image validation/metadata removal. Only the server can update avatar paths. Replacing an avatar attempts to remove the previous object; `avatar_cleanup_failed` requires a scoped orphan check. Include avatars in reviewed account-deletion requests.

### Notification email delivery

Migration `202609280007_community_features.sql` transactionally queues notifications when a membership becomes active (including organizer approval), an active member voluntarily leaves, or a report changes from open to resolved. Repeating the same join/resolve call does not create another event. Group deletion does not emit voluntary-leave emails. Report records snapshot a readable target name so resolution emails can still identify deleted groups. Already-active memberships and already-resolved reports are not retroactively emailed.

**Pending owner setup, explicitly deferred September 28:** choose an email provider and sending email address, verify the sender with that provider, and configure its credentials. Configure `SMTP_HOST`, `SMTP_PORT` (587 with required STARTTLS, or 465 with TLS), `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` in private host settings. This is separate from Supabase Auth email configuration. No provider account, sender identity, or credentials have been selected or configured by this change; local delivery tests mock SMTP and send no real emails.

The About Team section lists Marcos Monroe — Co-Founder and Phillip Zhao — Co-Founder, as supplied by the owner. Expanded team biographies and further About details will be added later; Origin remains a placeholder, and Mission retains the existing short app tagline.

After successful membership/report actions, Next.js schedules a delivery attempt after the response. The existing authenticated `/api/cron/verify` endpoint also drains email retries in bounded batches. Confirm the trusted runner still invokes it every minute. SMTP downtime leaves events queued, with exponential backoff and a maximum of eight attempts. Leases protect overlapping workers; a stable Message-ID is reused. SMTP delivery is at-least-once: a crash after provider acceptance but before the database acknowledgment can produce a duplicate. Provider acceptance does not prove inbox delivery; verify receipt in a real Illinois inbox before launch.

Missing SMTP configuration is shown to admins and makes production preflight/cron fail rather than silently reporting successful delivery. Email rows with eight attempts and no `sent_at` require operator review. Confirm the cause and provider acceptance before resetting attempts/availability on specific failed rows. Never bulk-requeue sent notifications or include recipient addresses, credentials, or raw SMTP errors in logs.

Migration 007 was applied to linked production project `Backend_Chambana` on September 28 before the app push; the hosted rollback-only regression checks passed afterward. Do not reapply it manually. Until SMTP is configured, events remain queued. Test open/invite joins, organization approval, voluntary leave, owner transfer, and report resolution using consented test accounts after deployment.

### Deletion behavior

The approved owner can delete a group from its detail page by typing its exact, case-sensitive name. The database verifies ownership and confirmation under a group lock; client-side button disabling is only a convenience. Deletion removes memberships, invites, category filters, assignments, submissions, and the group's point transactions, so members lose the points earned through that group. Other groups and their data remain unchanged. Group reports and a deletion audit event remain for platform review.

Active uploads or processing reviews must finish before deletion; stale work is recovered by the existing cron job. Photos remain in the private `mission-proof` Storage bucket. The `photo_archive` table catalogs every completed upload, including rejected and review-pending submissions, with its uploader, original group, mission criteria, timestamps, storage path, hash, and review result. A database trigger creates the record on upload completion and updates review metadata. Existing completed uploads are backfilled by the migration. Archive records have no cascading links to deleted groups, assignments, or accounts; reviewed deletion requests must explicitly include the archive. Only platform admins and the server service role can read the archive. There is no automatic archive deletion or group-photo cleanup job. Upload consent and the group deletion confirmation disclose this retention. This does not set a final retention period or authorize other uses of the photos.

Apply migration `202609260006_delete_groups.sql` before deploying this feature. Verify group deletion and private photo preservation with a disposable test group on the real environment before relying on it for user requests. Photo bytes are stored once in object storage; the indexed archive stores searchable records rather than image bytes. Capacity remains subject to the project's storage limits and billing; no plan change or capacity benchmark has been performed.

## Abuse and incident response

- Email actions use per-address and global rate counters; mutations have per-user counters. Database limits serialize group creation, joining, submissions, reports, and invites. These do not replace edge/WAF limits or Supabase Auth limits/CAPTCHA.
- Watch admin review backlog and Google quota/spend. Configure provider budgets/alerts with the owner; the app does not impose an account-wide spending cap.
- On provider failure, photos remain for human review and no automatic points are granted. Queue errors surface as 503 for scheduler alerts.
- For exposed credentials, rotate only the affected credentials with the owner, update host variables, and investigate access logs. Never post raw logs containing credentials.
- Reports can be reviewed/resolved; broad account suspension/content takedown tools are not implemented. Keep launch scope small until this is addressed.

## Verification boundaries

`npm test` is local deterministic testing. `npm run test:live` contacts Google and hosted Supabase, may consume API quota, and creates/removes only a random synthetic Storage fixture. Its red-square photos test the API contract and obvious negative cases, not campus-photo accuracy.

`npx supabase db query --linked --file tests/live/database.sql` exercises hosted functions/RLS using transaction-local QA users/groups/scores and rolls everything back. It does not send emails and does not replace browser testing, real account consent, or concurrent load testing.

Before launch, collect consented representative photos (matching, wrong, ambiguous, manipulated, and unsafe-content cases) and compare AI decisions to human labels. Do not send sensitive photos just to enlarge a test set. Record false approvals and route unsuitable challenges to manual review.
