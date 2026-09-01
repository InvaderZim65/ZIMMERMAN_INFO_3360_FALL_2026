# Path Param Design Notes - Player Detail Route

## Route file path

`src/routes/players/$playerId.tsx`

The `$` prefix tells TanStack Router this segment is dynamic. Any value after `/players/` is captured as `playerId`.

## URL pattern

```
/players/:playerId
```

Examples:

- `/players/mcdavid-97` - Connor McDavid
- `/players/crosby-87` - Sidney Crosby
- `/players/makar-8` - Cale Makar

Each player gets a unique, bookmarkable URL that hockey ops staff can share or save.

## Param name

`playerId` - a string identifier for a single player. Matches the `id` field in the seed data. Kept as a plain string (not numeric) so IDs can include slugs, UUIDs, or any format the backend provides.

## Validation rules

Defined in `src/lib/playerParams.ts`:

1. Must be a string (rejects `undefined`, `null`, numbers, etc.)
2. Trimmed of whitespace
3. Must not be empty after trimming

The `params.parse` function on the route definition runs this validation automatically when TanStack Router resolves the URL. If validation fails, the route errors rather than rendering with bad data.

A matching `params.stringify` function converts the typed param back to a plain string for link generation.

## Linking approach

Links to player detail pages use TanStack Router's type-safe `<Link>` component:

```tsx
<Link to="/players/$playerId" params={{ playerId: player.id }}>
  {player.name}
</Link>
```

This approach gives compile-time checks that the param name matches the route definition. If the route param changes, TypeScript flags every broken link.

The helper `playerDetailPath()` in `playerParams.ts` provides a standalone URL builder for cases outside JSX (e.g., generating URLs in server functions or logs).

## Why bookmarkable per-player URLs matter for hockey ops

- Staff on arena wifi need to pull up a specific player quickly during games, trades, or roster moves.
- Bookmarkable URLs mean a coach can save a link to a player's page and return to it without navigating through the full roster every time.
- Shareable links let staff send a player page via Slack or email without explaining how to find it in the app.
- Each URL is self-contained -- it works in any browser tab, on any device, without session state.
