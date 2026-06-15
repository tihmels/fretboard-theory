import type { NoteAnnotation, PitchClass } from '../../theory/types'
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
  annotation:    NoteAnnotation
  x:             number
  y:             number
  chordActive:   boolean
  hoverPc:       PitchClass | null
  inWindow:      boolean
  identify:      boolean
  isPinned:      boolean
  isFlash:       boolean
  voicingColor:  string | null
  voicingMode:   boolean
  onPointerDown: () => void
  onMouseEnter:  () => void
  onMouseLeave:  () => void
}

export function FretboardCell({
  annotation, x, y, chordActive,
  hoverPc, inWindow, identify, isPinned, isFlash, voicingColor, voicingMode,
  onPointerDown, onMouseEnter, onMouseLeave,
}: Props) {
  const root  = useTheoryStore(s => s.root)
  const scale = useTheoryStore(s => s.scale)
  const pc    = annotation.fretboardNote.pitchClass
  const isGlow = hoverPc !== null && pc === hoverPc

  return (
    <g>
      {annotation.highlighted ? (() => {
        const scaleOffset = (pc - root + 12) % 12
        const scaleIdx    = scale ? scale.pattern.indexOf(scaleOffset) : -1
        const degLabel    = scale && scaleIdx >= 0 ? scale.degrees[scaleIdx] : (SEMITONE_TO_DEGREE[scaleOffset] ?? '1')
        const dn       = degNumFromLabel(degLabel)
        const fill     = DEGREE_FILLS[dn] ?? DEGREE_FILLS[1]
        const txtColor = DARK_TEXT_DEGS.has(dn) ? '#241a12' : '#fff'
        const showRing = annotation.semitones === 0
        const dimmed   = chordActive && !isChordTone(annotation.role)

        let opacity: number
        if (isPinned)       opacity = 1
        else if (!inWindow) opacity = 0.14
        else if (dimmed)    opacity = voicingMode ? 0.07 : 0.16
        else                opacity = 1

        return (
          <g opacity={opacity}>
            {showRing && (
              <circle cx={x} cy={y} r={L.dotRadius + 3.5} fill="none" stroke="rgba(255,255,255,.92)" strokeWidth={2.5} />
            )}
            <circle cx={x} cy={y} r={L.dotRadius} fill={fill} stroke="rgba(0,0,0,.3)" strokeWidth={1} />
            <text
              x={x} y={y + 0.5}
              textAnchor="middle" dominantBaseline="central"
              fill={txtColor} fontSize={13}
              fontFamily="'JetBrains Mono', monospace" fontWeight={700}
              style={{ userSelect: 'none', pointerEvents: 'none' }}
            >
              {annotation.label}
            </text>
          </g>
        )
      })() : (() => {
        // Non-scale note: small faint dot — more visible in identify mode
        let opacity: number
        if (isPinned)       opacity = 1
        else if (!inWindow) opacity = 0.07
        else if (voicingMode) opacity = 0.05
        else                opacity = identify ? 0.3 : 0.2

        return (
          <g opacity={opacity}>
            <circle
              cx={x} cy={y}
              r={isPinned ? L.dotRadius : 6}
              fill={isPinned ? '#5a5168' : '#c7bcae'}
              stroke={isPinned ? 'rgba(255,255,255,.5)' : 'none'}
              strokeWidth={1}
            />
            {isPinned && (
              <text
                x={x} y={y + 0.5}
                textAnchor="middle" dominantBaseline="central"
                fill="#fff" fontSize={12}
                fontFamily="'JetBrains Mono', monospace" fontWeight={700}
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {annotation.pitchName}
              </text>
            )}
          </g>
        )
      })()}

      {isPinned && (
        <circle cx={x} cy={y} r={L.dotRadius + 5} fill="none" stroke="#f0d28a" strokeWidth={2.5} />
      )}
      {isGlow && (
        <circle
          cx={x} cy={y} r={L.dotRadius + 6}
          fill="none" stroke="rgba(255,255,255,.85)" strokeWidth={2}
          style={{ animation: 'fbglow 1.1s ease-in-out infinite' }}
        />
      )}
      {isFlash && (
        <circle cx={x} cy={y} r={L.dotRadius + 7} fill="none" stroke="#e0a85a" strokeWidth={3} />
      )}
      {voicingColor && (
        <circle
          cx={x} cy={y} r={L.dotRadius + 5}
          fill="none"
          stroke={voicingColor}
          strokeWidth={2.5}
          opacity={0.9}
        />
      )}

      {/* Transparent hit target — always on top and pointer-sized */}
      <circle
        cx={x} cy={y} r={19}
        fill="transparent"
        style={{ cursor: 'pointer' }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onPointerDown={onPointerDown}
      />
    </g>
  )
}
