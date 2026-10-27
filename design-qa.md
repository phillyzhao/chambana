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
