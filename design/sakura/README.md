# Sakura nature theme

Generated through Codex CLI 0.163.0 using its native image-generation tool. The CLI completed successfully and produced both background-source.png and concept.png at 1536×1024. The exact instruction is saved in [cli-prompt.txt](cli-prompt.txt); the visual reference is [concept.png](concept.png). No API key or Python/SDK image-generation fallback was used.

## Shipping background

public/sakura-background.webp: 1280×854, 59,478 bytes (58.1 KiB). Original PNG: 2,298,514 bytes. Conversion used the installed cwebp CLI:

```
cwebp -quiet -q 48 -resize 1280 0 -m 6 -metadata none design/sakura/background-source.png -o public/sakura-background.webp
```

Only the WebP is served to visitors. The URL includes a content-version query and the image is cached for one day. No runtime image generation, external font, parallax effect, or image-processing dependency is introduced.

## Design system

- Forest ink #244742, muted leaf text #607a78, sakura accent #a64e6c, active-day blush #f9dfe8, sky #dcecf5, stream blue #4d8794.
- Frosted white panels over a static spring landscape; compact borderless original-brand platform marks with 2px gaps and 24px desktop/26px mobile targets.
- Keep the existing schedule-first structure, four desktop schedule columns, one mobile column, and a separate Upcoming page.
- Live green #287a4c; aired/started orange #b96324; future gray #68787d. Text labels accompany the colors.
- Static green glow for live episodes, static sakura glow for all episodes tied for the next airing time in current search/filter results. No pulsing animation.

## Time semantics

Live starts exactly at the scheduled start and ends after the duration supplied by AniList. This is an estimate from the original broadcast schedule. If duration is unknown, the label is “เริ่มฉายแล้ว”; it is not represented as currently live. Past dates are still excluded from the calendar. Both HTML and browser use public/airing.js; client status and highlights refresh each minute and when filters change.

## Verification

22 automated tests pass, including exact start/end boundaries, missing-duration handling, tied next times, filtered next selection, existing timezone and cache behavior, safe platform links, and source-only SUB/DUB notes. Tested in IAB at 1280px desktop and 390px mobile. Search updates the count and next highlight; detail dialogs and Upcoming remain functional. Console checks show no relevant app errors or warnings.

A temporary server-rendered fixture on port 3001 used the real cached titles with a simulated clock to visually inspect green live and pink next glows. It did not change production data or the production clock and was stopped after inspection.

Compared concept.png and final screenshots using view_image: header/navigation, heading/copy, seven-day strip, search/filter toolbar, poster-and-metadata cards, status colors, and background framing. The app preserves its existing compact poster dimensions, actual API titles/dates, explicit episode type labels, original brand glyphs, and all seven sections. These are intentional data/layout adaptations to the generated visual concept; no unrelated controls were added.
