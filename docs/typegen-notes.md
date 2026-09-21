# Typegen notes

## Migration applied

- File: `supabase/migrations/001_scouting_schema.sql`
- Applied via: Supabase dashboard SQL editor (pasted full migration, ran successfully)

## Typegen command

```bash
npx supabase gen types typescript --project-id <PROJECT_REF> > src/types/database.ts
```

Replace `<PROJECT_REF>` with the Supabase project reference ID from the dashboard URL or project settings.

- Output path: `src/types/database.ts`

## What to verify after generation

- `Database['public']['Tables']` includes `players`, `games`, and `scouting_events`
- Column names are snake_case and match the migration exactly
- `scouting_events` shows `player_id` and `game_id` foreign key relationships
- Row types have correct nullability (e.g. `position: string | null`, `full_name: string`)

## When to regenerate

Regenerate `src/types/database.ts` any time:

- A new migration is applied (schema changes, new columns, renamed fields)
- An RPC function is added or modified (step 8 will add a per-player aggregate RPC)
- Table or column constraints change

Run the same typegen command above and commit the updated file.
