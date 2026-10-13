# Waitlist and Commons restore point

Created at the owner's request on October 13, 2026, before committing the waitlist and iOS design work.

## Preserved version

- Previous `main` commit: `6436b19be6751e0264c0e479af91e5111e4f3fea` — Update mission timers, group filters, copy, and camera proof.
- Backup branch: `codex/backup-before-waitlist-20261013`.
- Annotated backup tag: `backup-before-waitlist-20261013`.
- Both backup refs were pushed to `origin` before the design commit.
- New design branch: `codex/chambana-waitlist-ios`.

This restore point preserves the previous Git source tree. It is not a database or hosting-environment backup. Before publishing, Hostinger confirmed that the active deployment used `6436b19b`, matching this restore point. Private environment files remain on the SSD and outside Git.

## Restore after a later release

The design work starts at `c3db5797ae99e9a6770024c898ea25a05b54f2d7`, followed by production configuration documentation and the production preview link. Release these together in a merge commit titled **Release waitlist and Commons preview**. To undo the release on shared `main`, locate that merge with `git log --merges --oneline`, then use `git revert -m 1 <release-merge-sha>`. Review any conflicts, run `npm run check`, and push the revert. This preserves the new design in history while restoring the previous website. The previous version can also be selected in Hostinger by its full commit above. Verify the deployment and live homepage afterward.

Use the saved tag to inspect the exact prior source:

```sh
git fetch origin --tags
git show backup-before-waitlist-20261013:src/app/page.tsx
```

Prefer a revert commit for shared history. Do not delete the backup refs. Rewriting or deleting published history is a separate action to review with the owner if explicitly requested later.

The waitlist migration is now applied. Retain its private table and any collected addresses when rolling back. Reverting website code does not require dropping or resetting the database. Leave migrations 001–008 and existing member data intact. If a code revert removes the migration file, restore that file from the release commit so local migration history continues to match production.

## Production setup completed October 13, 2026

- Applied only `supabase/migrations/202610120009_waitlist.sql` to the linked production Supabase project `donwucdijtmkvpjovtcw`.
- Verified RLS and grants, then tested inserts, deduplication, and email constraints in a rolled-back transaction.
- Configured a private `PREVIEW_ACCESS_SECRET` on Hostinger; without it, the shared code gate stays closed.
- Enabled `CHAMBANA_DESIGN_PREVIEW=true`, which exposes the code-gated prototype and its homepage link.
- The signup mock remains local to the preview: it does not create real accounts or send verification emails.
- Hostinger auto-deploys `main`; the previous deployment remains available in its deployment history.

The pre-existing `design/brand-concepts/` and `docs/research/` files belong to earlier work and are not part of this design commit.
