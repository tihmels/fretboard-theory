import { useInteractiveStore, type PinnedNote } from '../../store/interactive'
import { useTheoryStore } from '../../store/theory'
import { useFretboardStore } from '../../store/fretboard'
import { getPitchName } from '../../theory/pitch'
import { detectInterval, detectChord } from '../../theory/identify'
import type { PitchClass, Tuning } from '../../theory/types'

function countNeckPositions(pc: number, tuning: Tuning, fretCount: number): number {
  let n = 0
  for (const openNote of tuning.openNotes) {
    for (let f = 0; f <= fretCount; f++) {
      if ((openNote + f) % 12 === pc) n++
    }
  }
  return n
}

const SECTION_LABEL: React.CSSProperties = {
  fontSize: '10px', fontWeight: 700, letterSpacing: '.16em',
  textTransform: 'uppercase', color: '#6b6258', flexShrink: 0,
}

function NoteChip({ note, root }: { note: PinnedNote; root: PitchClass }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '5px 12px', borderRadius: '999px',
      background: '#241c14', border: '1px solid #3a2e22',
      color: '#ede6dd', fontFamily: "'JetBrains Mono', monospace",
      fontWeight: 700, fontSize: '14px',
    }}>
      {getPitchName(note.pc, 'auto', root)}
    </span>
  )
}

export function FretboardReadout() {
  const hoverPc   = useInteractiveStore(s => s.hoverPc)
  const identify  = useInteractiveStore(s => s.identify)
  const pinned    = useInteractiveStore(s => s.pinned)
  const clearPins = useInteractiveStore(s => s.clearPins)
  const root      = useTheoryStore(s => s.root)
  const tuning    = useFretboardStore(s => s.tuning)
  const fretCount = useFretboardStore(s => s.fretCount)

  const row = (children: React.ReactNode) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '18px', width: '100%', flexWrap: 'wrap' }}>
      {children}
    </div>
  )

  if (!identify) {
    if (hoverPc == null) {
      return row(<>
        <span style={SECTION_LABEL}>Tip</span>
        <span style={{ fontSize: '14px', color: '#9a8f82' }}>
          Tap any fret to hear its true pitch. Hover a note to light up every octave of it across the neck.
        </span>
      </>)
    }
    const count    = countNeckPositions(hoverPc, tuning, fretCount)
    const noteName = getPitchName(hoverPc, 'auto', root)
    return row(<>
      <span style={SECTION_LABEL}>Hovering</span>
      <span style={{ fontSize: '30px', fontWeight: 800, color: '#f1ebe2', fontFamily: "'JetBrains Mono', monospace" }}>
        {noteName}
      </span>
      <span style={{ fontSize: '14px', color: '#8a7f72' }}>
        {count} positions on the neck · all octaves highlighted
      </span>
    </>)
  }

  // Identify mode
  let result: React.ReactNode

  if (pinned.length === 0) {
    result = (
      <span style={{ fontSize: '14px', color: '#9a8f82' }}>
        Tap notes anywhere on the neck — two notes name the interval, three or more name the chord.
      </span>
    )
  } else if (pinned.length === 1) {
    result = (
      <span style={{ fontSize: '14px', color: '#8a7f72' }}>
        Add another note to measure an interval.
      </span>
    )
  } else if (pinned.length === 2) {
    const { name, semitones } = detectInterval(pinned[0].midi, pinned[1].midi)
    result = (
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
        <span style={{ fontSize: '26px', fontWeight: 800, color: '#f1ebe2' }}>{name}</span>
        <span style={{ fontSize: '13px', color: '#8a7f72', fontFamily: "'JetBrains Mono', monospace" }}>
          {semitones} semitones
        </span>
      </div>
    )
  } else {
    const chord = detectChord(pinned.map(p => p.pc))
    if (chord) {
      const rootName = getPitchName(chord.root, 'auto', root)
      result = (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
          <span style={{ fontSize: '28px', fontWeight: 800, color: '#e0a85a', fontFamily: "'JetBrains Mono', monospace" }}>
            {rootName}{chord.symbol}
          </span>
          <span style={{ fontSize: '15px', color: '#cdbfaf', fontWeight: 600 }}>
            {rootName} {chord.word}
          </span>
        </div>
      )
    } else {
      result = (
        <span style={{ fontSize: '15px', color: '#9a8f82' }}>
          Stacked notes — no common chord. Remove a note or try another voicing.
        </span>
      )
    }
  }

  return row(<>
    <span style={SECTION_LABEL}>Identify</span>
    {pinned.length > 0 && (
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {pinned.map((p, i) => <NoteChip key={i} note={p} root={root} />)}
      </div>
    )}
    {result}
    {pinned.length > 0 && (
      <button
        onClick={clearPins}
        style={{
          marginLeft: 'auto', fontSize: '12px', color: '#8a7f72',
          background: 'transparent', border: '1px solid #2a221b',
          borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
          fontFamily: 'inherit', fontWeight: 600, flexShrink: 0,
        }}
        className="h-ghost"
      >
        Clear notes
      </button>
    )}
  </>)
}
