# SSR Verification Notes

## What SSR means here

TanStack Start renders every route on the server before sending HTML to the browser. The `loader` function on each route runs server-side, fetches data, and the component renders with that data already present in the initial HTML response. The client then hydrates the page and takes over interactivity.

## Verification checklist

### Home route (`/`)

- [ ] View page source shows player count and game count as plain text in the HTML (not injected by JavaScript after load)
- [ ] Numbers match the seed data (16 players, 11 games at time of writing)
- [ ] Page renders without JavaScript enabled (counts visible in raw HTML)

### Players index (`/players`)

- [ ] View page source shows full player list as HTML `<li>` elements
- [ ] Player names, numbers, positions, and teams appear in the raw HTML
- [ ] Filtering by position via query string (e.g., `/players?position=D`) returns only matching players in the HTML source
- [ ] Each player name is a link to `/players/<id>`

### Player detail (`/players/mcdavid-97`)

- [ ] View page source shows player name, number, position, and team in the HTML
- [ ] Visiting an invalid id (e.g., `/players/nobody-99`) shows the not-found component in the raw HTML
- [ ] Back link to `/players` is present in the HTML

### Games index (`/games`)

- [ ] View page source shows game rows (opponent, date, venue, status) in the HTML
- [ ] Team filter via query string (e.g., `/games?team=EDM`) narrows results in the HTML source

## How to verify

1. Run `npm run dev` to start the dev server.
2. Open any route in the browser.
3. Right-click and choose "View Page Source" (not Inspect Element, which shows the live DOM after hydration).
4. Search for data content (player names, game dates) in the raw HTML. If it appears, SSR is working.
5. Alternatively, use `curl http://localhost:3000/players` and check that the response body contains player data.

## Why loaders run server-side

In TanStack Start, a route's `loader` function is a server function created with `createServerFn`. When a request comes in, the server executes the loader, passes the result to the component, and renders the full HTML. This means:

- The seed data module (`src/data/hockeySeed.ts`) and loader module (`src/server/directoryLoader.ts`) are only imported on the server.
- The client receives pre-rendered HTML with all data already embedded.
- No loading spinners or skeleton states needed on first paint.

## What to watch for

- If a route shows "Loading..." or empty content in the page source, the loader is not wired up correctly.
- If data appears in Inspect Element but not in View Page Source, the data is being fetched client-side after hydration rather than server-rendered.
- The `createServerFn` call must use `'use server'` semantics (handled by TanStack Start's plugin) to ensure server-only execution.
