# Chambana

The active website is a monochrome waitlist plus the desktop experience and iOS preview. The separate legacy mobile web beta was archived and retired on October 28, 2026.

## Current website

- `/` — waitlist. Member sign in opens the desktop Home experience.
- `/design-preview?view=desktop` — desktop Home.
- `/design-preview?view=desktop&screen=missions` — desktop Missions.
- `/design-preview?view=desktop&screen=groups` — desktop Groups.
- `/design-preview` — iOS preview.

The desktop and iOS versions use the existing signed access-code gate and production preview flag. These are interactive design previews with sample activity; joining, saving, and conversations do not write member activity to the backend. The waitlist is the current data-collecting feature. Desktop Inbox remains a later design pass.

Old beta links redirect to the corresponding desktop screen and discard old query parameters. The old campus sign-in, member actions, avatar-serving endpoint, and verification/email worker no longer operate through the website. Database and storage contents have not been deleted. `/api/health` reports application liveness, not legacy database readiness.

## Local development and checks

Use only `/Volumes/Crucial X10/Chambana` on the mounted Crucial X10 SSD; `/Users/zphil0/Chambana` is a compatibility symlink. Keep `.env.local` on the SSD and out of Git. Use Node 24 or newer.

```sh
npm run dev
npm run check
```

On the SSD, use `TURBOPACK_FILESYSTEM_CACHE=false` if ExFAT metadata interferes with caching. Current production requirements include the waitlist database configuration, `PREVIEW_ACCESS_SECRET`, and `CHAMBANA_DESIGN_PREVIEW=true`. Historical campus-auth, Gemini, SMTP, cron, and beta-acceptance instructions are retained in the archived snapshot, not requirements for these previews. Do not re-run old setup/migrations or verification/import scripts as part of this website release.

GitHub `main` auto-deploys to [playchambana.com](https://playchambana.com). Verify actual content after deployment propagation; a successful build alone does not establish that the hosted revision is live.

## Design and archive

- [Current preview documentation](docs/design-preview.md)
- [Design review evidence](design-qa.md)
- [Legacy beta archive and restore reference](docs/legacy-beta-archive.md)

The source archive contains no private environment files, user uploads, or database backup. Existing backend libraries, migrations, and isolated tests remain available for future product work; they do not restore the retired routes or actions.
