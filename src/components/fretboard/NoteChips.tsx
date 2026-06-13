import { useMemo } from 'react'
import { useTheoryStore } from '../../store/theory'
import { useProgressionStore } from '../../store/progression'
import { getPitchName } from '../../theory/pitch'
import { CHORD_QUALITIES_BY_ID } from '../../theory/chords'
import { resolveProgression } from '../../theory/progression'
import { DEGREE_FILLS } from './colors'
import type { Chord, PitchClass } from '../../theory/types'

const DARK_TEXT_DEGS = new Set([3, 4])
const CHORD_ROLE_COLORS = ['#e0564f', '#cbb02e', '#3897d6', '#c23bb6', '#8888aa']

function degNum(degLabel: string): number {
  const m = degLabel.match(/\d+/)
  return m ? Math.min(7, parseInt(m[0])) : 1
}

export function NoteChips() {
  const root           = useTheoryStore(s => s.root)
  const scale          = useTheoryStore(s => s.scale)
  const chordQualityId = useTheoryStore(s => s.chordQualityId)
  const progSteps      = useProgressionStore(s => s.steps)
  const activeStep     = useProgressionStore(s => s.activeStep)

  if (!scale) return null

  // Resolve the active chord — progression takes precedence over quality selector
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const activeChord: Chord | null = useMemo(() => {
    if (activeStep != null && progSteps.length > 0) {
      try {
        const resolved = resolveProgression(root, scale, { steps: progSteps })
        const c = resolved[activeStep]
        if (c) return c
      } catch { /* resolveProgression throws for non-diatonic scales */ }
    }
    if (chordQualityId) {
      const q = CHORD_QUALITIES_BY_ID[chordQualityId]
      if (q) return { root, quality: q }
    }
    return null
  }, [root, scale, chordQualityId, progSteps, activeStep])

  const chordActive = activeChord !== null

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
      <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b6258', marginRight: '4px' }}>
        Notes
      </span>
      {scale.pattern.map((semitones, i) => {
        const pc       = ((root + semitones) % 12) as PitchClass
        const degLabel = scale.degrees[i]
        const dn       = degNum(degLabel)
        const noteName = getPitchName(pc, 'auto', root)
        const dark     = DARK_TEXT_DEGS.has(dn)

        let chipColor = DEGREE_FILLS[dn] ?? DEGREE_FILLS[1]
        let opacity   = 1

        if (chordActive && activeChord) {
          const offset   = (pc - activeChord.root + 12) % 12
          const chordIdx = activeChord.quality.pattern.indexOf(offset)
          if (chordIdx >= 0) {
            chipColor = CHORD_ROLE_COLORS[Math.min(chordIdx, CHORD_ROLE_COLORS.length - 1)]
          } else {
            opacity = 0.32
          }
        }

        return (
          <span
            key={i}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '5px 12px', borderRadius: '999px',
              background: chipColor,
              color: dark && !chordActive ? '#241a12' : '#fff',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700, fontSize: '14px',
              opacity, transition: 'opacity .15s',
            }}
          >
            <span>{noteName}</span>
            <span style={{ fontSize: '10px', opacity: 0.72, fontWeight: 600 }}>{degLabel}</span>
          </span>
        )
      })}
    </div>
  )
}
