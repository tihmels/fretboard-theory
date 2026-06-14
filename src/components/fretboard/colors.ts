import type { NoteAnnotation, NoteRole } from '../../theory/types'

// Degree fill colours (index = degree number 1–7).
export const DEGREE_FILLS = [
  '',          // 0 unused
  '#e0564f',   // 1  root
  '#e07c30',   // 2
  '#cbb02e',   // 3
  '#54a64f',   // 4
  '#3897d6',   // 5
  '#7a57d6',   // 6
  '#c23bb6',   // 7
]

// When a chord is active these colours override degree-based coloring for
// chord tones, intentionally matching the corresponding degree colour so
// that "root = always red", "third = always yellow", etc. stays consistent.
const CHORD_ROLE_FILLS: Partial<Record<NoteRole, string>> = {
  'root':           '#e0564f',   // degree 1
  'chord-third':    '#cbb02e',   // degree 3
  'chord-fifth':    '#3897d6',   // degree 5
  'chord-seventh':  '#c23bb6',   // degree 7
  'chord-tone':     '#8888aa',   // extensions — neutral
}

const CHORD_TONE_ROLES: ReadonlySet<NoteRole> = new Set([
  'root', 'chord-third', 'chord-fifth', 'chord-seventh', 'chord-tone',
])

// Degrees whose background is light enough to require dark label text.
const DARK_TEXT_DEGREES = new Set([3, 4])

function degreeFromLabel(label: string): number {
  const m = label.match(/\d+/)
  return m ? Math.min(7, parseInt(m[0])) : 1
}

export function isChordTone(role: NoteRole): boolean {
  return CHORD_TONE_ROLES.has(role)
}

export function dotFill(ann: NoteAnnotation, chordActive: boolean): string {
  if (chordActive && isChordTone(ann.role)) {
    return CHORD_ROLE_FILLS[ann.role] ?? DEGREE_FILLS[1]
  }
  const deg = degreeFromLabel(ann.degreeLabel)
  return DEGREE_FILLS[deg] ?? DEGREE_FILLS[1]
}

export function dotTextColor(ann: NoteAnnotation, chordActive: boolean): string {
  if (chordActive && isChordTone(ann.role)) {
    return ann.role === 'chord-third' ? '#1a1a1a' : '#ffffff'
  }
  const deg = degreeFromLabel(ann.degreeLabel)
  return DARK_TEXT_DEGREES.has(deg) ? '#1a1a1a' : '#ffffff'
}

/** Fill colour for the legend chip given a degree index 1–7. */
export function legendFill(degreeIndex: number): string {
  return DEGREE_FILLS[Math.max(1, Math.min(7, degreeIndex))]
}
