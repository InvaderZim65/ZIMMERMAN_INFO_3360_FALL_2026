// src/lib/directory/mappers.test.ts
// Unit tests for pure directory mapping helpers.
// No Supabase, no env vars, no network -- plain input/output checks only.

import { describe, it, expect } from 'vitest'
import {
  normalizeDisplayName,
  mapRowToDirectoryEntry,
  filterByRole,
  filterActiveEntries,
  toDirectoryCards,
  type DirectoryRow,
} from './mappers'

// ── Fixtures ─────────────────────────────────────────────────────────

const activeForward: DirectoryRow = {
  id: 'mcdavid-97',
  full_name: 'Connor McDavid',
  role: 'F',
  team: 'EDM',
  number: 97,
  is_active: true,
}

const activeDefenseman: DirectoryRow = {
  id: 'makar-8',
  full_name: 'Cale Makar',
  role: 'D',
  team: 'COL',
  number: 8,
  is_active: true,
}

const inactiveGoalie: DirectoryRow = {
  id: 'price-31',
  full_name: 'Carey Price',
  role: 'G',
  team: 'MTL',
  number: 31,
  is_active: false,
}

const nullFieldsRow: DirectoryRow = {
  id: 'unknown-0',
  full_name: null,
  role: null,
  team: null,
  number: null,
  is_active: null,
}

// ── normalizeDisplayName ─────────────────────────────────────────────

describe('normalizeDisplayName', () => {
  it('returns the trimmed name when present', () => {
    expect(normalizeDisplayName('Connor McDavid')).toBe('Connor McDavid')
  })

  it('trims leading and trailing whitespace', () => {
    expect(normalizeDisplayName('  Sidney Crosby  ')).toBe('Sidney Crosby')
  })

  it('returns "Unknown" for null input', () => {
    expect(normalizeDisplayName(null)).toBe('Unknown')
  })

  it('returns "Unknown" for undefined input', () => {
    expect(normalizeDisplayName(undefined)).toBe('Unknown')
  })

  it('returns "Unknown" for an empty string', () => {
    expect(normalizeDisplayName('')).toBe('Unknown')
  })

  it('returns "Unknown" for a whitespace-only string', () => {
    expect(normalizeDisplayName('   ')).toBe('Unknown')
  })
})

// ── mapRowToDirectoryEntry ───────────────────────────────────────────

describe('mapRowToDirectoryEntry', () => {
  it('maps a complete row into the directory card shape', () => {
    const card = mapRowToDirectoryEntry(activeForward)
    expect(card).toEqual({
      id: 'mcdavid-97',
      displayName: 'Connor McDavid',
      role: 'F',
      teamName: 'EDM',
      number: 97,
      isActive: true,
    })
  })

  it('fills defaults for null fields', () => {
    const card = mapRowToDirectoryEntry(nullFieldsRow)
    expect(card.displayName).toBe('Unknown')
    expect(card.role).toBe('Unknown')
    expect(card.teamName).toBe('Unknown')
    expect(card.number).toBe(0)
    expect(card.isActive).toBe(false)
  })
})

// ── filterByRole ─────────────────────────────────────────────────────

describe('filterByRole', () => {
  const allEntries = [activeForward, activeDefenseman, inactiveGoalie].map(
    mapRowToDirectoryEntry,
  )

  it('returns all entries when role is "all"', () => {
    expect(filterByRole(allEntries, 'all')).toHaveLength(3)
  })

  it('returns all entries when role is empty string', () => {
    expect(filterByRole(allEntries, '')).toHaveLength(3)
  })

  it('keeps only forwards when role is "F"', () => {
    const result = filterByRole(allEntries, 'F')
    expect(result).toHaveLength(1)
    expect(result[0].displayName).toBe('Connor McDavid')
  })

  it('filters case-insensitively', () => {
    const result = filterByRole(allEntries, 'd')
    expect(result).toHaveLength(1)
    expect(result[0].displayName).toBe('Cale Makar')
  })

  it('returns empty array when no entries match the role', () => {
    expect(filterByRole(allEntries, 'C')).toHaveLength(0)
  })
})

// ── filterActiveEntries ──────────────────────────────────────────────

describe('filterActiveEntries', () => {
  const allEntries = [activeForward, activeDefenseman, inactiveGoalie].map(
    mapRowToDirectoryEntry,
  )

  it('keeps only active entries', () => {
    const result = filterActiveEntries(allEntries)
    expect(result).toHaveLength(2)
    expect(result.every((e) => e.isActive)).toBe(true)
  })

  it('returns empty array when every entry is inactive', () => {
    const inactiveOnly = [inactiveGoalie].map(mapRowToDirectoryEntry)
    expect(filterActiveEntries(inactiveOnly)).toHaveLength(0)
  })
})

// ── toDirectoryCards ─────────────────────────────────────────────────

describe('toDirectoryCards', () => {
  it('maps an array of raw rows into directory cards', () => {
    const cards = toDirectoryCards([activeForward, activeDefenseman])
    expect(cards).toHaveLength(2)
    expect(cards[0].displayName).toBe('Connor McDavid')
    expect(cards[1].displayName).toBe('Cale Makar')
  })

  it('returns an empty array for empty input', () => {
    expect(toDirectoryCards([])).toEqual([])
  })
})
