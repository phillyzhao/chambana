# Scoped security review — 2026-09-21

Code/permissions review with automated checks, not an independent penetration test or a guarantee of production security.

## Findings addressed

| Finding | Change | Verification |
| --- | --- | --- |
| Photo cannot prove timing/participation | Manual-review snapshots and SQL guard; four temporary missions manual-only | Database regression test |
| Concurrent count-limit bypass | Per-account transaction locks before group locks for submission/join/create/report/invite RPCs | SQL tests; hosted role flow; load testing remains |
| CPU spent decoding unauthorized uploads | Reserve authorized submission first; actual format, animation and pixel checks | Image tests/code review |
| Unnecessary anonymous definer helpers | Separate anon/authenticated catalog policies; revoke anonymous helper execution | Migration 004, hosted public catalog test, advisor rerun |
| Wrong OAuth provider/host-derived redirects | Azure email scope, feature flag, canonical APP_URL, safe next path | Auth/path tests, local callback confirmed; production callback 500 remains open |
| Missing application rate limits | Service-only fixed-window counters with HMAC subjects | SQL tests; no raw emails in counters |
| Incomplete/blocked AI output could be parsed | Reject non-STOP/blocked responses | Mocked regression tests |
| Scheduler unaware of worker failures | Cron returns 503; bounded batch and safe events | Auth/success/error cron tests |

## Hosted evidence

Rollback-only SQL checks passed after migration 004: organizer approval, group creation/join, slots, cross-group/user RLS, protected RPCs, duplicate settlement, group/player scores, private bucket. Fixture accounts and scores did not persist.

Live Storage tests passed service upload/download and anonymous denial, then removed only generated white-square fixtures. Seven published catalog rows were visible anonymously. These do not cover every authenticated Storage role or simultaneous browser upload.

Supabase advisors after migration 004 reported no ERROR findings. Remaining WARN findings: intentionally authenticated SECURITY DEFINER entrypoints and disabled leaked-password protection. Definer functions must enforce their own authorization; retain role tests and re-review after changes. Email links/Microsoft are the app login paths, but the password warning remains unresolved and should be reviewed before offering any password flow.

## Remaining risks / launch gates

- Another-user campus consent, personal-account rejection and production callbacks still require testing. Do not loosen tenant scope to bypass restrictions.
- Google 2.5 was unavailable for the configured project. Flash 3.6 passed only synthetic API-contract cases across runs, but also returned 503/429 before targeted retries. No real photo recognition, supervision/oversight, safety moderation, or representative-photo evaluation has been performed; quota and cost controls remain necessary.
- Production Microsoft login still returns HTTP 500 after the real authorization code reaches `/auth/callback`. Hostinger logs show repeated Supabase SSR invalid chunked-cookie JSON warnings. Commit `9bde9cb` attempts to make the callback the sole Supabase cookie writer, but production verification is still required.
- App counters do not protect the hosting edge, email provider or every direct Supabase endpoint. Configure Auth limits/SMTP and edge controls.
- No full concurrency/load test, external penetration test or production mobile upload test performed.
- Retention, account deletion, orphan cleanup, support policy, broad suspension/takedown, backups/restore and incident ownership need operational completion. A proof_deleted_at column is not a deletion service.
- Hostinger body/time limits, DNS/HTTPS, production secrets, scheduling and monitoring need real-environment verification.

Keep .env.local ignored and inspect staged diffs before commits.

Final local validation: 82 tests in 10 files, TypeScript and production build passed. HTTP smoke checks: health 200/no-store, authenticated empty-queue cron 200, unauthenticated cron 401. The authenticated browser admin page displayed all seven published temporary challenges.
