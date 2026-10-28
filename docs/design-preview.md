# Waitlist, desktop, and iPhone design review

## Current website — October 28, 2026

The waitlist remains the public homepage. **Member sign in** now opens desktop Home through the existing preview access gate; **iOS preview** opens the iPhone concept. The former campus-auth beta is retired. Old page URLs redirect to the corresponding desktop view, and its authentication, avatar, and scheduled verification handlers no longer perform backend work. The desktop and iPhone experiences remain interactive previews with sample data, not a completed account-backed MVP.

The beta source is preserved in a verified SSD archive and the Git tag `archive/legacy-beta-2026-10-28`. See [the archive and recovery record](legacy-beta-archive.md). The historical design-validation sections below describe their releases at the dates shown.

The homepage is a minimal monochrome waitlist with an ambient photographic backdrop, a letter-by-letter cascade reading **Bringing Chambana together.**, and an inline email form. Motion is CSS-only and respects reduced-motion preferences; screen readers get one complete heading. Email validation is server-side, and submissions use a separate private table rather than creating auth accounts.

The owner's local repository remains `/Volumes/Crucial X10/Chambana`; `/Users/zphil0/Chambana` resolves there. Start only with the SSD mounted, using Node 24 and `npm run dev`. The public background is a locally sized JPEG served directly (`unoptimized`) because Next's image disk cache can read ExFAT AppleDouble metadata as image bytes. No third-party image requests occur when using the pages.

## Review routes

- `/`: waitlist.
- `/design-preview`: Chambana app and interactive signup flow, behind a shared access-code gate.
- `/design-preview?view=desktop`: desktop Home and navigation review using the same access gate. The iPhone preview remains the default.
- `/design-preview?view=desktop&screen=missions`: desktop Missions review, with the same access gate and shared local activity as Home.
- `/design-preview?view=desktop&screen=groups`: desktop Groups review, with search, category/membership filters, and shared local group membership.
- `/design-preview?view=desktop&screen=inbox`: desktop Inbox, with searchable conversations, unread filtering, member lists, and local drafts/messages.
- `/design-preview?view=desktop&screen=profile`: desktop Profile, with the sample identity, current joined groups, and Saved/Joined missions.
- `/login`: redirects to desktop Home; no campus sign-in page remains.
- Old `/missions`, `/groups`, and `/profile` URLs, including descendants, redirect to their corresponding desktop views and discard old query parameters. Other former beta pages redirect to desktop Home.
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

## Desktop Inbox review — October 28, 2026

Inbox keeps the monochrome type, initials tiles, and quiet navigation of the iPhone concept. Desktop uses a conversation list beside the selected thread; at 760px and below, the list and thread become separate views with Back controls. All and Unread are mutually exclusive. Search matches group names, current member names, or the latest message, and combines with Unread. Opening a thread marks it read while keeping that thread visible even if its row leaves the filtered list. Empty states provide a direct reset.

The three conversations use the same sample groups and messages as iOS. Member lists derive from the desktop's current group memberships. Joining from Inbox updates Groups and the profile; leaving a group removes the composer until rejoining. Drafts and sent messages are stored per conversation in the shared desktop shell, survive page navigation and browser Back, and reset on reload. Enter sends, Shift+Enter inserts a line break, and IME composition does not submit. Blank messages are blocked; messages are limited to 1,000 characters and wrap without horizontal overflow. The interface identifies messages as local preview activity.

The direct review URL is `https://playchambana.com/design-preview?view=desktop&screen=inbox`, preserved through the signed access gate. Duplicate or invalid screen values still fall back to Home. The iPhone source and the retired beta entry points are unchanged. Implementation is in `desktop-inbox.tsx`, its CSS module, the shared desktop shell, and `desktop-inbox.ts`. Evidence is in `design/desktop-inbox-2026-10-28/`; see the latest entry in `design-qa.md`.

## Desktop Profile review — October 28, 2026

The header avatar opens a full Profile page using the same monochrome typography, initials tiles, and quiet spacing as the other desktop pages. Home, Missions, Groups, and Inbox remain the four main navigation tabs. The sample identity is read-only: Julian Park, `@julianpark`, 340 nuts, six completed missions, and Outdoors, Books, and Coffee interests.

Your groups reflects current local memberships and opens the shared group detail panel. Saved and Joined mission views show the same mission activity used by Home and Missions, with counts, detail links, and empty states that lead back to browsing. Changes to memberships and saved/joined missions persist across desktop navigation and browser Back, then reset on reload. The nuts balance and completed-mission count are sample identity values, not calculated rewards or a live account history.

The direct review URL is `https://playchambana.com/design-preview?view=desktop&screen=profile`, preserved through the existing signed access gate. Invalid or repeated screen values still fall back to Home. Retired `/profile` URLs and descendants now redirect with `303` to this fixed desktop Profile destination, discarding old path identifiers and query parameters. The former profile backend remains retired; this page does not edit an account or write member activity. Implementation is in `desktop-profile.tsx`, its CSS module, and the shared desktop shell.

## iPhone preview

Chambana keeps its editorial type and generous space, top-left profile, top-right notifications, and four floating glass tabs: Home, Missions, Groups, Inbox. Decorative taglines and card descriptions have been removed; useful labels, location, time, membership, and message content remain. Mission rewards and profile balances use nuts. Groups support search, category, and membership filters.

Dialogs, notification-read state, mission save/join, group membership, conversations, and signup are local demo interactions. They reset when the preview is reloaded. Signup uses focused steps for name, campus email, demo verification, username, and interests. No emails, messages, reservations, accounts, or nuts are written to the live service. Sample activity is anchored to Monday, October 12, 2026.

Desktop review uses fixed logical phone screens: iPhone 15/16 at 393 × 852, iPhone 17 at 402 × 874. The narrow layout fits the current browser viewport instead of stretching a narrow frame to an unrelated fixed height. These are browser prototypes, not native-device screenshots or a claim of physical-size calibration on the reviewer's monitor.

The preview route is noindex and unavailable in production unless `CHAMBANA_DESIGN_PREVIEW=true`. The waitlist's iOS preview link appears in development or when that flag is enabled. The former community routes have been retired; no active page renders `CommunityLayout`.

The desktop and iPhone previews share server-validated access code `0010110`. Unlocking stores a signed, HttpOnly, SameSite=Lax cookie for seven days (Secure in production). Unlock destinations are limited to the iPhone preview and desktop Home, Missions, Groups, Inbox, and Profile. This is a preview entry gate; it does not create or authenticate member accounts. `PREVIEW_ACCESS_SECRET` must be at least 32 characters in the deployment environment; missing configuration fails closed. The private secret is configured in Hostinger and the ignored SSD `.env.local` file; its value is never committed.

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
