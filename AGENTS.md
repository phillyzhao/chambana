# Workspace location — owner instruction

All local Chambana work must use `/Volumes/Crucial X10/Chambana` on the mounted Crucial X10 SSD. Before reading, editing, installing, testing, committing, or pushing project files, confirm the repository's physical path resolves there and the external volume is mounted. `/Users/zphil0/Chambana` is only a compatibility symlink to that SSD folder, not a second checkout.

If the SSD is unavailable, stop and ask the owner to reconnect it. Do not create, restore, or use an internal-drive fallback checkout or worktree. Keep private environment files on the SSD and out of Git. This local workspace rule does not change GitHub CI or Hostinger deployment paths.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
