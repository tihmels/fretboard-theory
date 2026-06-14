import type { PitchClass } from '../theory/types'

const API_BASE  = 'https://api.getsong.co'
const API_KEY   = import.meta.env.VITE_GETSONGKEY_API_KEY as string
const CACHE_NS  = 'gsk|'
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000

export interface GetsongkeyKeyResult {
  pitchClass: PitchClass
  mode: 0 | 1
  tempo?: number
}

interface CacheEntry { value: GetsongkeyKeyResult | null; ts: number }

function cacheKey(title: string, artist: string): string {
  return CACHE_NS + title.toLowerCase() + '|' + artist.toLowerCase()
}

function cacheGet(title: string, artist: string): GetsongkeyKeyResult | null | undefined {
  try {
    const raw = localStorage.getItem(cacheKey(title, artist))
    if (!raw) return undefined
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.ts > CACHE_TTL) return undefined
    return entry.value
  } catch { return undefined }
}

function cacheSet(title: string, artist: string, value: GetsongkeyKeyResult | null) {
  try {
    localStorage.setItem(cacheKey(title, artist), JSON.stringify({ value, ts: Date.now() }))
  } catch {}
}

// Parses "Em", "A", "C#", "Bbm", "F#m" → pitchClass + mode
function parseKeyOf(raw: string): { pitchClass: PitchClass; mode: 0 | 1 } | null {
  const s = raw.trim()
  const lc = s.toLowerCase()

  let notePart = s.split(/\s+/)[0]
  const isMinor = lc.includes('minor') || /m$/i.test(notePart)
  const mode: 0 | 1 = isMinor ? 0 : 1
  if (isMinor && /m$/i.test(notePart)) notePart = notePart.slice(0, -1)
  notePart = notePart.charAt(0).toUpperCase() + notePart.slice(1).toLowerCase()

  const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']

  let pc = SHARP.indexOf(notePart)
  if (pc === -1) pc = FLAT.indexOf(notePart)
  return pc !== -1 ? { pitchClass: pc as PitchClass, mode } : null
}

// Handles { "search": [...] }, { "song": {...} }, { "song": [...] }, or bare arrays
function extractSongs(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (!data || typeof data !== 'object') return []
  const d = data as Record<string, unknown>
  if (Array.isArray(d.search)) return d.search as Record<string, unknown>[]
  if (Array.isArray(d.song))   return d.song   as Record<string, unknown>[]
  if (d.song && typeof d.song === 'object') return [d.song as Record<string, unknown>]
  return []
}

export async function lookupSongKey(title: string, artist: string): Promise<GetsongkeyKeyResult | null> {
  const cached = cacheGet(title, artist)
  if (cached !== undefined) return cached

  const lookup = encodeURIComponent(`song:${title} artist:${artist}`)
  const res = await fetch(`${API_BASE}/search/?type=both&lookup=${lookup}&limit=3&api_key=${API_KEY}`)
  if (!res.ok) return null

  for (const song of extractSongs(await res.json())) {
    if (typeof song.key_of !== 'string') continue
    const parsed = parseKeyOf(song.key_of)
    if (!parsed) continue
    const rawTempo = song.tempo
    const tempo = rawTempo != null ? (Number(rawTempo) || undefined) : undefined
    const result: GetsongkeyKeyResult = { pitchClass: parsed.pitchClass, mode: parsed.mode, tempo }
    cacheSet(title, artist, result)
    return result
  }

  cacheSet(title, artist, null)
  return null
}
