import { useState, useMemo } from 'react'
import { useTheoryStore } from '../../store/theory'
import { useProgressionStore, COMMON_PROGRESSIONS } from '../../store/progression'
import { getDiatonicChords } from '../../theory/chords'
import { resolveProgression } from '../../theory/progression'
import { getPitchName } from '../../theory/pitch'
import { DEGREE_FILLS } from '../fretboard/colors'
import type { ChordQuality } from '../../theory/types'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

function romanNumeral(degIdx: number, quality: ChordQuality): string {
  const base  = ROMAN[degIdx] ?? `${degIdx + 1}`
  const lower = base.toLowerCase()
  const { id } = quality
  if (id === 'dim' || id === 'dim7')                       return lower + '°'
  if (id === 'm7b5')                                       return lower + 'ø'
  if (id === 'aug' || id === 'aug7' || id === 'aug-maj7') return base + '+'
  if (id.startsWith('min'))                                return lower
  return base
}

const BTN: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '28px', height: '28px', fontSize: '11px',
  color: '#9a8f82', background: '#1b150f',
  border: '1px solid #2a221b', borderRadius: '8px',
  cursor: 'pointer', fontFamily: 'inherit',
  transition: 'background .12s, color .12s',
}

export function ProgressionPanel() {
  const root       = useTheoryStore(s => s.root)
  const scale      = useTheoryStore(s => s.scale)
  const steps      = useProgressionStore(s => s.steps)
  const activeStep = useProgressionStore(s => s.activeStep)
  const playing    = useProgressionStore(s => s.playing)
  const bpm        = useProgressionStore(s => s.bpm)
  const loop       = useProgressionStore(s => s.loop)
  const append     = useProgressionStore(s => s.append)
  const replaceAt  = useProgressionStore(s => s.replaceAt)
  const removeAt   = useProgressionStore(s => s.removeAt)
  const focusStep  = useProgressionStore(s => s.focusStep)
  const stepBy     = useProgressionStore(s => s.stepBy)
  const clear      = useProgressionStore(s => s.clear)
  const toggle     = useProgressionStore(s => s.toggle)
  const restart    = useProgressionStore(s => s.restart)
  const setBpm     = useProgressionStore(s => s.setBpm)
  const toggleLoop = useProgressionStore(s => s.toggleLoop)
  const loadPreset = useProgressionStore(s => s.loadPreset)

  const [editCursor, setEditCursor] = useState<number | 'new'>('new')

  const ec: number | 'new' =
    editCursor === 'new' || editCursor < steps.length
      ? editCursor
      : steps.length > 0 ? steps.length - 1 : 'new'

  const diatonic = useMemo(() => scale ? getDiatonicChords(root, scale) : [], [root, scale])

  const resolved = useMemo(() => {
    if (!scale || steps.length === 0) return []
    try { return resolveProgression(root, scale, { steps }) }
    catch { /* resolveProgression throws for non-diatonic scales */ return [] }
  }, [root, scale, steps])

  const scaleLen  = scale?.pattern.length ?? 0
  const progEmpty = steps.length === 0
  const progPos   = steps.length ? `${(activeStep ?? 0) + 1} / ${steps.length}` : '–'

  const handleDiatonicTap = (deg: number) => {
    if (ec === 'new') {
      const newIdx = steps.length
      append(deg)
      focusStep(newIdx)
    } else {
      replaceAt(ec, deg)
      focusStep(ec)
      const next = ec + 1
      if (next < steps.length) {
        setEditCursor(next)
        focusStep(next)
      } else {
        setEditCursor('new')
      }
    }
  }

  const handleStepClick = (idx: number) => {
    setEditCursor(idx)
    focusStep(idx)
  }

  return (
    <div style={{
      flexShrink: 0, borderTop: '1px solid var(--border-subtle)',
      background: '#13100c', padding: '16px 40px 18px',
      display: 'flex', gap: '36px', flexWrap: 'wrap', alignItems: 'flex-start',
    }}>

      {/* ── Left: diatonic chord palette ─────────────────────────────── */}
      <div style={{ flex: '1 1 430px', minWidth: 0 }}>
        <div style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b6258', marginBottom: '12px' }}>
          Diatonic chords
          {ec !== 'new' ? (
            <span style={{ color: '#e0a85a', fontWeight: 600, letterSpacing: '.02em', textTransform: 'none', marginLeft: '8px' }}>
              · tap to replace step {ec + 1}
            </span>
          ) : (
            <span style={{ color: '#534a40', fontWeight: 600, letterSpacing: '.02em', textTransform: 'none', marginLeft: '8px' }}>
              · tap to add to progression
            </span>
          )}
        </div>

        {diatonic.length > 0 ? (
          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
            {diatonic.map((chord, i) => {
              const deg      = i + 1
              const fill     = DEGREE_FILLS[deg] ?? DEGREE_FILLS[1]
              const rootName = getPitchName(chord.root, 'auto', root)
              const numeral  = romanNumeral(i, chord.quality)
              const isActive = activeStep != null && steps[activeStep]?.degree === deg

              return (
                <button
                  key={i}
                  onClick={() => handleDiatonicTap(deg)}
                  title={`${rootName} ${chord.quality.name}`}
                  className={!isActive ? 'h-chord' : ''}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                    padding: '9px 14px', borderRadius: '10px',
                    border: `1px solid ${isActive ? '#5a4632' : '#2a221b'}`,
                    background: isActive ? '#2a2017' : '#1b150f',
                    cursor: 'pointer', minWidth: '58px',
                    transition: 'background .12s, border-color .12s',
                  }}
                >
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '17px', fontWeight: 700, color: fill, lineHeight: 1 }}>
                    {numeral}
                  </span>
                  <span style={{ fontSize: '12.5px', color: isActive ? '#ede6dd' : '#8a7f72', fontWeight: 600 }}>
                    {rootName}{chord.quality.symbol}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <div style={{ fontSize: '12px', color: '#4a4136' }}>
            {scale ? 'Diatonic chords require a 7-tone scale.' : 'Select a scale to see diatonic chords.'}
          </div>
        )}
      </div>

      {/* ── Right: progression track + transport ─────────────────────── */}
      <div style={{ flex: '1 1 360px', minWidth: 0 }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b6258' }}>
              Progression
            </span>
            <span style={{ fontSize: '10.5px', fontFamily: "'JetBrains Mono', monospace", color: '#574d42', fontWeight: 600 }}>
              {progPos}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={restart} style={BTN} className="h-icon" title="Restart">&#x23EE;</button>
            <button onClick={() => stepBy(-1)} style={BTN} className="h-icon" title="Previous step">&#x25C0;</button>
            <button
              onClick={toggle}
              title={playing ? 'Pause (Space)' : 'Play (Space)'}
              className={!progEmpty ? 'h-icon' : ''}
              style={{
                width: '34px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: playing ? '11px' : '13px', color: '#fff',
                background: progEmpty ? '#3a2e22' : '#e0564f',
                border: 'none', borderRadius: '8px',
                cursor: progEmpty ? 'default' : 'pointer', fontFamily: 'inherit',
                transition: 'background .12s',
              }}
            >
              {playing ? '❚❚' : '▶'}
            </button>
            <button onClick={() => stepBy(1)} style={BTN} className="h-icon" title="Next step">&#x25B6;</button>
            <button
              onClick={toggleLoop}
              title={loop ? 'Loop: on' : 'Loop: off'}
              className="h-icon"
              style={{
                ...BTN,
                color: loop ? '#e0a85a' : '#6b6258',
                background: loop ? 'rgba(224,168,90,.12)' : '#1b150f',
                border: `1px solid ${loop ? 'rgba(224,168,90,.4)' : '#2a221b'}`,
                fontSize: '14px',
              }}
            >
              &#x21BB;
            </button>
            {/* BPM control */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '4px', background: '#1b150f', border: '1px solid #2a221b', borderRadius: '8px', padding: '0 3px' }}>
              <button onClick={() => setBpm(bpm - 5)} title="Decrease BPM" className="h-ghost" style={{ width: '20px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: '#8a7f72', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color .12s' }}>&#x2212;</button>
              <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#c7bcae', minWidth: '52px', textAlign: 'center' }}>{bpm} BPM</span>
              <button onClick={() => setBpm(bpm + 5)} title="Increase BPM" className="h-ghost" style={{ width: '20px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: '#8a7f72', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color .12s' }}>+</button>
            </div>
            <button onClick={clear} title="Clear progression" className="h-ghost" style={{ fontSize: '11.5px', color: '#8a7f72', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', marginLeft: '4px', transition: 'color .12s' }}>
              Clear
            </button>
          </div>
        </div>

        {/* Track area */}
        <div style={{
          display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
          minHeight: '80px', padding: '12px 11px',
          background: '#100c09', border: '1px solid #221b14', borderRadius: '11px',
        }}>
          {progEmpty && ec === 'new' ? (
            <NewSlotCard isFocused onClick={() => {}} />
          ) : (
            <>
              {steps.map((step, idx) => {
                const chord    = resolved[idx]
                const isPlay   = activeStep === idx
                const isEdit   = ec === idx
                const deg      = step.degree
                const fill     = DEGREE_FILLS[Math.min(7, deg)] ?? DEGREE_FILLS[1]
                const numeral  = chord ? romanNumeral(deg - 1, chord.quality) : ROMAN[deg - 1] ?? `${deg}`
                const noteName = chord ? getPitchName(chord.root, 'auto', root) : ''
                const qualSym  = chord?.quality.symbol ?? ''
                const tipLabel = chord ? `${noteName}${chord.quality.name}` : ''

                return (
                  <div
                    key={idx}
                    onClick={() => handleStepClick(idx)}
                    title={tipLabel}
                    className={!isPlay && !isEdit ? 'h-card' : ''}
                    style={{
                      position: 'relative',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                      padding: '13px 16px 10px', borderRadius: '10px',
                      cursor: 'pointer', minWidth: '62px',
                      transition: 'border-color .12s, background .12s, box-shadow .12s',
                      border: isEdit
                        ? '1px solid #8a7f72'
                        : isPlay
                          ? '1px solid #8a6e46'
                          : '1px solid #2a221b',
                      background: isPlay ? '#2b1e10' : '#16120e',
                      boxShadow: isEdit ? '0 0 0 2px rgba(200,190,178,.12)' : 'none',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 0, left: '12px', right: '12px',
                      height: '3px', borderRadius: '0 0 2px 2px',
                      background: isPlay ? '#e0a85a' : 'transparent',
                    }} />
                    <span style={{
                      position: 'absolute', bottom: 0, left: '12px', right: '12px',
                      height: '2px', borderRadius: '2px 2px 0 0',
                      background: isEdit ? 'rgba(200,190,178,.5)' : 'transparent',
                    }} />
                    <span style={{
                      position: 'absolute', top: '5px', left: '8px',
                      fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                      color: isPlay ? '#e0a85a' : '#3f352a',
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '19px', fontWeight: 700, color: fill, lineHeight: 1, marginTop: '4px' }}>
                      {numeral}
                    </span>
                    <span style={{ fontSize: '13px', color: isPlay ? '#f1ebe2' : isEdit ? '#c7bcae' : '#9a8f82', fontWeight: 700, lineHeight: 1.2, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                      {noteName}<span style={{ fontSize: '11px', fontWeight: 500, color: isPlay ? '#b3a89a' : '#6b6258' }}>{qualSym}</span>
                    </span>
                    <span
                      onClick={e => { e.stopPropagation(); removeAt(idx) }}
                      role="button"
                      aria-label="Remove"
                      title="Remove"
                      className="h-danger"
                      style={{
                        position: 'absolute', top: '-8px', right: '-7px',
                        width: '17px', height: '17px', borderRadius: '50%',
                        background: '#2a221b', color: '#8a7f72', fontSize: '12px',
                        lineHeight: '15px', textAlign: 'center',
                        border: '1px solid #100c09', cursor: 'pointer',
                        transition: 'background .12s, color .12s, border-color .12s',
                      }}
                    >
                      &#xd7;
                    </span>
                  </div>
                )
              })}

              <NewSlotCard
                isFocused={ec === 'new'}
                onClick={() => setEditCursor('new')}
              />
            </>
          )}
        </div>

        {/* Presets row */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '11px' }}>
          {COMMON_PROGRESSIONS.map(p => {
            const ok = p.steps.every(st => st.degree <= scaleLen)
            return (
              <button
                key={p.name}
                onClick={() => { if (ok) { loadPreset(p); setEditCursor('new') } }}
                title={ok ? `Load: ${p.name}` : 'Requires a 7-tone scale'}
                className={ok ? 'h-chip' : ''}
                style={{
                  fontSize: '11.5px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                  color: ok ? '#9a8f82' : '#3f352a',
                  background: '#1b150f', border: '1px solid #2a221b', borderRadius: '7px',
                  padding: '5px 10px',
                  cursor: ok ? 'pointer' : 'not-allowed',
                  opacity: ok ? 1 : 0.5,
                  transition: 'background .12s, border-color .12s, color .12s',
                }}
              >
                {p.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function NewSlotCard({ isFocused, onClick }: { isFocused: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      title="Add chord here"
      className="h-new-slot"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '62px', height: '70px', borderRadius: '10px',
        border: isFocused ? '1px dashed #7a6f64' : '1px dashed #2e2620',
        background: isFocused ? 'rgba(200,190,178,.04)' : 'transparent',
        cursor: 'pointer', flexShrink: 0,
        transition: 'border-color .12s, background .12s',
      }}
    >
      <span style={{
        fontSize: '22px', lineHeight: 1, fontWeight: 300,
        color: isFocused ? '#7a6f64' : '#3a3028',
        transition: 'color .12s',
      }}>
        +
      </span>
    </div>
  )
}
