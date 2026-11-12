# Chambana iOS launch handoff

Updated November 12, 2026.
This is the current launch plan and supersedes the October group-beta launch instructions.
The website is a working, gated member app; an App Store app has not been built or submitted from this repository.
This handoff records the next work; it does not authorize new accounts, purchases, public signup access, or App Store submission.

## First next task

**Finish the account lifecycle in the existing design: Profile/Settings with account deletion, privacy and support access, and explicit handling of stored proof and account data.**

This is a concrete gap in the working member app and can be completed before choosing the native client architecture.
Apple requires apps with account creation to offer an accessible way to initiate account deletion in the app; temporary deactivation alone is insufficient.
Associated data must be handled consistently with the disclosed retention obligations.
See [Apple's account deletion guidance](https://developer.apple.com/help/app-review/guideline-reference/5-1-1-account-deletion).

Implementation scope for that next task:

- Add Settings entry points to the existing real profile on iPhone and desktop, preserving the current visual design.
- Add authenticated deletion with clear confirmation, server-side ownership checks, session handling, and an honest completion/pending/error state.
- Define and implement removal of the Auth user, profile, submissions, private proof, and nut ledger data; inspect current foreign keys and storage ownership before choosing transaction and retry boundaries.
- Handle races with owner review, active uploads, and already-issued storage tokens.
  Cancellation currently retains private objects because a valid upload token could recreate a deleted object.
  Deletion therefore needs a retryable cleanup process and verification after upload tokens expire.
- Give privacy and support information public URLs reachable from sign-in and Settings.
  Prepare terms/community rules appropriate to the actual first release.
- Ask the owner for the monitored support destination, retention periods, any justified retained records, and final policy approval before publishing policy promises.
  Do not invent a legal requirement to keep reward records or choose arbitrary retention periods.
- Add focused tests for member isolation, repeated deletion, interrupted cleanup, review/upload races, and inaccessible deleted media.
  Use disposable test accounts and consented fixtures, not the owner's existing approved submission.

Done means a member can initiate deletion, see an accurate result, and no longer use a deleted account; storage and associated data match the approved policy, including eventual cleanup where necessary.
Private proof and service credentials must stay private throughout.
The current sign-in, upload, owner decision, and exactly-once reward flow must still pass.

## Verified baseline to preserve

Release evidence below is dated November 12, 2026, for application commit `c7c7932e78979a9ab69e30f31d4d2ef20b53afc0`.
Recheck current Git and hosting state before a later release; this document is not a live monitor.

| Area | Current state |
| --- | --- |
| Production | [playchambana.com/app](https://playchambana.com/app), still behind the established access-code gate |
| Desktop | [Real desktop app](https://playchambana.com/app?view=desktop), sharing the same member data |
| Sign-in | Verified `@illinois.edu` account, Supabase-generated numeric code; configured length is eight digits |
| Email | Chambana `<login@playchambana.com>` through Resend SMTP configured in Supabase |
| Proof | Required private photo or video; no text-only completion or automatic approval |
| Review | [Owner submission queue](https://playchambana.com/mission-admin/submissions), separately protected owner session |
| Nuts | Awarded only on owner approval, atomically and idempotently; pending submissions earn zero |
| Catalog | 25 approved Urbana–Champaign challenges; persisted `placement` separates Play and Missions |
| Play | Exactly **Moonwalk past Alma**, **Everybody jump**, **Backwards high-five** |
| Missions | The other **22**, with no overlap; Four-second crawl and Dance break stay here |
| Mobile navigation | Home, Missions, Play, Groups, Inbox; Play is the center button |
| Desktop navigation | Home, Missions, Groups, Inbox plus profile; no separate desktop Play navigation button yet |
| Inbox | Real member submission activity and review results; not member-to-member messaging |
| Groups | Placeholder in the real app; demo interactions are not a working group backend |
| Saved challenges | Local UI state; do not promise cross-device or reload persistence |
| Demos | `/design-preview` and its desktop variant remain explicitly sample experiences |

Owner catalog editing is at `/mission-admin`, including inline names, scheduling, explicit approval, and **Appears in → Missions / Play**.
Placement is independent of the five categories: Self Improvement, Campus Exploration, Dares, Kindness, Food & Local.
New missions default to Missions; editing content withdraws approval.
Do not reseed or replace the catalog to change navigation.

The verified owner test produced one approved submission, one ledger entry, and **30 nuts**, visible on both layouts.
The Play split preserved that result and did not create new test rewards.
Do not include member email, uploaded proof, auth codes, private signed URLs, or keys in Git or public release evidence.

### Release evidence

- Local full check passed: TypeScript, **520 application tests + 72 database tests = 592 unique tests**, and the Next.js production build.
- [GitHub Application checks run 43253894930](https://github.com/phillyzhao/chambana/actions/runs/43253894930) succeeded for `c7c7932`.
- Hostinger reported deployment `01a1d07d-185f-7391-9012-c654bcce1c03` completed for that exact commit on November 12 at 10:02 AM Central.
- Live browser checks verified the three Play choices and the other 22 Missions on iPhone and desktop layouts, including no overlap.
- Production dependency audit reported zero vulnerabilities at this release; this is a dated result, not a guarantee about future dependencies.
- Browser layout verification is not a native build or physical-iPhone acceptance test.

Local screenshots and verification data are in ignored `test-results/member-flow/`, including `play-missions-split-verified.json`, `play-three-live.png`, and `split-deployment-completed.png`.
These files are not guaranteed to exist in a fresh clone.

## Ordered path to launch

### 1. Account lifecycle and launch scope

Complete the first task above.
Agree that the initial product is discovering a local challenge, doing it, submitting proof, receiving the owner's decision, and earning nuts.
Retain submission activity; defer group creation and messaging unless the owner explicitly expands scope.
Review unfinished navigation and remove or clearly resolve placeholders before the submitted build, with the owner's design decision recorded.
Do not silently redesign the app or change the 3/22 split.

Apple expects a complete app with working URLs, on-device testing, and reviewer access to signed-in functionality.
See [App Review Guidelines, section 2.1](https://developer.apple.com/app-store/review/guidelines/#app-completeness).

### 2. Choose and prove the iOS delivery architecture

There is no Xcode project, Capacitor/Expo/React Native configuration, native signing setup, or native privacy manifest in the current repository.
Apple Developer Program enrollment, team ownership, App Store Connect access, bundle ID, and installed signing assets are **unknown** and need checking with the owner.

Run a small architecture spike before a full port.
Compare a native client (SwiftUI or React Native) with a carefully integrated web-based client against the same acceptance flow and design.
The current Next.js app depends on server rendering, Server Actions, cookies, and server-only credentials; it cannot simply be treated as a static export.
Keep trusted mutations on a server, adapt authentication/session transport deliberately, and never bundle the service-role or owner secret.

The spike should prove code sign-in, persistent session, camera/library selection, private upload, approval refresh, and navigation on a physical iPhone.
Record the chosen architecture and tradeoffs before adding the full native project.
Apple's minimum-functionality guidance expects value beyond a repackaged website; no wrapper choice guarantees review approval.
See [App Review Guidelines, section 4.2](https://developer.apple.com/app-store/review/guidelines/#minimum-functionality).

### 3. Internal TestFlight and device acceptance

Create the signed iOS target, set an agreed minimum iOS version, and configure only necessary capabilities and permission descriptions.
Check the then-current Xcode/SDK submission requirements and privacy-manifest obligations for the chosen dependencies.
Confirm developer account access before assuming signing or uploading is available.

Use a versioned acceptance record with build number, backend commit, device/iOS version, result, and non-sensitive evidence:

| Flow | Required evidence before inviting a wider beta |
| --- | --- |
| Sign-in | New/returning accounts, invalid/expired/reused codes, resend limits, code AutoFill, session restoration and sign-out |
| Discovery | Exactly 3 Play and 22 Missions, no overlap, saved availability windows, correct reward and proof instructions |
| Photo/video | Camera and library permissions, denial/recovery, real photo and video, cancellation, size limits, HEIC behavior |
| Upload recovery | Slow/lost connection, retry/finalization, app background/foreground and relaunch; no silent loss or duplicate reward |
| Owner decision | Pending earns zero, rejection reason and retry, approval once, repeated approval unchanged, balance refresh on both layouts |
| Privacy | Another member cannot access proof or account rows; owner gate protected; deletion and cleanup verified |
| Accessibility | Small supported phone, larger text, VoiceOver labels/focus, contrast, keyboard and reduced-motion behavior |
| Operations | Delivery failures and pending-review backlog visible to the operator; documented recovery without logging private media or codes |

The current browser upload accepts JPEG/PNG/WebP up to 10 MB and MP4/MOV/WebM up to 50 MB.
It has failure handling, retry, and reconciliation, but no proven native camera integration, durable offline queue, or background upload service.
HEIC is not explicitly accepted; verify actual iPhone conversion/selection rather than assuming it works.
An offline queue is a product choice; clear, reliable recovery is the acceptance requirement.

### 4. Small Urbana–Champaign beta

Suggested first cohort: 10–20 invited local participants after internal device checks pass.
This is a recommendation, not an invitation or outreach authorization.
Track sign-in completion, first successful proof submission, repeat participation, review turnaround, and support failures using minimal data.
Agree on the owner's review cadence before promising turnaround in the UI.
Observe which challenges people actually do before adding more features.

External TestFlight distribution requires the applicable beta review; Apple's first submitted build requires a full TestFlight review, while later builds for the same version may not.
See [Apple's external tester instructions](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers).

### 5. App Store review and public release

- Prepare the final app name, icon, subtitle, screenshots from the real build, description, support URL, age rating, distribution settings, and export-compliance answers.
- Publish the approved privacy policy and complete App Store privacy disclosures from an actual data/SDK inventory, including relevant providers and private media handling.
  Apple requires a public privacy-policy URL and disclosures covering the app and integrated third parties.
  See [App privacy details](https://developer.apple.com/app-store/app-privacy-details/).
- Provide reviewer access that works despite the campus-email restriction and current gate, with a reachable review contact and live backend.
  Design this explicitly; do not leak the owner key, embed a universal bypass, or require an Apple reviewer to own an Illinois email address.
- Check mission suitability and consent instructions for photographing other people.
  If public posts or member messaging are later added, assess their moderation/reporting/blocking requirements before enabling them.
  Current proof is private to the submitting member and authorized owner.
- Verify monitoring, email delivery, storage cleanup, backup/restore, and rollback procedures for the **current** member architecture.
  Do not restart the retired Gemini verification worker or cron.
- Resolve acceptance failures, obtain the owner's release decision, submit the tested build, and verify the actual store release before calling the app publicly launched.

Nuts currently represent an in-app earned balance.
No redemption, cash value, merchant reward, or charitable donation mechanism has been implemented; do not advertise one as available.

## Engineering recovery notes

1. Confirm the SSD is mounted and `pwd -P` resolves to `/Volumes/Crucial X10/Chambana` before project operations.
   `/Users/zphil0/Chambana` is only a compatibility symlink; never create an internal fallback.
2. Read `AGENTS.md` and the relevant installed Next.js guides in `node_modules/next/dist/docs/` before code edits.
   Current stack: Next.js 16.4.6, React 19, Node 24, Supabase.
3. Inspect `git status` and preserve unrelated untracked art, screenshots, `docs/research/`, and `ios-social-inspiration/`.
   Stage named files only; private `.env.local` stays ignored on the SSD.
4. Read [member implementation](member-missions.md), [catalog implementation](mission-library.md), and the current section of [hosting runbook](hostinger.md).
5. Remote migrations through `202611120012` were applied and recorded at the baseline.
   Migration 0010 is the mission library, 0011 is the member/proof/ledger flow, and 0012 is placement.
   Do not reapply old migrations, run catalog replacement, or reactivate legacy routes to resume work.
6. Keep `APP_URL=https://playchambana.com`, `CHAMBANA_EMAIL_OTP_ENABLED=true`, and `CHAMBANA_MISSION_LIBRARY_ENABLED=true` for the validated production flow, plus the existing preview gate and private Supabase/owner credentials.
   Resend's sending key belongs only in Supabase SMTP; it is not a Hostinger frontend variable.
7. For implementation changes, run `npm run check` with Node 24; on ExFAT use `TURBOPACK_FILESYSTEM_CACHE=false` if needed.
   Run targeted checks first, then the required full check and production dependency audit for a release.
   Documentation-only changes need link/content validation and `git diff --check`, not synthetic app tests.
8. `main` auto-deploys to Hostinger.
   Verify pushed SHA, CI, hosted deployment revision, and distinctive live behavior before claiming a new application release is live.
   A successful health response establishes liveness, not authenticated-flow readiness.
   Roll back application code/configuration to a verified compatible release if necessary; do not reset production data.

Start with `src/app/account/actions.ts`, `src/lib/member-auth.ts`, `src/lib/member-mission-store.ts`, `src/components/member-activity.tsx`, and migration 0011 for the account-lifecycle task.
The interface is composed in `src/components/ios-concepts.tsx` and `src/components/desktop-home-preview.tsx`.

## Decisions still needed

- Monitored support destination and owner-approved privacy/retention terms.
- Initial release treatment of Groups and whether desktop needs direct Play navigation.
- Native architecture, supported iOS/device range, and Apple team/signing ownership.
- Practical App Review access despite campus-only sign-in.
- Review cadence, beta cohort, success criteria, and eventual public-launch date.

Do not block repo inspection or implementation design on all of these at once.
Ask for each decision when it actually affects the next concrete change.
The current task only writes this handoff and compact checkpoint and pushes documentation to Git; launch implementation is the next task.
