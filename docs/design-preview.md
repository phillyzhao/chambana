# Waitlist and iPhone design review — October 12, 2026

The homepage is a minimal monochrome waitlist with an ambient photographic backdrop, a letter-by-letter cascade reading **Bringing Chambana together.**, and an inline email form. Motion is CSS-only and respects reduced-motion preferences; screen readers get one complete heading. Email validation is server-side, and submissions use a separate private table rather than creating auth accounts.

The owner's local repository remains `/Volumes/Crucial X10/Chambana`; `/Users/zphil0/Chambana` resolves there. Start only with the SSD mounted, using Node 24 and `npm run dev`. The public background is a locally sized JPEG served directly (`unoptimized`) because Next's image disk cache can read ExFAT AppleDouble metadata as image bytes. No third-party image requests occur when using the pages.

## Review routes

- `/`: waitlist.
- `/design-preview`: Chambana app and interactive signup flow, behind a shared access-code gate.
- `/design-preview?view=desktop`: desktop Home and navigation review using the same access gate. The iPhone preview remains the default.
- `/design-preview?view=desktop&screen=missions`: desktop Missions review, with the same access gate and shared local activity as Home.
- `/design-preview?view=desktop&screen=groups`: desktop Groups review, with search, category/membership filters, and shared local group membership.
- `/login`: the same access-code gate, followed by the existing campus sign-in.
- Older concept query strings now resolve to Chambana; After Hours and Field Notes have been retired.

## Desktop Home review — October 27, 2026

The desktop preview adapts the iPhone typography, grayscale campus photography, and floating glass navigation into a wider Home layout. It includes the featured mission, upcoming activity, a compact group summary, profile and notification panels, and local join/save controls. Home, Missions, and Groups are now reviewable; Inbox identifies that desktop page as future design work. All activity is sample data and resets on reload; the existing member backend and public homepage are unchanged by this design pass. The review date uses America/Chicago. Desktop and iPhone previews link to each other on desktop.

Implementation is isolated in `desktop-home-preview.tsx` and its CSS module. See `design-qa.md` for the completed local browser comparisons, responsive checks, interactions, and validation. The owner authorized release through the existing `main` auto-deployment. The hosted review URL is `https://playchambana.com/design-preview?view=desktop`; confirm the desktop Home content after deployment propagation before reporting the release live.

## Desktop Missions review — October 27, 2026

Missions uses a searchable list of the same three sample activities, with grayscale photography, serif titles, location, time, duration, occupancy, rewards, bookmarks, and mission detail panels. Search matches title, category, or place without case sensitivity. Saved and Joined can be selected together and include either matching set; All clears those selections. Search further narrows the selected set. Empty results explain how to recover.

Home and Missions share saved/joined activity during the current visit. Navigation, the brand link, and browser Back preserve that activity; reload resets it. Removing the last visible saved/joined item keeps keyboard focus on a stable page control. The Main Library card uses a verified exterior photograph with attribution and license links in the detail panel and asset credits.

The direct review URL is `https://playchambana.com/design-preview?view=desktop&screen=missions`, retained after the access gate. Unknown or repeated screen parameters fall back to Home. The default iPhone route, production flag, noindex metadata, and signed-cookie gate are retained. Implementation lives in `desktop-missions.tsx`, its CSS module, and the shared desktop shell. Local validation passed 153 application tests, TypeScript, production build, responsive/browser interaction checks, and independent code review. Screenshots and comparisons are in `design/desktop-missions-2026-10-27/`; the latest report is at the top of `design-qa.md`.

## Desktop Groups review — October 27, 2026

Groups adapts the iPhone group cards into a three-column desktop grid, two columns on compact screens, and one column at narrow widths. It retains the same group names, interests, initials tiles, Joined status, and next-mission hierarchy. Search matches name/category without case sensitivity. Outdoors, Social, and Arts combine with OR; Joined additionally restricts those results to current memberships. All clears the selections.

Each card opens a group detail panel with a live member count, named roster, linked next mission, and local join/leave control. Base rosters exclude Julian Park; joining adds him once. Initial membership is The in-between club. Home's Your groups list and the profile count/list share this state; browser navigation preserves it, while reload resets the preview. No membership or messages are written to the backend. Next-mission labels use the same desktop mission records so list and detail stay consistent.

The review URL is `https://playchambana.com/design-preview?view=desktop&screen=groups`, preserved through unlock. The iPhone route, production flag, noindex, and cookie gate remain intact. Local validation passed 176 app tests (including 29 route cases and 12 group-filter cases), TypeScript, production build, independent review, and browser checks at 1440/855/393/320px. The iPhone Groups screenshot is byte-identical before/after this work. Evidence is in `design/desktop-groups-2026-10-27/`; the latest QA report is at the top of `design-qa.md`.

## iPhone preview

Chambana keeps its editorial type and generous space, top-left profile, top-right notifications, and four floating glass tabs: Home, Missions, Groups, Inbox. Decorative taglines and card descriptions have been removed; useful labels, location, time, membership, and message content remain. Mission rewards and profile balances use nuts. Groups support search, category, and membership filters.

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

## Validation after the iOS preview revision

- 195 automated tests pass (124 application, 71 database), including invalid access codes, forged/expired cookies, safe destinations, and direct sign-in protection.
- Production build, TypeScript, and whitespace checks pass.
- Browser-checked gate rejection and shared unlock, all signup steps and back navigation, profile handoff with zero nuts, group search/category/membership combinations and reset, mission joining, and four-tab navigation.
- Checked 320px and 393px responsive widths with no horizontal overflow; measured desktop iPhone 17 at 402 × 874 logical pixels with uniform scaling. Screenshots include `commons-refined-desktop.jpg`, `commons-refined-iphone.jpg`, `commons-groups-iphone.jpg`, and the two `commons-signup-*` images.

## iOS interaction revision — October 13, 2026

The demo now uses Chambana throughout. The home line is “Let’s go explore.”; Missions, Groups, and Inbox begin directly with their controls or content. Welcome photography starts at Japan House and cycles through State Farm Center, Busey-Evans, and Ikenberry with a 7.5-second interval and 1.8-second monochrome crossfade. The rotation pauses when the welcome is hidden, honors reduced motion, and offers a pause button. Photo provenance and licenses are linked from the welcome screen and recorded in `public/design-assets/CREDITS.md`. State Farm uses a venue exterior; Ikenberry uses its library interior.

All detail and filter popups slide from the bottom and occupy two-thirds of the logical phone screen, including scaled desktop previews. The backdrop is confined to the phone, background controls become inert, and Escape, close, backdrop dismissal, focus trapping, and focus restoration work. Filters have a single entry button on Missions and Groups. Multiple specific choices can be selected; All clears every specific selection. Group interests combine with OR, with Joined restricting those results to memberships. Saved and Joined mission selections include either matching set.

Conversations open as a full phone page with a fixed composer and a separate member-list page. Back returns to Inbox; locally sent messages persist between conversations until reload. Demo group counts match the named sample rosters.

Validation: all 124 application tests, TypeScript, production build, and whitespace checks pass. Browser checks covered desktop and 393px/320px layouts, exact two-thirds sheet geometry, keyboard containment and return focus, filter combinations/All/reset/results, full-page chats, members, local message persistence, and welcome photo rotation. This revision is released through the existing GitHub `main` auto-deployment to `https://playchambana.com/design-preview`; the shared preview access gate remains in place.
