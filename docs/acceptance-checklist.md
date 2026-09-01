# Integration Pass - Acceptance Checklist

Source of truth: `docs/requirements-brief.md`
Sprint: 1 (seed data, SSR, validated params)
Date: 2026-08-31

## Checks

| # | Check | URL tested | Pass/Fail | Evidence / Notes |
|---|-------|-----------|-----------|------------------|
| 1 | Home loads with directory content (player count, game count) | `/` | Pass | Page source shows "16 players" and "11 games" in the first HTML response |
| 2 | Players list shows seed data with names, numbers, positions | `/players` | Pass | View Source contains all 16 player names (McDavid, Crosby, MacKinnon, etc.) as rendered HTML list items |
| 3 | Player detail is bookmarkable (paste URL in new tab, same player loads) | `/players/mcdavid-97` | Pass | Opening the URL directly renders Connor McDavid #97, Forward, EDM - no prior navigation needed |
| 4 | Games index shows seed games with dates, opponents, status | `/games` | Pass | All 11 games visible in first HTML with opponent abbreviation, date, venue, and status |
| 5 | Nav reaches Home, Players, Games from every page without broken links | all pages | Pass | AppNav component renders on every route via root layout; type-safe Links prevent broken paths |
| 6 | Invalid player ID shows not-found state, not a crash | `/players/not-a-real-id` | Pass | NotFoundPlayer component renders "Player not found" message with link back to directory |
| 7 | Position filter works and persists on refresh | `/players?position=F&status=active` | Pass | Only forwards shown; refreshing the page keeps the same filter applied via validated search params |
| 8 | Search params with bad values fall back to defaults | `/players?position=banana` | Pass | Invalid position ignored, page shows all players (default = position "all", status "active") |
| 9 | First HTML contains real content (View Source shows player names, not empty shell) | `/players` | Pass | curl response body includes player names, numbers, and positions as server-rendered HTML |
| 10 | Player detail first HTML contains player data server-rendered | `/players/mcdavid-97` | Pass | View Source shows "Connor McDavid", "#97", "Forward", "EDM" in the raw HTML before any JS runs |

## Regressions found

None.

## Items deferred to next sprint

- Connect to Supabase for live roster and game data
- Add Supabase Auth for staff login and role-based access
- Automated tests (Vitest unit tests, Playwright browser tests)
- Deploy to Vercel for a public production URL
- Full-text search and pagination (not needed at current data size)
