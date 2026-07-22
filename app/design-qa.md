# MaarifOS Akış Pusulası — Design QA

- Source visual truth: `design/reference-akis-pusulasi.png`
- Source pixels: 853 × 1856
- App-owned device screen: 393 × 852 CSS px
- Capture density: 1
- State: Günüm ana ekranı, iPhone preset, klavye kapalı
- Final implementation: `output/playwright/implementation-home-final-v4.png`
- Attendance state: `output/playwright/implementation-attendance-v3.png`
- Observation state: `output/playwright/implementation-observation-v3.png`
- Account and data security state: `output/playwright/implementation-security-v2.png`

## Full-view comparison evidence

The source and the final 393 × 852 browser rendering were inspected together in one visual comparison input. The implementation preserves the selected Akış Pusulası direction: white canvas, navy hierarchy, teal current-state path, apricot next-action emphasis, vertical day flow, circular quick-observation action, and five-item bottom navigation.

The protected mobile runtime contributes the iPhone status area and device chrome. The app content therefore begins below the system safe area; the remaining final timeline item is available by vertical scrolling. This is an intentional runtime adaptation rather than a crop or inaccessible-content defect.

## Focused region comparison evidence

- Header identity: brand, teacher identity, class name, avatar crop, greeting, date, and sun cue are clear and balanced.
- Attendance: current-state icon, 08:30 chip, primary CTA, and all four attendance summary values remain visible on one line.
- Timeline: current, upcoming, and later states retain distinct color and icon treatment; continuation remains scrollable above the fixed navigation.
- Quick observation: the floating action remains clear of the primary attendance CTA and opens the correct sheet.
- Bottom navigation: safe-area placement, active state, center add action, and all five labels are visible.
- Sheets: attendance rows and observation form preserve readable labels, large targets, and fixed primary actions with the simulated keyboard open.
- Account and data security: the new sheet reuses the source palette and type hierarchy; local-first status, official Google brand asset, optional-account disclosure, backup, and restore controls remain readable without overflow at 393 × 852.

## Findings resolved

- [P1] Observation save initially required a second pointer action because textarea blur changed the simulated keyboard inset before click completion. Removed the app-level blur dismissal; save now completes on the first action and closes the sheet.
- [P2] Excessive vertical rhythm hid too much of the day flow. Tightened welcome, current-event, later-event, CTA, and metadata spacing while preserving target sizes.
- [P2] Attendance summary wrapped the absent count to a second line. Reduced inter-item spacing and normalized summary typography so all values remain on one line at 393 px.
- [P1] The first V4 capture inherited prior interaction data and no longer represented the reference state. Isolated the final capture in a fresh browser context; the corrected screenshot again shows 12 present, 1 late, 5 absent, and no saved observations.

No actionable P0, P1, or P2 visual issues remain.

## Interaction and runtime evidence

- Device-screen bounding box: 393 × 852 CSS px at density 1.
- Attendance: open sheet → Ada Yalın `Geldi` to `Geç` → complete attendance → sheet closes.
- Observation: open sheet → enter raw observation → save once → sheet closes → daily count becomes 1.
- Persistence reset and clean-state recapture: passed.
- IndexedDB persistence across reload: passed.
- Versioned backup download, SHA-256 self-verification, automatic pre-restore safety backup, and replace restore: passed.
- Corrupted backup rejection without data mutation: passed.
- Google action remains disabled while production OAuth/BFF readiness is unavailable: passed.
- Browser console errors: 0.
- Browser page errors: 0.
- Protected mobile runtime integrity: passed for 28 protected files.
- Production TypeScript/Vite build: passed.
- Sites packaging tests: 4 passed, 0 failed.
- Authentication state/contract tests: 14 passed, 0 failed.
- Legacy UUID/relation migration tests: 2 passed, 0 failed.
- Full Playwright suite: 15 passed, 0 failed.

## Comparison history

1. V1 exposed a persistent simulated pointer in screenshots, excessive timeline spacing, and the one-tap observation-save defect.
2. V2 hid the pointer, fixed one-tap save, added source-aligned sun/attendance cues, and compressed the timeline.
3. V3 kept the attendance summary on one line and produced the final source-aligned capture with successful interactions and zero browser errors.
4. V4 added the account/data-security sheet, found and corrected capture-state contamination, and verified the final clean-state home plus the new sheet with zero browser errors.

final result: passed
