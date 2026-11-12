# Chambana — compact context checkpoint

Updated November 12, 2026.
Start here after context compaction; read the [full iOS launch handoff](docs/ios-launch-handoff.md) before new implementation.
The earlier October beta handoff is preserved byte-for-byte in [the historical archive](docs/archive/handoff-2026-10-08.md).
Links inside that archived file were relative to its original repository-root location.

## Current task and next task

The owner's current request is to write the launch handoff, compact context, and push to Git.
This is a documentation change; no new feature, public signup access, Apple account, purchase, or App Store submission is included.
The full handoff records the plan and evidence; this file is the concise recovery state.

**Recommended next engineering task:** add account deletion and privacy/support access through Profile/Settings in the current design, with owner-approved handling of stored proof and account data.
Then choose/prove the native iOS architecture, create a signed build, test on physical iPhones through TestFlight, run a small local beta, and prepare App Store review.
No native iOS project exists in this repo yet; Apple Developer/App Store Connect account status is unknown.

## Product baseline

- Live member app: https://playchambana.com/app; desktop: `/app?view=desktop`.
- Existing access-code gate stays enabled until the owner opens the product publicly.
- Verified `@illinois.edu` accounts use an eight-digit code generated and verified by Supabase.
  Email sender is Chambana `<login@playchambana.com>` through Resend SMTP in Supabase.
- Photo/video proof is mandatory and private.
  Only the owner can approve/reject at `/mission-admin/submissions`; only approval awards nuts.
- The verified owner test has one approved submission, one ledger entry, and 30 nuts.
  Preserve it; use disposable fixtures for future destructive testing.
- Play contains exactly **Moonwalk past Alma**, **Everybody jump**, and **Backwards high-five**.
  Missions contains the other **22**; no overlap.
- Placement is persisted independently of category and editable in `/mission-admin` under **Appears in**.
  New missions default to Missions; content edits withdraw approval.
- Mobile bottom tabs: Home, Missions, Play, Groups, Inbox.
  Desktop has no dedicated Play nav button yet.
- Inbox/notifications show real submission activity; member messaging is not implemented.
  Groups is a placeholder; bookmarks are local UI state.
- `/design-preview` is a demo, not the real account flow.
  Old beta routes, Microsoft/email-link flow, Gemini review, and cron remain retired.
- Keep the monochrome design, Urbana–Champaign focus, sentence-per-line copy, mandatory media proof, and owner-controlled rewards.

## Verified release and remaining gaps

Application baseline: `c7c7932e78979a9ab69e30f31d4d2ef20b53afc0` on `main`.
November 12 verification: 520 application + 72 database tests (592 total), typecheck, production build, and production dependency audit passed.
[GitHub checks](https://github.com/phillyzhao/chambana/actions/runs/43253894930) succeeded.
Hostinger deployment `01a1d07d-185f-7391-9012-c654bcce1c03` completed for that SHA; live checks confirmed Play 3 / Missions 22.
This is dated baseline evidence; recheck before a future release.

Missing launch work: account deletion, approved privacy/support/retention, proof cleanup, native project/signing, physical-device acceptance, beta operations, review access and store submission.
Current uploads have error/retry/reconciliation handling but no proven native camera integration, HEIC support, durable offline queue, or background upload.
Do not call the app App Store ready based on browser screenshots.

## Safe resumption

1. Verify Crucial X10 is mounted and `pwd -P` is `/Volumes/Crucial X10/Chambana` before project operations.
   Never create an internal fallback checkout; `.env.local` stays private on the SSD.
2. Read `AGENTS.md`; read the relevant installed Next.js docs before code changes.
   Use Node 24; current Next is 16.4.6.
3. Inspect Git status; preserve unrelated untracked artwork, design screenshots, research, and inspiration folders.
   Stage only named task files.
4. Migrations through `202611120012` are already applied remotely.
   Do not reseed, run legacy imports, or reactivate old workers.
5. Read [member accounts/proof](docs/member-missions.md), [mission library](docs/mission-library.md), and [current hosting configuration](docs/hostinger.md).
   Hostinger already has the private owner key; SMTP key stays only in Supabase.
6. `main` auto-deploys.
   For a code release, verify remote SHA, CI, hosting revision, and actual live behavior separately.
   Preserve production data when recovering a release.

Full next-task acceptance criteria, evidence limits, Apple source links, and open owner decisions are in [docs/ios-launch-handoff.md](docs/ios-launch-handoff.md).
