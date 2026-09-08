// src/lib/directory/mappers.ts
// Pure helpers for transforming raw directory rows into UI-ready shapes.
// No Supabase, no env vars, no network -- safe to import from test files.

/** Shape of a raw row returned by the Supabase directory query. */
export type DirectoryRow = {
  id: string
  full_name: string | null
  role: string | null
  team: string | null
  number: number | null
  is_active: boolean | null
}

/** UI-ready directory entry after mapping. */
export type DirectoryCard = {
  id: string
  displayName: string
  role: string
  teamName: string
  number: number
  isActive: boolean
}

/**
 * Normalizes a display name from a potentially null full_name field.
 * Returns "Unknown" when the value is missing or blank.
 */
export function normalizeDisplayName(
  name: string | null | undefined,
): string {
  const trimmed = (name ?? '').trim()
  return trimmed.length > 0 ? trimmed : 'Unknown'
}

/**
 * Maps a single raw database row into the UI-ready DirectoryCard shape.
 */
export function mapRowToDirectoryEntry(row: DirectoryRow): DirectoryCard {
  return {
    id: row.id,
    displayName: normalizeDisplayName(row.full_name),
    role: row.role ?? 'Unknown',
    teamName: row.team ?? 'Unknown',
    number: row.number ?? 0,
    isActive: row.is_active ?? false,
  }
}

/**
 * Filters a list of directory cards by role.
 * Pass 'all' or an empty string to skip filtering.
 */
export function filterByRole(
  entries: DirectoryCard[],
  role: string,
): DirectoryCard[] {
  if (!role || role === 'all') return entries
  return entries.filter(
    (e) => e.role.toLowerCase() === role.toLowerCase(),
  )
}

/**
 * Filters out inactive entries, keeping only those with isActive === true.
 */
export function filterActiveEntries(
  entries: DirectoryCard[],
): DirectoryCard[] {
  return entries.filter((e) => e.isActive)
}

/**
 * Converts an array of raw rows into mapped and optionally filtered cards.
 */
export function toDirectoryCards(rows: DirectoryRow[]): DirectoryCard[] {
  return rows.map(mapRowToDirectoryEntry)
}
