# Anime calendar interface

Current theme: see [sakura/README.md](sakura/README.md) and [sakura/concept.png](sakura/concept.png). The original dark direction below is retained as project history.

Reference: concept.png, generated with the built-in Image Gen tool.

- Page background #10121a; panels #1a1e2b; borders #303547; text #f0f0f7; secondary #a8afc4; lavender #b6a2ff.
- Native system UI font with Thai fallbacks, 16px body, 40px heading, 24px day heading, 14px card titles, 13px metadata.
- 1280px centered content, 32px desktop gutters, 16px mobile gutters. 8px spacing scale, 10px corner radius.
- Header: wordmark, calendar/upcoming navigation, Bangkok timezone. No sidebar or marketing section.
- Calendar: seven consecutive days starting today, search and format filters, date headings, four compact horizontal poster-and-details cards per row. Actual row counts and text follow the live API. Day navigation scrolls to the corresponding section so all seven days remain accessible without JS.
- Upcoming: same shell, next calendar season, six portrait-poster columns, exact/partial/unknown release dates displayed honestly.
- Mobile: 2-column day strip with horizontal scrolling, single schedule column, 2-column upcoming grid. Controls at least 44px, clear focus outlines, reduced-motion support.
- Clicking a title opens an accessible native dialog with synopsis and source link, with direct AniList navigation available without JavaScript.
- Generated sample anime and dates are visual examples, never application seed data. The upcoming inset is a separate route, never an overlay on the calendar.

## Verification

Compared the generated concept and current IAB screenshots using view_image at their native sizes. Desktop 1280 × 720, mobile 390 × 844. Inspected header and active navigation, heading hierarchy and exact primary copy, seven-day navigation, search/filter toolbar, compact poster/time/episode cards, and the separate six-column upcoming page. No material layout mismatch remained in the tested viewports.

Primary copy matches the concept: “วันนี้ ดูเรื่องไหนดี?”, “ตารางอนิเมะประจำสัปดาห์ อัปเดตตามเวลาไทย”, “กลับมาวันนี้”, “ค้นหาอนิเมะ...”, “ทุกประเภท”, “ซีซั่นหน้า มีอะไรดู?”. Intentional adaptations: actual AniList titles and dates, all seven date sections rather than one selected-day section, visible filter for future episodes, partial-date labels, four schedule columns at desktop and one on mobile, six upcoming columns at desktop and two on mobile. The upcoming inset in the concept is implemented as /upcoming.

Browser interactions checked: calendar → search Sasaki → one result → native detail dialog → close; future-only filter removes past episodes; TV filter updates the list/count and URL; absent search displays empty states; next-day link changes the hash and scrolls to the correct section; navigation to Upcoming displays WINTER 2027. IAB console logs returned no relevant errors or warnings. No Playwright fallback was required.

Initial upcoming screenshot showed unloaded fifth/sixth posters. The initial upcoming row now loads six posters eagerly, with remaining posters lazy. Both desktop and mobile layouts were inspected after this change. Eleven automated tests cover Bangkok midnight and month/year transitions, next-season selection, pagination, incomplete-sync protection, refresh coalescing and cooldown, stale-cache preservation, no historical output, partial dates, and safe HTML/JSON/URL handling.

## Streaming platforms update

Cards now display independent outbound platform-icon links; availability/language notes appear only in the detail dialog. Disabled, social, and unsafe links are excluded. Unknown SUB/DUB availability is omitted; source notes are shown verbatim, preserving restrictions and negation. The original SQLite snapshots automatically refresh to include externalLinks.

At the user's request, platform marks use the corresponding brand colors and have no surrounding background or border, on both cards and in details. Brand silhouettes are unmodified AniList PNGs served locally, with CSS masks applying AniList's supplied brand colors. Current known platforms are mapped explicitly, with provenance in public/platform-icons/SOURCES.md. Detail rows also have no boxes. Default desktop and 390px mobile layouts were inspected, including actual source SUB notes, no-platform state, icon outbound navigation, and the existing detail interaction. Eighteen tests pass; IAB logs showed no relevant errors or warnings.
