# Stakeholder Handoff - Hockey Ops Player Directory (Sprint 1)

Audience: non-developer hockey operations lead

## What staff can do today

- Open the directory and see player/game content immediately (no loading spinner, no wait).
- Browse the full roster at `/players` with position and status filters to narrow the list.
- Open any player's detail page by a bookmarkable URL (for example, `/players/mcdavid-97` goes straight to Connor McDavid's page).
- Browse the game schedule at `/games` with the option to filter by team or date.
- Navigate between Home, Players, and Games using the persistent nav bar at the top of every page.
- Share or bookmark any page URL and it loads the same content when opened later or by someone else.

## Known limitations

- Player and game data is sample/seed data (16 players, 11 games), not connected to a live database yet.
- No staff login or access control - anyone with the URL can view the directory.
- No automated testing in place yet.
- The app runs locally only - it is not deployed to a public URL.
- Filters are basic: position and status for players, team and date for games.

## How to try it

1. Clone the repo from GitHub.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the local dev server.
4. Open `http://localhost:3000` in your browser.

Pages to check:
- `http://localhost:3000/` - Home page with directory summary
- `http://localhost:3000/players` - Full roster list
- `http://localhost:3000/players/mcdavid-97` - Example player detail page
- `http://localhost:3000/games` - Game schedule

## Recommended next sprint

1. **Connect to Supabase** for live roster and game data so staff see real, up-to-date information.
2. **Add Supabase Auth** for staff login so only authorized users can access the directory.
3. **Add TanStack Query** for data fetching and caching to keep the UI responsive as data grows.
4. **Write Vitest unit tests and Playwright browser tests** to catch regressions before they reach staff.
5. **Deploy to Vercel** for a public production URL staff can access from any device on arena wifi.
