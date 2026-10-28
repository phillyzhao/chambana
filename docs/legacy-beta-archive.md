# Legacy beta archive — October 28, 2026

The owner requested that the older beta be saved and removed from the website. The waitlist stays, while Member sign in leads to desktop Home and the iOS preview remains available separately.

## Restorable source snapshot

- Source commit: `40bed0d9f1694f270d0761615a8fc0665c5eba2b`.
- Annotated Git tag: `archive/legacy-beta-2026-10-28`.
- SSD archive: `/Volumes/Crucial X10/Chambana/archives/legacy-beta-2026-10-28/chambana-source-40bed0d.tar.gz`.
- SHA-256: `95fb93991b63320a284953474d0b5525aebaeb315328a96b782b053116a5fd3b`.
- `manifest.json` and `SHA256SUMS` sit beside the archive. Creation and a read-back checksum were verified before retirement edits.

The snapshot was generated from the committed Git tree, including the complete beta source, its tests, migrations, original README, and the desktop/iOS work available at that checkpoint. It excludes ignored/untracked files, private environment files, dependencies, user uploads, and database contents; the tracked `.env.example` is included. Database/storage records were left intact. This is a source archive, not a backup of production data.

`archives/` is ignored by Git and excluded from TypeScript compilation. It is outside `src` and `public`; archive files must never be exposed as web routes or downloads. The Git tag provides a second recoverable copy in the repository history.

For inspection, use `git show archive/legacy-beta-2026-10-28:src/app/login/page.tsx` or `git archive archive/legacy-beta-2026-10-28` after verifying the SSD mount. Any extraction must remain in the ignored SSD archive directory, away from active `src/app` and `public`. Restoring the beta into the active website or redeploying that tag requires a separate owner instruction.

## Website retirement

| Old entry point                                                          | Current behavior                                                |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `/login`, `/people/*`, `/leaderboard`, `/admin`, `/about`, `/guidelines` | Desktop Home                                                    |
| `/missions/*`                                                            | Desktop Missions                                                |
| `/groups/*`, `/join/*`                                                   | Desktop Groups                                                  |
| `/profile`, `/profile/*`                                                 | Desktop Profile (`/design-preview?view=desktop&screen=profile`) |
| `/auth/callback`                                                         | Fixed desktop redirect; no code exchange or new session         |
| Legacy `signIn`, `signOut`, `mutate` server actions                      | Fixed desktop redirect; no backend call                         |
| `/api/avatars/*`, `/api/cron/verify`                                     | Inert `410 Gone`; no data/storage/verification/email operation  |
| `/api/health`                                                            | Current application liveness                                    |

Retired links discard query values such as auth codes, invitations, errors, user IDs, and return destinations. POST redirects use `303` so a previous beta form body is not replayed to the preview. The shared preview gate, signed cookie, and production flag remain required. The active route tree contains no beta page/layout implementations; the fallback only redirects known legacy paths and returns not-found for unknown ones.

Historical backend operation scripts and documentation refer to the retired application. They are not part of the current deployment workflow. The old verification URL now returns `410`; any external schedule pointing there performs no work and may log that retirement response.
