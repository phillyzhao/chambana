# Shared mission library

## Release authorization

On November 4, 2026, the owner explicitly approved publishing all 25 current missions to the MVP. That authorization supersedes the private-review restriction below for this release. It does not approve future edits or additional missions; edits still revoke approval. Deployment status and verification are recorded under Validation.

## Initial private review

- The admin runs locally at `/mission-admin` and persists its catalog in the configured Supabase project.
- The separate `mission_library` table contains 25 starter missions, five per category, in Urbana or Champaign. All begin unapproved and unscheduled.
- `CHAMBANA_MISSION_LIBRARY_ENABLED=false` keeps library delivery out of the MVP. The existing design previews keep their sample missions while this switch is off.
- No website deployment is part of the initial review. Never enable delivery or approve missions on the owner's behalf without their explicit approval.
- The October 28 content revision removes written responses and requires a photo or video for every starter mission. This is catalog copy; media uploads and completion verification remain outside the editorial library.
- The [mission review sheet](mission-library-seed-review.md) contains the drafted activities and official local source links. Location sources were checked on October 28, 2026; recheck availability before approving a dated event or time-sensitive venue activity.

## Setup

Use the mounted SSD repository and Node 24. Private configuration belongs in `.env.local` on the SSD, outside Git:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=<configured Supabase project>
SUPABASE_SERVICE_ROLE_KEY=<private server credential>
MISSION_ADMIN_SECRET=<random private owner key of at least 32 characters>
CHAMBANA_MISSION_LIBRARY_ENABLED=false
```

The current local owner key is also in the ignored `.env.mission-admin-access` file for the owner to retrieve. Do not share it or put it in screenshots, code, URLs, or deployment logs. The preview access code cannot unlock mission administration.

Apply `supabase/migrations/202610280010_mission_library.sql` once to the intended Supabase project. It creates only the new catalog, publication policy, index, and update trigger; it does not restore the beta. The current configured project has this migration applied and recorded in migration history. Do not re-run the old migration/import scripts.

Start the review server:

```sh
TURBOPACK_FILESYSTEM_CACHE=false npm run dev -- --port 3017 --hostname 127.0.0.1
```

Open `http://127.0.0.1:3017/mission-admin`, enter the owner key, and use **Import 25 starter drafts** once. It is safe to repeat: existing records, edits, approvals, and schedules are preserved. A terminal alternative is `npm run missions:seed-drafts`; it uses the same validation and draft-only import behavior. Do not use the legacy `missions:import` or `missions:replace` scripts for this library.

## Editing and approval

For quick renaming, edit a title directly in the catalog list. Enter or Tab saves it and moves to the next title; clicking away also saves. Escape cancels an unsaved title. Each row reports saving, saved, or an error. Invalid names remain in the field, including across category/search changes. If another window changed the mission, review the current saved name before choosing **Save my name**, or choose **Discard**. Names use the same 4–120 character validation as the full editor.

Inline renaming updates only the title and clears approval. It preserves all other content, schedules, and archive state. List order remains stable after saving. The compact list uses the full page width. **Details** opens an editor panel only when needed; close it with the close button or Escape. Closing preserves unfinished detail edits until you reopen that challenge. Unsaved detail edits protect that mission from inline renaming until they are saved, and switching to another challenge asks before discarding them. Delivery stays disabled throughout this review.

1. Choose a mission or select **Add mission**. Enter the category, instructions, local place/city, duration, cost, group size, reward, completion prompt, and a source link.
2. Optionally set start and end times. Inputs always mean **America/Chicago**, regardless of the browser's timezone. Nonexistent and ambiguous daylight-saving times are rejected. Empty start means available after approval; empty end means no expiry.
3. **Save draft**. Saving any edit removes previous approval, even if the mission was already live. A database trigger also removes approval when content or schedule changes directly in Supabase.
4. Review the saved version, check the explicit approval checkbox, and choose **Approve for MVP**. Scheduling alone never approves a mission. An unsaved edit disables the approval control.
5. The owner must separately authorize enabling `CHAMBANA_MISSION_LIBRARY_ENABLED=true` on the intended host. With delivery enabled, only approved, unarchived missions inside their start/end window are shown. No cron job is needed: both experiences use the same server query at read time.

Archive removes approval and hides a mission. Restore saves an unapproved draft. Concurrent changes are protected with a revision number; stale saves/approvals ask you to refresh rather than overwriting another edit.

## Boundaries

The library is an editorial system. It does not create reservations, record real participation, verify completion, or award nuts. Preview saves remain local interaction state and reset on reload. Group and messaging features are still previews.

Anonymous and regular authenticated Supabase clients can read only approved, currently available catalog records. They cannot insert, edit, approve, or archive. Every admin page read and mutation requires the separate signed owner session. Its cookie is HttpOnly, SameSite Strict, expires after eight hours, and is Secure in production. Rotate the private owner key to revoke existing sessions.

The seed file is loaded only by the protected importer; it is not imported into client code. The public route never falls back to draft content if Supabase fails or the approved catalog is empty.

## Validation

`npm run check` covers TypeScript, application tests, database tests, and production build. Tests cover authorization, separate preview/admin cookies, approval confirmation, draft and schedule visibility, content edits revoking approval, Chicago daylight-saving boundaries, optimistic concurrency, and repeat-safe import. The build trace explicitly includes the starter file for the admin importer.

October 28, 2026 verification: TypeScript, 423 tests, and production build passed. The admin build trace includes the starter JSON; client chunks contain neither the private owner key nor starter mission text. The configured Supabase project has exactly 25 records, five per category, zero approvals, zero schedules, and zero records visible through the anonymous API. Repeating the import inserted zero records and preserved the catalog.

Browser checks covered owner login, import, searching/selecting drafts, rejected DST dates retaining edits, a valid Central-time schedule roundtrip, and restoration to the original unscheduled draft. A temporary owner-only local fixture verified desktop saves through Groups/Profile navigation, opening the correct mission detail from Profile, and iPhone saves/details. That fixture was removed and never written to Supabase. The iPhone detail sheet measured 568px in an 852px viewport, and the 393px admin had no horizontal overflow. Review screenshots are saved locally in `test-results/mission-library/` (ignored by Git).

October 31 inline-title verification: TypeScript, 447 tests, and production build passed. Browser checks covered consecutive Enter/Tab renames, click-away saving, stable order, invalid-name retention across filters, Escape cancellation, unsaved detail protection, and a real two-window revision conflict with explicit recovery. The 393px layout has no horizontal overflow. Temporary test names were restored; all 25 records match their pre-test content, except for expected revision/update timestamps. The final Supabase check found zero approvals, zero schedules, zero anonymous-visible records, and delivery disabled. No website deployment was performed.

October 31 compact-layout verification: TypeScript, 447 tests, and production build passed. The full-width desktop list uses 58px idle rows, with the details dialog hidden initially. Browser checks covered opening and closing details, Escape, focus restoration, retaining unfinished detail edits, and Enter navigation between titles. The 393px layout has no horizontal overflow; its details panel fills the viewport and prevents background scrolling. No mission content was saved during these layout checks. The final read-only Supabase check confirmed 25 drafts, zero approvals, zero schedules, zero anonymous-visible records, and delivery disabled.
