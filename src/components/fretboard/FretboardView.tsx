import { useFretboardAnnotations } from '../../hooks/useFretboardAnnotations'
import { useFretboardStore } from '../../store/fretboard'
import { useTheoryStore } from '../../store/theory'
import { useProgressionStore } from '../../store/progression'
import { FretboardCell } from './FretboardCell'
import { FretboardInlays } from './FretboardInlays'
import { L, svgWidth, svgHeight, stringY, cellX, fretWireX, neckTop, neckBottom } from './layout'

export function FretboardView() {
  const annotations    = useFretboardAnnotations()
  const fretCount      = useFretboardStore(s => s.fretCount)
  const chordQualityId = useTheoryStore(s => s.chordQualityId)
  const hoveredStep    = useProgressionStore(s => s.hoveredStep)
  const progSteps      = useProgressionStore(s => s.steps)
  const chordActive    = chordQualityId !== null || (hoveredStep !== null && progSteps.length > 0)

  const W    = svgWidth(fretCount)
  const H    = svgHeight()
  const topY = neckTop()
  const botY = neckBottom()

  return (
    <div style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: '8px' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        style={{ display: 'block', overflow: 'visible' }}
        aria-label="Guitar fretboard"
      >
        <defs>
          <linearGradient id="fbwood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#2f2017" />
            <stop offset="48%"  stopColor="#1c120c" />
            <stop offset="100%" stopColor="#2b1c13" />
          </linearGradient>
          <linearGradient id="fbnut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#efe3b8" />
            <stop offset="100%" stopColor="#c9b67e" />
          </linearGradient>
        </defs>

        {/* Open-string column darker guide */}
        <rect
          x={2}
          y={topY}
          width={L.openColWidth - 6}
          height={botY - topY}
          fill="#16110c"
          rx={4}
        />

        {/* Fretboard wood */}
        <rect
          x={L.openColWidth}
          y={topY}
          width={W - L.openColWidth - 8}
          height={botY - topY}
          fill="url(#fbwood)"
          rx={3}
        />
        {/* Wood border overlay */}
        <rect
          x={L.openColWidth}
          y={topY}
          width={W - L.openColWidth - 8}
          height={botY - topY}
          fill="none"
          stroke="rgba(0,0,0,.4)"
          strokeWidth={1}
          rx={3}
        />

        {/* ── String lines ─────────────────────────────────── */}
        {Array.from({ length: annotations.length }, (_, si) => (
          <line
            key={si}
            x1={6}
            y1={stringY(si)}
            x2={W - 8}
            y2={stringY(si)}
            stroke={L.stringColors[si]}
            strokeWidth={L.stringWidths[si]}
            strokeLinecap="round"
          />
        ))}

        {/* ── Fret wires ────────────────────────────────────── */}
        {Array.from({ length: fretCount }, (_, i) => {
          const n = i + 1
          const x = fretWireX(n)
          return (
            <line
              key={i}
              x1={x} y1={topY}
              x2={x} y2={botY}
              stroke="#998976"
              strokeWidth={n === 12 ? 3 : 2.4}
              strokeLinecap="round"
            />
          )
        })}

        {/* ── Nut ──────────────────────────────────────────── */}
        <rect
          x={L.openColWidth}
          y={topY - 2}
          width={L.nutWidth}
          height={botY - topY + 4}
          fill="url(#fbnut)"
          rx={2}
        />

        {/* ── Inlay markers + fret numbers ─────────────────── */}
        <FretboardInlays fretCount={fretCount} neckTopY={topY} neckBottomY={botY} />

        {/* ── Note dots ─────────────────────────────────────── */}
        {annotations.map((stringAnnotations, si) =>
          stringAnnotations.map(ann => (
            <FretboardCell
              key={`${si}-${ann.fretboardNote.fret}`}
              annotation={ann}
              x={cellX(ann.fretboardNote.fret)}
              y={stringY(si)}
              chordActive={chordActive}
            />
          ))
        )}
      </svg>
    </div>
  )
}
