import { useState, useRef, useEffect } from 'react'
import { useFretboardAnnotations } from '../../hooks/useFretboardAnnotations'
import { useFretboardStore } from '../../store/fretboard'
import { useTheoryStore } from '../../store/theory'
import { useProgressionStore } from '../../store/progression'
import { useInteractiveStore, POSITIONS } from '../../store/interactive'
import { FretboardCell } from './FretboardCell'
import { FretboardInlays } from './FretboardInlays'
import { FretboardToolbar } from './FretboardToolbar'
import { FretboardReadout } from './FretboardReadout'
import { L, svgWidth, svgHeight, stringY, cellX, fretWireX, neckTop, neckBottom } from './layout'
import { playNote } from '../../audio/chordSynth'
import type { PitchClass } from '../../theory/types'

interface Ripple { id: number; x: number; y: number }

export function FretboardView() {
  const annotations    = useFretboardAnnotations()
  const fretCount      = useFretboardStore(s => s.fretCount)
  const tuning         = useFretboardStore(s => s.tuning)
  const chordQualityId = useTheoryStore(s => s.chordQualityId)
  const root           = useTheoryStore(s => s.root)
  const scale          = useTheoryStore(s => s.scale)
  const hoveredStep    = useProgressionStore(s => s.hoveredStep)
  const progSteps      = useProgressionStore(s => s.steps)
  const chordActive    = chordQualityId !== null || (hoveredStep !== null && progSteps.length > 0)

  const hoverPc    = useInteractiveStore(s => s.hoverPc)
  const posIdx     = useInteractiveStore(s => s.posIdx)
  const identify   = useInteractiveStore(s => s.identify)
  const pinned     = useInteractiveStore(s => s.pinned)
  const setHoverPc = useInteractiveStore(s => s.setHoverPc)
  const togglePin  = useInteractiveStore(s => s.togglePin)

  const [flashId, setFlashId] = useState<string | null>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])
  const rippleIdRef  = useRef(0)
  const hearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHearingRef = useRef(false)

  useEffect(() => () => {
    if (hearTimerRef.current) clearTimeout(hearTimerRef.current)
  }, [])

  const pos = posIdx !== null ? POSITIONS[posIdx] : null

  function inWindow(fret: number): boolean {
    return pos === null || (fret >= pos.lo && fret <= pos.hi)
  }

  function addRipple(x: number, y: number) {
    const id = ++rippleIdRef.current
    setRipples(prev => [...prev, { id, x, y }])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 520)
  }

  function handlePointerDown(si: number, fret: number, pc: PitchClass, midi: number, x: number, y: number) {
    playNote(midi)
    addRipple(x, y)
    if (identify) togglePin({ string: si, fret, pc, midi })
  }

  function hearScale() {
    if (isHearingRef.current || !scale) return
    const notes: { s: number; f: number; midi: number; off: number }[] = []
    for (let s = 0; s < tuning.openNotes.length; s++) {
      for (let f = 0; f <= fretCount; f++) {
        if (!inWindow(f)) continue
        const midi = tuning.openNotes[s] + f
        const pc   = midi % 12
        const off  = (pc - root + 12) % 12
        if (!scale.pattern.includes(off)) continue
        notes.push({ s, f, midi, off })
      }
    }
    notes.sort((a, b) => a.midi - b.midi)
    let startIdx = notes.findIndex(d => d.off === 0)
    if (startIdx < 0) startIdx = 0
    const run: typeof notes = []
    let lastMidi = -1
    for (let i = startIdx; i < notes.length && run.length < scale.pattern.length + 1; i++) {
      if (notes[i].midi === lastMidi) continue
      run.push(notes[i])
      lastMidi = notes[i].midi
    }
    if (!run.length) return
    isHearingRef.current = true
    let i = 0
    const step = () => {
      if (i >= run.length) {
        isHearingRef.current = false
        setFlashId(null)
        return
      }
      const p = run[i]
      playNote(p.midi)
      setFlashId(`${p.s}-${p.f}`)
      i++
      hearTimerRef.current = setTimeout(step, 240)
    }
    step()
  }

  const W    = svgWidth(fretCount)
  const H    = svgHeight()
  const topY = neckTop()
  const botY = neckBottom()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flexShrink: 0, padding: '10px 0 6px' }}>
        <FretboardToolbar onHearScale={hearScale} />
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflowX: 'auto', overflowY: 'hidden', paddingBottom: '8px' }}>
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

          {/* Open-string column */}
          <rect x={2} y={topY} width={L.openColWidth - 6} height={botY - topY} fill="#16110c" rx={4} />

          {/* Fretboard wood */}
          <rect x={L.openColWidth} y={topY} width={W - L.openColWidth - 8} height={botY - topY} fill="url(#fbwood)" rx={3} />
          <rect x={L.openColWidth} y={topY} width={W - L.openColWidth - 8} height={botY - topY} fill="none" stroke="rgba(0,0,0,.4)" strokeWidth={1} rx={3} />

          {/* String lines */}
          {Array.from({ length: annotations.length }, (_, si) => (
            <line
              key={si}
              x1={6} y1={stringY(si)}
              x2={W - 8} y2={stringY(si)}
              stroke={L.stringColors[si]}
              strokeWidth={L.stringWidths[si]}
              strokeLinecap="round"
            />
          ))}

          {/* Fret wires */}
          {Array.from({ length: fretCount }, (_, i) => {
            const n = i + 1
            const x = fretWireX(n)
            return (
              <line key={i} x1={x} y1={topY} x2={x} y2={botY} stroke="#998976" strokeWidth={n === 12 ? 3 : 2.4} strokeLinecap="round" />
            )
          })}

          {/* Nut */}
          <rect x={L.openColWidth} y={topY - 2} width={L.nutWidth} height={botY - topY + 4} fill="url(#fbnut)" rx={2} />

          {/* Inlays + fret numbers */}
          <FretboardInlays fretCount={fretCount} neckTopY={topY} neckBottomY={botY} />

          {/* Position window highlight overlay */}
          {posIdx !== null && (() => {
            const p  = POSITIONS[posIdx]
            const lx = p.lo <= 0 ? 2 : fretWireX(p.lo - 1)
            const rx = fretWireX(p.hi)
            return (
              <rect
                x={lx} y={topY - 3}
                width={rx - lx} height={botY - topY + 6}
                fill="rgba(224,168,90,.07)"
                stroke="rgba(224,168,90,.34)"
                strokeWidth={1.5}
                rx={6}
              />
            )
          })()}

          {/* Note dots */}
          {annotations.map((stringAnnotations, si) =>
            stringAnnotations.map(ann => {
              const fret = ann.fretboardNote.fret
              const pc   = ann.fretboardNote.pitchClass
              const midi = ann.fretboardNote.midiNote
              const x    = cellX(fret)
              const y    = stringY(si)
              const key  = `${si}-${fret}`
              return (
                <FretboardCell
                  key={key}
                  annotation={ann}
                  x={x} y={y}
                  chordActive={chordActive}
                  hoverPc={hoverPc}
                  inWindow={inWindow(fret)}
                  identify={identify}
                  isPinned={pinned.some(p => p.string === si && p.fret === fret)}
                  isFlash={flashId === key}
                  onPointerDown={() => handlePointerDown(si, fret, pc, midi, x, y)}
                  onMouseEnter={() => setHoverPc(pc)}
                  onMouseLeave={() => setHoverPc(null)}
                />
              )
            })
          )}

          {/* Tap ripples */}
          {ripples.map(r => (
            <circle
              key={`rip-${r.id}`}
              cx={r.x} cy={r.y} r={L.dotRadius}
              fill="none" stroke="rgba(255,255,255,.7)" strokeWidth={2}
              style={{ animation: 'fbripple .5s ease-out forwards', transformOrigin: `${r.x}px ${r.y}px` }}
            />
          ))}
        </svg>
      </div>

      <div style={{ flexShrink: 0, borderTop: '1px solid #2a221b', background: '#13100c', minHeight: '72px', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
        <FretboardReadout />
      </div>
    </div>
  )
}
