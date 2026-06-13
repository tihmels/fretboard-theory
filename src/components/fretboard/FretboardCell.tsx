import type { NoteAnnotation } from '../../theory/types'
import { useTheoryStore } from '../../store/theory'
import { L } from './layout'
import { isChordTone, DEGREE_FILLS } from './colors'
import { SEMITONE_TO_DEGREE } from '../../theory/constants'

const DARK_TEXT_DEGS = new Set([3, 4])

function degNumFromLabel(label: string): number {
  const m = label.match(/\d+/)
  return m ? Math.min(7, parseInt(m[0])) : 1
}

interface Props {
  annotation:  NoteAnnotation
  x:           number
  y:           number
  chordActive: boolean
}

export function FretboardCell({ annotation, x, y, chordActive }: Props) {
  const root  = useTheoryStore(s => s.root)
  const scale = useTheoryStore(s => s.scale)

  if (!annotation.highlighted) return null

  // Fill is always the SCALE degree color — never chord-role color.
  // This matches the design: the same color system reads consistently
  // whether you're looking at a bare scale or an active chord.
  const pc          = annotation.fretboardNote.pitchClass
  const scaleOffset = (pc - root + 12) % 12
  const scaleIdx    = scale ? scale.pattern.indexOf(scaleOffset) : -1
  const degLabel    = scale && scaleIdx >= 0
    ? scale.degrees[scaleIdx]
    : SEMITONE_TO_DEGREE[scaleOffset] ?? '1'
  const dn       = degNumFromLabel(degLabel)
  const fill     = DEGREE_FILLS[dn] ?? DEGREE_FILLS[1]
  const txtColor = DARK_TEXT_DEGS.has(dn) ? '#241a12' : '#fff'

  // When a chord is active, non-chord tones fade to near-invisible.
  // Chord tones render at full opacity in their scale-degree color.
  const dimmed = chordActive && !isChordTone(annotation.role)

  // White halo ring on the chord root (when chord active) or scale root (when not).
  // annotation.semitones === 0 means "this note is the root of whatever context is active"
  // because annotateNote measures semitones from chord.root when chord is active.
  const showRing = annotation.semitones === 0

  return (
    <g opacity={dimmed ? 0.16 : 1}>
      {showRing && (
        <circle
          cx={x} cy={y}
          r={L.dotRadius + 3.5}
          fill="none"
          stroke="rgba(255,255,255,.92)"
          strokeWidth={2.5}
        />
      )}
      <circle
        cx={x} cy={y}
        r={L.dotRadius}
        fill={fill}
        stroke="rgba(0,0,0,.3)"
        strokeWidth={1}
      />
      <text
        x={x} y={y + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill={txtColor}
        fontSize={13}
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="700"
        style={{ userSelect: 'none' }}
      >
        {annotation.label}
      </text>
    </g>
  )
}
