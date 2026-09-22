# Beta operations and remaining launch gates

## Support, retention, and deletion

Before public signups, the owner must select a monitored `SUPPORT_EMAIL`, a proof retention period, and final privacy terms. The guidelines page displays the configured contact. No retention period has been invented or enabled by this coding pass.

Until a reviewed deletion implementation exists, handle verified requests manually:

1. Confirm the requester controls the account; do not rely on a supplied user ID alone. Never ask for passwords or API keys.
2. Inventory only that account's profile, memberships, owned groups, submissions/proof objects, reports, and point history. Determine whether group ownership must be transferred and which records must be retained/anonymized under the published policy.
3. Obtain an explicit, scoped deletion confirmation and review foreign-key/cascade effects. Do not blindly delete from `auth.users`: scoring and group ownership are linked.
4. Remove approved proof objects through the Storage API, record `proof_deleted_at`, and handle affected database records according to the reviewed plan. Storage and Postgres writes are not one atomic transaction; record failures and retry only the exact paths.
5. Verify private links no longer work and document completion. Explain any backup-retention delay and retained records to the requester.

`proof_deleted_at` is schema groundwork, not an active cleanup service. There is no automated retention or self-service account deletion yet. Never delete pending/admin-review evidence as routine cleanup. Failed-upload orphan cleanup also remains an operational follow-up.

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
