# Desktop Inbox design review — October 28, 2026

final result: passed

## Scope and reference

Inbox extends the approved desktop shell and existing iPhone conversation list. The current member entry and waitlist remain in place. Review URL: `https://playchambana.com/design-preview?view=desktop&screen=inbox`. All messages and membership changes remain sample interactions local to the preview.

## Design and responsive behavior

- Retains Georgia headings, monochrome initials tiles, #f8f8f8 page background, white surfaces, quiet borders, and the existing floating navigation. No new image assets or color accents.
- Desktop shows searchable conversations beside a thread; at 760px and below, Back controls switch between the list and conversation. Members use a separate view within the conversation pane.
- Captured the final production build at 1440px, 855px, 393px, and 320px. Document scrollWidth matched viewport width. A 1,000-character unbroken message also wrapped within the 320px thread without horizontal overflow.
- Active secondary text uses #6d6d6d for improved contrast; disabled send styling stays muted.
- Evidence: `design/desktop-inbox-2026-10-28/desktop-inbox.png`, `compact-desktop-855.png`, `phone-thread-393.png`, `phone-list-320.png`; source reference: `ios-inbox-reference.png`.

## Interaction and verification

- Checked search, clear/reset, All/Unread, no-match and all-read states. Opening the last unread thread removes its row while preserving the thread and moving focus into it; narrow Back restores focus to a row or search.
- Checked thread switching, member rosters, joining from Inbox, shared Groups counts, leaving from Groups, and Groups → Open conversation. Leaving disables replies while retaining the local message history.
- Checked per-thread draft retention, Enter sending, Shift+Enter newline, blank-message rejection, character limit, message wrapping, and state preservation across desktop Home/Inbox and browser Back. IME guards were code-reviewed. Reload restores the sample state.
- The fresh production-build browser had no console errors or warnings. A transient development hot-refresh warning while an effect dependency list changed was resolved before final verification.
- A fresh browser origin unlocked directly into Inbox through the access-code form. Anonymous HTML retained the Inbox destination and noindex; retired `/login` still redirected to desktop Home. Default iOS and production-flag behavior remain covered by route tests.
- 274 application tests and 71 isolated database tests passed (345 total), along with TypeScript, production build, whitespace checks, and independent code review. The final contrast-only revision was rebuilt successfully.
- iOS components, waitlist, proxy, and retired beta handlers have no source changes in this release. No backend messaging or account integration is claimed.

## Prior review snapshots

Reports below describe earlier releases. Desktop Home, Missions, Groups, and Inbox are now implemented. Hosted deployment verification follows the commit and push.

---

# Desktop Groups design review — October 27, 2026

final result: passed

## Source and final comparison

Groups extends the approved desktop Home/Missions style and current iPhone group cards. Review: http://localhost:3001/design-preview?view=desktop&screen=groups. All membership changes are sample interactions local to the preview.

- Source: design/desktop-groups-2026-10-27/ios-groups-reference.png (393 × 852), plus approved desktop Home and Missions captures in their dated design folders.
- Final: design/desktop-groups-2026-10-27/desktop-groups.png (1440 × 1000), all groups visible, initial membership in The in-between club, no open panel.
- Full comparison: comparison.png (1873 × 1000), source iPhone left and desktop right. Focused comparison: focused-comparison.png (759 × 320), unscaled first-card crops. Both boards were opened together and reviewed.
- The browser reports devicePixelRatio 2; captured images are normalized to one pixel per CSS pixel. Comparison boards use original pixels without resampling.

## Fidelity and intentional desktop changes

- Georgia page/card headings, system sans controls, #f8f8f8 background, #252525 ink, light borders, white cards, and the existing glass navigation remain consistent with Home/Missions.
- The original group name/category/status/next-activity hierarchy is retained. Initials use the iPhone rounded-square tiles. Category labels and member/status text remain quiet; no new imagery or accent colors.
- Three columns replace the phone stack. The heading and pill-shaped search match the approved desktop Missions page. Timing and location occupy separate rows for readability. Next-mission titles now use the same desktop mission record as the linked detail, avoiding inconsistent labels.
- Captured 855px two-column, 393px one-column, and 320px layouts: compact-desktop.png, phone-width.png, narrow-320.png. Document scrollWidth equals innerWidth at all three widths. narrow-filters.png confirms all five choices and the submit action fit at 320 × 852.

## Interaction and verification

- Cards open details; join/leave updates badges, counts, named rosters, Home group list, and profile count/list. Initial counts are 5/3/4 including the viewer only in the first group. Evidence: joined-group.png and members.png.
- Group → members → Back to group and group → next mission work. Panel transitions focus Close; Escape restores the original card. Shift+Tab wraps from Close to the last control; card Tab order follows the grid.
- Outdoors + Arts returns two groups; adding Joined narrows to one; All clears every specific filter. Query search trims whitespace and ignores case. Empty search recovery and last-membership removal under Joined filtering were checked. Evidence: filters.png and empty-joined.png.
- Leaving the final matching group removes the card and restores focus to the page heading on close. Home and browser Back preserve membership state; reload resets to sample defaults.
- Independent code review found no blocking issues. No outstanding P0/P1/P2 findings or required P3 polish remain for this review scope.
- 176 application tests passed, including 29 access/route cases and 12 group-filter cases. TypeScript, production build, and whitespace checks passed. Fresh-tab console had no warnings/errors; transient missing-module messages during parallel implementation were resolved before final QA.
- Production flag, noindex, signed-cookie gate, supported scalar Groups/Missions deep links, and iPhone defaults are retained. The final iPhone Groups capture (ios-groups-regression.png) is byte-identical to the source capture.

## Prior review snapshots

Earlier reports below describe their versions at the time. Groups is now implemented; Inbox remains future desktop work. Deployment verification follows commit/push separately.

---

# Desktop Missions design review — October 27, 2026

final result: passed

## Scope and reference

Desktop Missions extends the approved Home design and the existing iPhone Missions page. Local review: http://localhost:3001/design-preview?view=desktop&screen=missions. Activity is sample data, with no backend writes.

- Source: design/desktop-missions-2026-10-27/ios-missions-reference.png (393 × 852) and approved design/desktop-home-2026-10-27/desktop-home.png (1440 × 1000).
- Final: design/desktop-missions-2026-10-27/desktop-missions.png (1440 × 1000), initial state, all three missions, no saved/joined activity.
- Full comparison: comparison.png (1873 × 1000), iPhone at left and desktop at right. Focused comparison: focused-comparison.png (1060 × 480), approved Home versus Missions navigation/type and the mission row hierarchy.
- Both boards were opened together and reviewed; the focused board was corrected and re-reviewed so the complete heading is visible. Images are unscaled crops/composites. In-app browser returns one raster pixel per CSS pixel despite reporting devicePixelRatio 2.

## Fidelity assessment

- Typography: shared Georgia display/brand and system sans labels; 58px desktop page heading, 32px row titles, tight tracking, small uppercase metadata.
- Layout: the iPhone list hierarchy is preserved in wider horizontal rows. The existing desktop top navigation, header controls, content width, spacing rhythm, fine dividers, white cards, and lightly rounded corners remain consistent with Home. Search, duration, and an explicit View mission action are intentional desktop additions.
- Color: existing neutral #f8f8f8 surface, #252525 ink, gray secondary text/borders, grayscale photos, and glass navigation. No new accent colors.
- Assets: existing Japan House and cafe images retained. Main Library now has its own verified exterior photo, with author/source/license and crop/grayscale attribution. All three images load correctly. Lucide icons match the shared shell.
- Copy: original mission names, categories, places, rewards, and capacities retained; relative times follow the existing desktop sample data. The preview footer and details disclose sample/local behavior. Groups and Inbox remain explicitly scoped future pages.
- Responsive: screenshots compact-desktop.png (855 × 1000), phone-width.png (393 × 852), narrow-320.png (320 × 852), and narrow-filters.png. Measured document width equals viewport at 855, 393, and 320. Narrow cards stack with legible titles and accessible actions; no overflow or clipped filter controls.

## Behavior, repairs, and validation

- Case-insensitive location search and empty-search recovery verified. Search combines with selected filters; utility tests cover matching, ordering, immutability, and Saved/Joined union semantics.
- Browser verified Saved, Joined, both selected (two distinct matching items), All clearing both, reset, count updates, and empty Saved/Joined states. Evidence: filters.png and empty-saved.png.
- Join/leave updates occupancy and joined badge; Home reflects the same state. Saved activity persists through Home/Missions and the brand link. Browser Back restores the page without resetting local activity. Reload deliberately resets the preview.
- Mission detail photo/title/actions work. Evidence: joined-mission.png. Library attribution links are visible and reachable.
- Native modal background inertness, scroll lock, Escape, Close, focus restoration, and first/last keyboard wrapping verified. Removing a filtered row restores focus to search or the page heading rather than a removed control.
- Fixed the search accessible name by separating its label from Clear search. Retest with a nonempty query confirms its name remains Search missions.
- Independent read-only review identified a brand-link full reload that cleared local state; ordinary clicks now use the same navigation as Home. Retest confirmed saved activity survives the logo round trip; modifier clicks retain link behavior.
- Final browser console had no warnings or errors. The unchanged default iPhone Home and Missions routes were checked at 393 × 852; ios-missions-regression.png matches the source layout.
- 153 application tests passed, including 18 route/access cases and 11 filter cases. TypeScript and production build passed; whitespace checks passed. Production flag, signed-cookie gate, noindex, direct Missions unlock destination, and iPhone default preserved.
- No actionable P0/P1/P2 findings remain for this preview scope. No P3 polish is required before review. Live deployment verification follows the commit/push separately.

## Earlier Home review

The report below records the earlier Home-only snapshot. Its future-page and missing-library-photo notes describe that historical version; the Missions review above supersedes those points.

---

# Desktop Home design review — October 27, 2026

final result: passed

## Scope and source

Desktop Home and navigation, adapted from the existing Chambana iPhone design. This is a local, gated design preview with sample activity, not a connected member experience. Review URL: `http://localhost:3001/design-preview?view=desktop`.

- Source visual truth: `design/desktop-home-2026-10-27/ios-reference-desktop-viewport.png` (original iPhone preview at a 1440 × 1000 browser viewport), plus `ios-phone-regression.png` (existing phone layout at 393 × 852).
- Final implementation screenshot: `design/desktop-home-2026-10-27/desktop-home.png` (1440 × 1000).
- Full-view comparison: `design/desktop-home-2026-10-27/comparison.png` (1873 × 1000), with the 393 × 852 phone capture at left and 1440 × 1000 desktop capture at right, at original pixel sizes.
- Focused comparison: `design/desktop-home-2026-10-27/focused-comparison.png` (960 × 590), using unscaled crops of the heading, navigation, and mission copy/actions.
- Browser: Codex in-app browser. Browser reports devicePixelRatio 2; returned screenshots are normalized to one raster pixel per CSS pixel. No additional resampling was used in the comparison boards.
- State: Home selected, no panel open, initial sample profile, no joined or saved missions in the final screenshot. The original date is fixed October 12; desktop uses the current Chicago date and is explicitly labeled sample activity.

This is an intentional desktop adaptation, not a pixel-for-pixel phone clone. The same Home content and visual language are evaluated; viewport-dependent layout and typography scale are expected to differ. The desktop uses a top navigation pill, a horizontal featured mission, a second upcoming mission, and a compact existing-group summary. The larger primary action is intentional. No new destination pages were designed.

## Required fidelity surfaces

- **Fonts and typography:** Georgia for brand and display headings; system sans for labels, facts, and controls. Serif weight, tight tracking, and restrained hierarchy match the reference. Desktop headings scale up without changing the typeface. Focused crops verify wrapping and clear separation of labels and titles.
- **Spacing and layout:** The original greeting → featured mission → upcoming activity hierarchy is preserved. Wider desktop grid, fine dividers, lightly rounded white card, and generous margins are intentional. Checked at 1440, 855, 393, and 320 CSS pixels. Final 320px document width equals viewport width; no horizontal overflow. Feature photograph stretches with the adjacent body.
- **Colors and tokens:** Screen #f8f8f8, ink #252525, borders #e0e0e0, white surfaces, and neutral secondary text preserve the monochrome treatment. Glass navigation uses a translucent neutral surface, subtle shadow, blur, and a gray selected pill.
- **Images and assets:** The same credited Japan House photo and cafe photo are reused. Grayscale, crop, location pill, and arrow affordance remain recognizable and sharp. The unverified library image/location pairing was removed from the third mission detail. Existing Lucide icons and initial-based avatars retain the reference style.
- **Copy and content:** “Let’s go explore.”, “Take the long way home.”, mission timing/reward, and “A little later” are retained. No discarded concept branding is reintroduced. Sample activity is labeled. Missions, Groups, and Inbox navigation opens a clear scope notice rather than representing unfinished desktop pages as complete.

## Comparison history and repairs

1. Initial desktop comparison: `desktop-home-v1.png` and `compact-desktop-v1.png`. No major style mismatch. Read-only review identified a potential fixed-image-height gap; the image now stretches to the grid row without changing the visible desktop composition.
2. [P2, fixed] Switching between open panels removed the focused control. Added panel-change scroll reset and focus on the stable Close button. Browser retest confirmed notifications → mission focuses Close and scrollTop is 0; Escape returns to the original page trigger.
3. [P2, fixed] Native dialog allowed Shift+Tab to leave the document focus sequence. Explicit first/last keyboard wrapping now keeps focus inside the dialog in both directions. Background content remains inert through native showModal().
4. [P2, fixed] The responsive hidden line break joined “long” and “way”. Added an explicit space; `desktop-at-phone-width-final.png` shows the corrected title.
5. [P2, fixed] At 320px the horizontal icon/label navigation caused a 6px overflow. Narrow navigation now stacks icons over labels. `desktop-at-320-final.png` and DOM measurements verify scrollWidth = innerWidth = 320. Home returns to the page top.
6. Final full and focused comparison boards were opened together and reviewed after repairs. No actionable P0/P1/P2 findings remain for this design-review scope.

## Interaction and technical checks

- Featured photo/title/View mission open details; join/leave updates counts and Home state.
- Save/unsave updates pressed state and the profile's saved-mission list; the empty state is available.
- Profile → mission and notifications → mission transitions work. Notifications can be marked read, and the badge updates.
- Home navigation, Missions/Groups/Inbox scope notices, return-to-Home buttons, and links between desktop and iPhone previews were exercised.
- Close, Escape, focus restoration, modal keyboard wrapping, and background scroll locking were verified. Reduced-motion styles remove transitions.
- Existing iPhone Home was visually checked at 393 × 852; the added desktop review link is outside its app screen.
- Browser console: no warnings or errors observed on the final desktop route.
- 132 application tests passed, including eight preview routing/access-control cases. TypeScript and production build passed. Production flag, signed-cookie gate, noindex metadata, and desktop return destination are preserved.

## Open questions and follow-up

The owner should review the desktop proportions and navigation placement before the next page is designed. The preview does not create accounts, send messages, or persist activity to the backend. This report records the completed local design QA; deployment verification and full MVP acceptance are separate checks. No remaining P3 polish is required for review.
