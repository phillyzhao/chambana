# Chambana

Chambana is a gated Urbana–Champaign challenge app with verified member accounts, private photo/video proof, owner review, and earned nuts.
The separate legacy group-challenge beta was retired on October 28, 2026.
A native iOS build and App Store release are still upcoming.

Start with the [compact handoff](handoff.md) and [iOS launch plan](docs/ios-launch-handoff.md).
These describe the November 12 baseline, launch gaps, and the next engineering task.

## Current website

- `/` — public waitlist; Member sign in opens `/app`.
- `/app` — real iPhone-layout account and participation flow.
- `/app?view=desktop` — real desktop account and participation flow.
- `/mission-admin` — protected owner catalog editor, scheduling, placement, and approval.
- `/mission-admin/submissions` — protected owner proof-review queue.
- `/design-preview` and `/design-preview?view=desktop` — interactive design demos with sample data.

The real app retains the signed access-code gate.
Members verify an `@illinois.edu` address with a numeric code, create a profile, submit required private media, and earn nuts only after owner approval.
Accounts, submissions, review decisions, and balances are shared across layouts.
Inbox and notifications display submission activity; member messaging is not implemented, and Groups is a placeholder.
Bookmarks remain local UI state.

The mobile bottom navigation contains Home, Missions, Play, Groups, and Inbox.
Play has three challenges: Moonwalk past Alma, Everybody jump, and Backwards high-five.
Missions has the other 22, with no overlap.
Desktop retains four header tabs (Home, Missions, Groups, Inbox) and profile access; it has no dedicated Play navigation button yet.

Old beta routes redirect to the previews; their auth/actions, avatar endpoint, automatic verification, and email worker remain retired.
The new member flow uses `/account/callback`, not the retired `/auth/callback`.
Legacy database/storage contents have not been deleted.
`/api/health` reports application liveness, not authenticated-flow readiness.

## Local development and checks

Use only `/Volumes/Crucial X10/Chambana` on the mounted Crucial X10 SSD; `/Users/zphil0/Chambana` is a compatibility symlink. Keep `.env.local` on the SSD and out of Git. Use Node 24 or newer.

```sh
npm run dev
npm run check
```

On the SSD, use `TURBOPACK_FILESYSTEM_CACHE=false` if ExFAT metadata interferes with caching.
Use the current sections of [hosting configuration](docs/hostinger.md) and [member configuration](docs/member-missions.md) for the real account flow, alongside the established preview gate.
Remote migrations through `202611120012` were applied at the November 12 release.
Do not rerun legacy setup, catalog replacement, or verification/import scripts to resume current work.

GitHub `main` auto-deploys to [playchambana.com](https://playchambana.com). Verify actual content after deployment propagation; a successful build alone does not establish that the hosted revision is live.

## Design and archive

- [Current preview documentation](docs/design-preview.md)
- [Design review evidence](design-qa.md)
- [Legacy beta archive and restore reference](docs/legacy-beta-archive.md)

The source archive contains no private environment files, user uploads, or database backup. Existing backend libraries, migrations, and isolated tests remain available for future product work; they do not restore the retired routes or actions.

## Shared mission library

The `/mission-admin` page adds, edits, schedules, and explicitly approves a shared Supabase catalog for the real app and both design previews. It uses a separate private owner key, never the public preview code. Delivery requires `CHAMBANA_MISSION_LIBRARY_ENABLED=true`; only approved, unarchived missions in their saved availability window appear. The 25 Urbana–Champaign starter missions are stored in the separate `mission_library` table. They do not change legacy missions or assignments. The owner approved releasing the current 25 on November 4, 2026.

See [setup, approval, scheduling, and placement](docs/mission-library.md) and [the original starter mission review](docs/mission-library-seed-review.md).
The owner-edited database catalog is the live content source; a historical seed review does not override later edits.
Migrations 0010–0012 provide the current library/member/placement flow and are already applied remotely.
