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
