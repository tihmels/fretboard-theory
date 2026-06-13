import { useMemo } from 'react'
import { useTheoryStore } from '../store/theory'
import { useFretboardStore } from '../store/fretboard'
import { useViewStore } from '../store/view'
import { useProgressionStore } from '../store/progression'
import { buildFretboardGrid } from '../theory/fretboard'
import { annotateGrid } from '../theory/annotation'
import { CHORD_QUALITIES_BY_ID } from '../theory/chords'
import { resolveProgression } from '../theory/progression'
import type { Chord } from '../theory/types'

export function useFretboardAnnotations() {
  const root           = useTheoryStore(s => s.root)
  const scale          = useTheoryStore(s => s.scale)
  const chordQualityId = useTheoryStore(s => s.chordQualityId)
  const progSteps      = useProgressionStore(s => s.steps)
  const activeStep     = useProgressionStore(s => s.activeStep)
  const tuning         = useFretboardStore(s => s.tuning)
  const fretCount      = useFretboardStore(s => s.fretCount)
  const startFret      = useFretboardStore(s => s.startFret)
  const labelMode      = useViewStore(s => s.labelMode)

  return useMemo(() => {
    // Progression active step takes precedence over quality selector
    let chord: Chord | null = null
    if (activeStep != null && progSteps.length > 0 && scale) {
      try {
        const resolved = resolveProgression(root, scale, { steps: progSteps })
        chord = resolved[activeStep] ?? null
      } catch { chord = null }
    }
    if (!chord && chordQualityId) {
      const quality = CHORD_QUALITIES_BY_ID[chordQualityId]
      if (quality) chord = { root, quality }
    }

    const grid = buildFretboardGrid(tuning, fretCount)
    return annotateGrid(grid, {
      root,
      scale,
      chord,
      labelMode,
      spelling: 'auto',
      fretRange: { startFret, endFret: startFret + fretCount },
    })
  }, [root, scale, chordQualityId, progSteps, activeStep, tuning, fretCount, startFret, labelMode])
}
