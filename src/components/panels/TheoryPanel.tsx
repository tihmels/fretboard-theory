import { CircleOfFifths } from '../circle/CircleOfFifths'
import { ScaleSelector } from '../theory/ScaleSelector'
import { ChordQualitySelector } from '../theory/ChordQualitySelector'

export function TheoryPanel() {
  return (
    <aside
      style={{
        width: '308px',
        minWidth: '308px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      {/* Brand header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '20px 22px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '9px',
          background: 'linear-gradient(150deg,#e05555,#c038b8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, fontSize: '16px', color: '#fff',
          boxShadow: '0 2px 8px rgba(224,85,85,.25)', flexShrink: 0,
        }}>
          F
        </div>
        <div>
          <div style={{ fontSize: '14.5px', fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.1 }}>Fretboard Theory</div>
          <div style={{ fontSize: '11.5px', color: '#8a7f72', marginTop: '2px' }}>Scale & mode explorer</div>
        </div>
      </div>

      {/* Circle of Fifths — root picker + scale visualizer */}
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <CircleOfFifths />
      </div>

      {/* Chord quality selector */}
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        <ChordQualitySelector />
      </div>

      {/* Scale selector — scrollable, fills remaining height */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '18px 22px 28px', overflowY: 'auto' }}>
        <ScaleSelector />
      </div>
    </aside>
  )
}
