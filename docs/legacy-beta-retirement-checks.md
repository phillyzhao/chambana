# Beta retirement verification — October 28, 2026

The public waitlist is retained. Member sign in opens desktop Home; the iOS preview remains separately available. The beta's source was archived before its routes and active backend handlers were retired. See [the archive record](legacy-beta-archive.md).

## Local release checks

- `npm run check` passed: TypeScript, 243 application tests, 71 isolated database tests, and the production build.
- Production builds passed both with the preview flag disabled and with `CHAMBANA_DESIGN_PREVIEW=true`. The disabled configuration keeps previews inaccessible.
- The build route list contains only the waitlist, design preview, legacy redirect fallback, inert beta handlers, and health endpoint. No old beta page/layout remains.
- 35 HTTP cases passed against the built app: GET/POST redirects for retired routes, dropped legacy query values, no new auth cookies, no-store/no-referrer headers, inert avatar/verification endpoints, liveness, waitlist links, anonymous access gates, and unknown-route not-found UI with noindex. Next.js may stream the not-found UI with HTTP 200 after headers have been sent.
- Browser checks confirmed the waitlist's Member sign in link reaches desktop Home, a fresh visitor can unlock directly into desktop Home, and the iPhone link shares that access and opens the existing iOS concept.
- Independent read-only review found no active page importing legacy UI, no retired handler performing backend work, and no archive/private environment file exposed by the website.
- Archive contents, SHA-256, ignored location, and recovery-tag target were independently verified. No production data was changed or deleted.

The desktop and iOS pages still use sample activity; this change does not make account, membership, messaging, or mission data persistent. Hosted content and redirects must be verified after the main-branch deployment propagates.
