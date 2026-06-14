import { useInteractiveStore, POSITIONS } from '../../store/interactive'

const BASE_BTN: React.CSSProperties = {
  padding: '5px 11px', borderRadius: '7px', border: 'none',
  background: 'transparent', color: '#8a7f72', fontSize: '12px',
  fontWeight: 600, cursor: 'pointer',
  fontFamily: "'JetBrains Mono', monospace",
  transition: 'background .12s, color .12s',
}

const ACTIVE_WHOLE: React.CSSProperties = {
  ...BASE_BTN, background: '#2c241c', color: '#f1ebe2', fontFamily: 'inherit',
}

const WHOLE: React.CSSProperties = { ...BASE_BTN, fontFamily: 'inherit' }

const ACTIVE_WIN: React.CSSProperties = {
  ...BASE_BTN, background: 'rgba(224,168,90,.16)', color: '#f0cf95',
}

const HEAR_BTN: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '7px',
  padding: '8px 15px', borderRadius: '10px',
  border: '1px solid #2a221b', background: '#1b150f',
  color: '#b3a89a', fontSize: '12.5px', fontWeight: 700,
  cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
}

interface Props {
  onHearScale: () => void
}

export function FretboardToolbar({ onHearScale }: Props) {
  const posIdx         = useInteractiveStore(s => s.posIdx)
  const identify       = useInteractiveStore(s => s.identify)
  const setPosIdx      = useInteractiveStore(s => s.setPosIdx)
  const toggleIdentify = useInteractiveStore(s => s.toggleIdentify)

  const identifyBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '7px',
    padding: '8px 15px', borderRadius: '10px',
    border: `1px solid ${identify ? 'rgba(224,168,90,.5)' : '#2a221b'}`,
    background: identify ? 'rgba(224,168,90,.15)' : '#1b150f',
    color: identify ? '#f0cf95' : '#b3a89a',
    fontSize: '12.5px', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b6258' }}>
          Position
        </span>
        <div style={{ display: 'flex', gap: '4px', background: '#16120e', border: '1px solid #2a221b', borderRadius: '10px', padding: '4px' }}>
          <button onClick={() => setPosIdx(null)} style={posIdx === null ? ACTIVE_WHOLE : WHOLE}>
            Whole neck
          </button>
          {POSITIONS.map((pos, i) => (
            <button
              key={i}
              onClick={() => setPosIdx(posIdx === i ? null : i)}
              style={posIdx === i ? ACTIVE_WIN : BASE_BTN}
            >
              {pos.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ width: 1, height: 24, background: '#2a221b', flexShrink: 0 }} />

      <button onClick={toggleIdentify} style={identifyBtnStyle}>
        {identify ? '◉  Identify: on' : '◎  Identify chord'}
      </button>

      <button onClick={onHearScale} style={HEAR_BTN} className="h-icon">
        ▶  Hear scale
      </button>

      <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#6b6258', letterSpacing: '.01em' }}>
        {identify
          ? 'Identify mode · tap notes to name the interval or chord they form'
          : 'Tap a fret to hear it · hover a note to light up its octaves'}
      </span>
    </div>
  )
}
