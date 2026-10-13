# Waitlist and iPhone design review — October 12, 2026

The homepage is a minimal monochrome waitlist with an ambient photographic backdrop, a letter-by-letter cascade reading **Bringing Chambana together.**, and an inline email form. Motion is CSS-only and respects reduced-motion preferences; screen readers get one complete heading. Email validation is server-side, and submissions use a separate private table rather than creating auth accounts.

The owner's local repository remains `/Volumes/Crucial X10/Chambana`; `/Users/zphil0/Chambana` resolves there. Start only with the SSD mounted, using Node 24 and `npm run dev`. The public background is a locally sized JPEG served directly (`unoptimized`) because Next's image disk cache can read ExFAT AppleDouble metadata as image bytes. No third-party image requests occur when using the pages.

## Review routes

- `/`: waitlist.
- `/design-preview`: The Commons app and interactive signup flow, behind a shared access-code gate.
- `/login`: the same access-code gate, followed by the existing campus sign-in.
- Older concept query strings now resolve to The Commons; After Hours and Field Notes have been retired.

The Commons keeps its editorial type and generous space, top-left profile, top-right notifications, and four floating glass tabs: Home, Missions, Groups, Inbox. Decorative taglines and card descriptions have been removed; useful labels, location, time, membership, and message content remain. Mission rewards and profile balances use nuts. Groups support search, category, and membership filters.

Dialogs, notification-read state, mission save/join, group membership, conversations, and signup are local demo interactions. They reset when the preview is reloaded. Signup uses focused steps for name, campus email, demo verification, username, and interests. No emails, messages, reservations, accounts, or nuts are written to the live service. Sample activity is anchored to Monday, October 12, 2026.

Desktop review uses fixed logical phone screens: iPhone 15/16 at 393 × 852, iPhone 17 at 402 × 874. The narrow layout fits the current browser viewport instead of stretching a narrow frame to an unrelated fixed height. These are browser prototypes, not native-device screenshots or a claim of physical-size calibration on the reviewer's monitor.

The preview route is noindex and unavailable in production unless `CHAMBANA_DESIGN_PREVIEW=true`. The waitlist's concept-preview link appears in development or when that flag is enabled. Existing community routes retain their prior header, navigation, and authentication through `CommunityLayout`.

The preview and member sign-in share server-validated access code `0010110`. Unlocking stores a signed, HttpOnly, SameSite=Lax cookie for seven days (Secure in production). The campus sign-in action also verifies that cookie. This is a preview entry gate; it does not replace account authentication. `PREVIEW_ACCESS_SECRET` must be at least 32 characters in the deployment environment; missing configuration fails closed. The private secret is configured in Hostinger and the ignored SSD `.env.local` file; its value is never committed.

## Production configuration — October 13, 2026

The owner authorized publishing to `main`. Migration `202610120009_waitlist.sql` was applied to the linked `Backend_Chambana` project (`donwucdijtmkvpjovtcw`) after a dry-run confirmed it was the only pending migration. The private table has RLS enabled, denies anonymous/authenticated table access, and grants service-role insert/select. Production SQL checks confirmed these permissions and exercised insertion, deduplication, and campus-email constraints inside a rolled-back transaction. No test addresses were retained. Migrations 001–008 were not replayed.

Hostinger is configured with `PREVIEW_ACCESS_SECRET` and `CHAMBANA_DESIGN_PREVIEW=true`. Its GitHub integration auto-deploys `main` on Node 24. The waitlist action validates Illinois emails, normalizes and deduplicates them, rate-limits submissions, and reports storage failure honestly. It does not send confirmation or invitation emails. See [the restore point and rollback guide](rollback-waitlist.md).

## References

Device layout: [Apple Human Interface Guidelines — Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [iPhone 15 specifications](https://support.apple.com/en-us/111831), [iPhone 16 specifications](https://support.apple.com/en-us/121029), and [iPhone 17 specifications](https://www.apple.com/iphone-17/specs/). The 1179 × 2556 and 1206 × 2622 pixel screens map to the logical preview dimensions at 3× scale.

Signup patterns: [Snapchat's account creation guide](https://help.snapchat.com/hc/en-us/articles/7012333136788-How-to-Create-a-Snapchat-Account) and [Partiful's login](https://partiful.com/login). The mock adapts single-purpose contact/profile steps and code verification to Chambana's campus-email context; it does not reproduce their branding or create accounts with those services.

Reviewed actual images from `/Users/zphil0/Downloads/ios-social-inspiration`: Orbit's floating navigation and people/plans, Nomad's clear discovery-to-plan flow, Foliana's community hierarchy, and Momento's prominent people photography. Colorful gradients, dense badges, and competing calls to action were omitted. The available source folder contains four concept collections; its manifest also lists collections absent from the folder.

Photography credits are in `public/design-assets/CREDITS.md`. Review screenshots are in `design/ios-preview-2026-10-12/`.

## Validation after the Commons revision

- 195 automated tests pass (124 application, 71 database), including invalid access codes, forged/expired cookies, safe destinations, and direct sign-in protection.
- Production build, TypeScript, and whitespace checks pass.
- Browser-checked gate rejection and shared unlock, all signup steps and back navigation, profile handoff with zero nuts, group search/category/membership combinations and reset, mission joining, and four-tab navigation.
- Checked 320px and 393px responsive widths with no horizontal overflow; measured desktop iPhone 17 at 402 × 874 logical pixels with uniform scaling. Screenshots include `commons-refined-desktop.jpg`, `commons-refined-iphone.jpg`, `commons-groups-iphone.jpg`, and the two `commons-signup-*` images.
