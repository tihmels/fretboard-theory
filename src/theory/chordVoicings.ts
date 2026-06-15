import guitarData from '@tombatossals/chords-db/lib/guitar.json'
import type { Chord, Tuning } from './types'

export interface ChordVoicing {
  cells: Set<string>   // "stringIdx-fret" keys
  color: string
}

// DB chord-object keys for each pitch class (0 = C … 11 = B)
const PC_TO_KEY = [
  'C', 'Csharp', 'D', 'Eb', 'E', 'F',
  'Fsharp', 'G', 'Ab', 'A', 'Bb', 'B',
] as const

const QUALITY_TO_SUFFIX: Record<string, string> = {
  'maj':      'major',
  'min':      'minor',
  'dim':      'dim',
  'aug':      'aug',
  'sus2':     'sus2',
  'sus4':     'sus4',
  'maj7':     'maj7',
  'dom7':     '7',
  'min7':     'm7',
  'min-maj7': 'mmaj7',
  'dim7':     'dim7',
  'm7b5':     'm7b5',
  'aug7':     'aug7',
  'dom9':     '9',
  'maj9':     'maj9',
  'min9':     'm9',
}

const VOICING_COLORS = [
  '#e05a7a',  // rose
  '#e09a30',  // amber
  '#a8c640',  // lime
  '#38c4d6',  // cyan
  '#9a7fd6',  // purple
  '#e0564f',  // red
]

type GuitarDB = typeof guitarData
type ChordEntry = GuitarDB['chords'][keyof GuitarDB['chords']][number]
type Position   = ChordEntry['positions'][number]

function positionToCells(pos: Position): Set<string> {
  const cells = new Set<string>()
  pos.frets.forEach((fretValue, si) => {
    if (fretValue === -1) return
    const actualFret = fretValue === 0 ? 0 : (pos.baseFret - 1) + fretValue
    cells.add(`${si}-${actualFret}`)
  })
  return cells
}

/**
 * Return DB-sourced guitar voicings for `chord` in standard tuning.
 * Returns an empty array for non-standard tunings or unmapped chord qualities.
 */
export function getChordVoicings(chord: Chord, tuning: Tuning): ChordVoicing[] {
  if (tuning.id !== 'standard') return []

  const suffix = QUALITY_TO_SUFFIX[chord.quality.id]
  if (!suffix) return []

  const key     = PC_TO_KEY[chord.root]
  const entries = (guitarData.chords as GuitarDB['chords'])[key as keyof GuitarDB['chords']]
  if (!entries) return []

  const entry = entries.find((e: ChordEntry) => e.suffix === suffix)
  if (!entry) return []

  return entry.positions.map((pos: Position, i: number) => ({
    cells: positionToCells(pos),
    color: VOICING_COLORS[i % VOICING_COLORS.length],
  }))
}
