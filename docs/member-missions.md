# Member accounts, proof, and nuts

The current mission library has a separate real participation flow at `/app`.
It retains the existing preview access gate and iPhone/desktop design.
The old beta routes, tables, balances, and verification jobs remain retired.

## Member flow

1. Open `/app`, request a sign-in code at an `@illinois.edu` address, and enter the code in the app. Supabase generates and verifies the single-use code; the app does not generate its own credentials.
2. Save a name, unique handle, and optional interests.
3. Open a published mission and select photo or video proof.
4. Submit the private upload for review. Pending submissions earn no nuts.
5. See pending, approved, or rejected submissions in the profile/activity view. A rejection includes the owner's reason and permits another attempt.

Desktop uses `/app?view=desktop` and the same account, submissions, and balance.
`/design-preview` remains a demonstration, with a link to the real app.
Inbox and notifications show real submission activity.
Member messaging is not implemented, and Groups remains a placeholder.

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
- Supabase email signups must be enabled with email confirmation required. Configure hosted **Confirm signup** and **Magic Link or OTP** templates with `supabase/templates/member-code.html` and subject **Your Chambana sign-in code**. Both must include `{{ .Token }}` and omit sign-in links. Both hosted templates were saved successfully with the exact local HTML on November 11. The same HTML is referenced in `supabase/config.toml` for a local Supabase stack; those local file references do not configure hosted email content.
- Custom SMTP is enabled with **Chambana <login@playchambana.com>**, host `smtp.resend.com`, port `465`, and username `resend`. Resend has verified `playchambana.com`. The SMTP password is a sending-only API key restricted to that domain and stored only in Supabase SMTP settings. This controls the visible sender and email body; it is not a claim that backend infrastructure is impossible to identify.
- Keep `CHAMBANA_EMAIL_OTP_ENABLED=false` in any environment until the hosted templates and sender are configured and ready for a delivery test. The local and production flags are now `true` following the validated member release. For a new environment, enable the flag only as part of a validated release. While false or unset, the app does not request emails or attempt code verification. The field accepts the configured 6–8 digits.
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

## Current release status — November 12, 2026

The member app is deployed at `https://playchambana.com/app`, retaining the access-code gate.
The owner key is configured privately in Hostinger; branded code delivery is configured in Supabase.
The current application baseline is `c7c7932e78979a9ab69e30f31d4d2ef20b53afc0`, including Play placement: three challenges in Play and the other 22 in Missions.
Typecheck, 520 application tests, 72 database tests, the production build, CI, and live split checks passed for that release.
The earlier local verification below is dated history; it is not an outstanding deployment task.
See the [iOS launch handoff](ios-launch-handoff.md) for remaining work and release evidence.

## Verification

`npm run check` runs TypeScript, application tests, all database migrations/tests, and a production build.
Focused tests cover verified account ownership, profile writes, callbacks, session cookies, required proof, file validation, submission routes, rejection/retry, owner-only decisions, reward snapshots, idempotent rewards, RLS, and real mobile/desktop page props.

Before a production release, complete a real email sign-in, private upload, owner review, refresh, and sign-out on both layouts.
The owner performs the live approval; automated tests use isolated fixture data.
Production deployment is separate from applying the additive database migration.

### November 11, 2026 local verification

- TypeScript, 513 application tests, 72 all-migration database tests, and the production build passed after restoring code-only sign-in and adding the email readiness gate.
- Migration 0011 was applied to the linked Chambana Supabase project and verified in migration history.
- The three new tables are accessible to the server; anonymous submission reads are denied. Both private storage buckets were checked, including unchanged legacy limits.
- The Auth redirect allowlist includes the local `/account/callback` and `https://playchambana.com/account/callback`, preserving the old entry. Custom SMTP and both hosted code templates were subsequently configured as recorded below.
- Local owner login and the initially empty review queue were verified in the browser before the first proof submission.
- Four additive DNS records were saved in Hostinger for Resend verification, preserving the original three website records and the nameservers. Resend reports `playchambana.com` as **Verified**.
- A sending-only API key restricted to `playchambana.com` was created and stored only in Supabase SMTP. Custom SMTP is enabled with the Chambana sender, and both hosted code templates were saved successfully using the exact local HTML containing `{{ .Token }}` and no sign-in links.
- With local `CHAMBANA_EMAIL_OTP_ENABLED=true`, the actual app OTP request returned **Code sent**. Resend reports the message **Delivered** to the approved owner test address.
- The member successfully entered the numeric code and completed the profile. A read-only backend check verified a fresh sign-in at **5:50:57 PM CST** and profile creation at **5:51:13 PM CST** on November 11, 2026.
- Before the first upload, browser checks confirmed the same saved profile with **0 nuts** and **0 submissions** in both iPhone and desktop layouts.
- The proof form's **Submit** button is disabled with no file selected. Its labels are **Submit** when idle, **Submitting…** while sending, and **Finish submitting** for a finalization retry. The scoped `.submission .submit` rule prevents inherited dark button text.
- The owner approved the **High-five a mammoth** proof submission at **6:02:04 PM CST** on November 11, 2026. The private JPEG was stored successfully, and its MIME type and size matched the submission. Before approval, the ledger and balance were both zero.
- A read-only backend check confirmed exactly **1 reward entry** for that submission, totaling **30 nuts**, and **1 approved mission**. The refreshed iPhone profile displays **30 nuts**, **1 mission**, and **Approved · +30 nuts** for the submission.
- The desktop profile also displays **30 nuts**, **1 completed mission**, and the approved submission. Signing out from desktop returns to email sign-in, and a fresh iPhone page confirms the shared member session is cleared.
- At this local checkpoint, the new website code had not yet been pushed or deployed. That status was superseded by the release recorded above.

### Branded sender setup — November 11 record

Resend is the selected email delivery provider; Supabase remains the authentication provider.
The domain, restricted sending key, custom SMTP, and hosted code templates were configured successfully on November 11.
The sequence below preserves the local setup record and its then-outstanding checks.
Deployment is complete as recorded above; sender/body inspection and invalid/reused-code cases remain explicit device-acceptance checks unless later evidence records them.

1. Domain verification is complete. For future setup, use Resend's exact DNS records and preserve existing website, inbound mail, unrelated records, and nameservers. The November 11 change added four records without replacing the original three website records.
2. Supabase Auth custom SMTP is enabled with sender `login@playchambana.com`, name `Chambana`, host `smtp.resend.com`, port `465`, user `resend`, and the domain-restricted sending key as the password. Keep that key only in Supabase SMTP settings; never put it in browser code, chat, or Git.
3. Both hosted templates now use the exact local code email HTML. Keep email confirmation enabled and use the existing eight-digit OTP setting, or deliberately configure another length supported by the UI. Set the intended expiry in Supabase; the template does not promise an unverified duration.
4. The local readiness flag is enabled, the app requested the owner's approved test email, and Resend reports delivery. Numeric code verification and profile save succeeded, and both layouts display the same saved profile. Still verify the received sender/body and invalid/reused-code rejection. Disable the flag again if delivery or verification fails.
5. The live private proof upload, owner approval, single reward entry, matching balances on both layouts, and shared sign-out behavior are verified locally. Verify the deployed revision and production configuration separately.

References: [Supabase OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), and [Resend's Supabase SMTP guide](https://resend.com/docs/send-with-supabase-smtp).
