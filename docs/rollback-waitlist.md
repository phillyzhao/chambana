# Waitlist and Commons restore point

Created at the owner's request on October 13, 2026, before committing the waitlist and iOS design work.

## Preserved version

- Previous `main` commit: `6436b19be6751e0264c0e479af91e5111e4f3fea` — Update mission timers, group filters, copy, and camera proof.
- Backup branch: `codex/backup-before-waitlist-20261013`.
- Annotated backup tag: `backup-before-waitlist-20261013`.
- Both backup refs were pushed to `origin` before the design commit.
- New design branch: `codex/chambana-waitlist-ios`.

This restore point preserves the previous Git source tree. It is not a database or hosting-environment backup. The design task has not changed production database records or hosting configuration. Private environment files remain on the SSD and outside Git.

## Restore after a later release

The design work is one commit titled **Add ambient waitlist and gated Commons iOS preview**. To undo a release, revert the corresponding design or squash commit on the deployment branch, review any conflicts, run `npm run check`, and push the revert. The previous version can also be selected in Hostinger by its full commit above. Verify the deployment and live homepage afterward.

Use the saved tag to inspect the exact prior source:

```sh
git fetch origin --tags
git show backup-before-waitlist-20261013:src/app/page.tsx
```

Prefer a revert commit for shared history. Do not delete the backup refs. Rewriting or deleting published history is a separate action to review with the owner if explicitly requested later.

If the waitlist migration is applied before rollback, retain its private table and collected addresses. Reverting website code does not require dropping or resetting the database. Leave migrations 001–008 and existing member data intact.

## Before publishing this design

- Apply only `supabase/migrations/202610120009_waitlist.sql` to the intended existing Supabase project.
- Configure a private `PREVIEW_ACCESS_SECRET` of at least 32 characters on Hostinger; without it, the shared code gate stays closed.
- Set `CHAMBANA_DESIGN_PREVIEW=true` only when the gated prototype should be available on that host. The homepage concept link currently appears only in development.
- Keep the signup mock local to the preview: it does not create real accounts or send verification emails.
- Hostinger's recorded configuration auto-deploys `main`; the design branch can be reviewed before merging it there.

The pre-existing `design/brand-concepts/` and `docs/research/` files belong to earlier work and are not part of this design commit.
