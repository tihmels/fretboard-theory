const API_BASE = 'https://api.getsong.co'
const API_KEY  = import.meta.env.VITE_GETSONGKEY_API_KEY as string

export interface GetsongkeyKeyResult {
  pitchClass: number
  mode: 0 | 1
  tempo?: number
}

// Parses "Em", "A", "C#", "Bbm", "F#m" → pitchClass + mode
function parseKeyOf(raw: string): { pitchClass: number; mode: 0 | 1 } | null {
  const s = raw.trim()
  const lc = s.toLowerCase()

  let notePart = s.split(/\s+/)[0]
  const isMinor = lc.includes('minor') || /m$/.test(notePart)
  const mode: 0 | 1 = isMinor ? 0 : 1
  if (isMinor && /m$/.test(notePart)) notePart = notePart.slice(0, -1)

  const SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const FLAT  = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']

  let pc = SHARP.indexOf(notePart)
  if (pc === -1) pc = FLAT.indexOf(notePart)
  return pc !== -1 ? { pitchClass: pc, mode } : null
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
  const lookup = encodeURIComponent(`song:${title} artist:${artist}`)
  const res = await fetch(`${API_BASE}/search/?type=both&lookup=${lookup}&limit=3&api_key=${API_KEY}`)
  if (!res.ok) return null

  for (const song of extractSongs(await res.json())) {
    if (typeof song.key_of !== 'string') continue
    const parsed = parseKeyOf(song.key_of)
    if (!parsed) continue
    const rawTempo = song.tempo
    const tempo = rawTempo != null ? (Number(rawTempo) || undefined) : undefined
    return { ...parsed, tempo }
  }
  return null
}
