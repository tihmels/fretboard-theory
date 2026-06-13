import { useMemo } from 'react'
import { useShareUrl } from './hooks/useShareUrl'
import { useProgressionAudio } from './hooks/useProgressionAudio'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { FretboardView } from './components/fretboard/FretboardView'
import { NoteChips } from './components/fretboard/NoteChips'
import { TheoryPanel } from './components/panels/TheoryPanel'
import { ProgressionPanel } from './components/progression/ProgressionPanel'
import { LabelModeToggle } from './components/ui/LabelModeToggle'
import { useTheoryStore } from './store/theory'
import { useProgressionStore } from './store/progression'
import { useFretboardStore } from './store/fretboard'
import { getPitchName } from './theory/pitch'
import { CHORD_QUALITIES_BY_ID } from './theory/chords'
import { resolveProgression } from './theory/progression'

function MainHeader() {
  const root           = useTheoryStore(s => s.root)
  const scale          = useTheoryStore(s => s.scale)
  const chordQualityId = useTheoryStore(s => s.chordQualityId)
  const progSteps      = useProgressionStore(s => s.steps)
  const activeStep     = useProgressionStore(s => s.activeStep)
  const tuning         = useFretboardStore(s => s.tuning)
  const fretCount      = useFretboardStore(s => s.fretCount)

  const rootName = getPitchName(root, 'auto', root)

  // Derive active chord name — progression takes precedence
  const chordName = useMemo(() => {
    if (activeStep != null && progSteps.length > 0 && scale) {
      try {
        const resolved = resolveProgression(root, scale, { steps: progSteps })
        const c = resolved[activeStep]
        if (c) return getPitchName(c.root, 'auto', c.root) + c.quality.symbol
      } catch { /* resolveProgression can throw for non-diatonic scales */ }
    }
    if (chordQualityId) {
      const q = CHORD_QUALITIES_BY_ID[chordQualityId]
      if (q) return rootName + q.symbol
    }
    return null
  }, [root, scale, chordQualityId, progSteps, activeStep, rootName])

  const headline = chordName ?? (scale?.name ?? 'No scale')
  const sub      = chordName
    ? (scale ? `${scale.category} · ${scale.pattern.length} notes · ${chordName} over ${rootName}` : chordName)
    : scale
      ? `${scale.category} · ${scale.pattern.length} notes · spelled from ${rootName}`
      : ''

  const meta = `${tuning.name} · ${fretCount} frets`

  return (
    <header style={{ padding: '28px 40px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexShrink: 0 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap', lineHeight: 1.1 }}>
          <span style={{ fontSize: '36px', fontWeight: 700, letterSpacing: '-.01em', color: '#e05a5a', fontFamily: "'JetBrains Mono', monospace" }}>
            {rootName}
          </span>
          <span style={{ fontSize: '31px', fontWeight: 800, letterSpacing: '-.02em', color: '#f1ebe2' }}>
            {headline}
          </span>
        </div>
        {sub && (
          <div style={{ fontSize: '12.5px', color: '#8a7f72', marginTop: '12px', letterSpacing: '.03em' }}>
            {sub}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '11px', flexShrink: 0 }}>
        <LabelModeToggle />
        <div style={{ fontSize: '11.5px', color: '#6b6258', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.02em' }}>
          {meta}
        </div>
      </div>
    </header>
  )
}

function App() {
  useShareUrl()
  useProgressionAudio()
  useKeyboardShortcuts()

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: 'var(--bg-app)', color: 'var(--text-primary)',
      fontFamily: "'Hanken Grotesk', system-ui, sans-serif",
    }}>
      <TheoryPanel />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <MainHeader />

        <div style={{ padding: '22px 40px 16px', flexShrink: 0 }}>
          <NoteChips />
        </div>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 40px 16px', overflowX: 'auto', overflowY: 'hidden' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <FretboardView />
          </div>
        </div>

        <ProgressionPanel />
      </main>
    </div>
  )
}

export default App
