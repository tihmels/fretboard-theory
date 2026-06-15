import { useState, useMemo, useCallback, useRef } from 'react'
import { useTheoryStore } from '../../store/theory'
import { useProgressionStore, COMMON_PROGRESSIONS } from '../../store/progression'
import { useViewStore } from '../../store/view'
import { useSongsStore } from '../../store/songs'
import { getDiatonicChords, getSecondaryDominant } from '../../theory/chords'
import { resolveProgression } from '../../theory/progression'
import { getPitchName } from '../../theory/pitch'
import { DEGREE_FILLS } from '../fretboard/colors'
import { SongMatchesPanel } from './SongMatchesPanel'
import { playChord } from '../../audio/chordSynth'
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
  const beatIndex  = useProgressionStore(s => s.beatIndex)
  const playing    = useProgressionStore(s => s.playing)
  const bpm        = useProgressionStore(s => s.bpm)
  const loop       = useProgressionStore(s => s.loop)
  const jamMode    = useViewStore(s => s.jamMode)
  const setJamMode = useViewStore(s => s.setJamMode)
  const append         = useProgressionStore(s => s.append)
  const appendStep     = useProgressionStore(s => s.appendStep)
  const replaceAt      = useProgressionStore(s => s.replaceAt)
  const replaceAtStep  = useProgressionStore(s => s.replaceAtStep)
  const removeAt       = useProgressionStore(s => s.removeAt)
  const focusStep  = useProgressionStore(s => s.focusStep)
  const hoverStep  = useProgressionStore(s => s.hoverStep)
  const stepBy     = useProgressionStore(s => s.stepBy)
  const clear      = useProgressionStore(s => s.clear)
  const toggle     = useProgressionStore(s => s.toggle)
  const restart    = useProgressionStore(s => s.restart)
  const setBpm     = useProgressionStore(s => s.setBpm)
  const toggleLoop = useProgressionStore(s => s.toggleLoop)
  const loadPreset = useProgressionStore(s => s.loadPreset)

  const [editCursor, setEditCursor] = useState<number | 'new'>('new')
  const [saving,    setSaving]    = useState(false)
  const [saveName,  setSaveName]  = useState('')
  const saveInputRef = useRef<HTMLInputElement>(null)
  const saveSong     = useSongsStore(s => s.saveSong)

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

  const handleSecDomTap = (targetDeg: number, targetDegIdx: number) => {
    const targetChord = diatonic[targetDegIdx]
    if (!targetChord) return
    const secDom = getSecondaryDominant(targetChord.root)
    const step = { degree: targetDeg, chordOverride: secDom, secondaryDominantOf: targetDeg }
    if (ec === 'new') {
      const newIdx = steps.length
      appendStep(step)
      focusStep(newIdx)
    } else {
      replaceAtStep(ec, step)
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

  const handleStepClick = useCallback((idx: number) => {
    const alreadySelected = ec === idx && activeStep === idx
    setEditCursor(idx)
    focusStep(idx)
    if (alreadySelected) {
      const chord = useProgressionStore.getState().activeChord()
      if (chord) playChord(chord.root, chord.quality.pattern)
    }
  }, [ec, activeStep, focusStep])

  return (
    <div style={{
      flexShrink: 0, borderTop: '1px solid var(--border-subtle)',
      background: '#13100c',
      ...(jamMode
        ? { padding: '14px 40px 20px', display: 'flex', flexDirection: 'column', gap: 0 }
        : { padding: '16px 40px 18px', display: 'flex', gap: '36px', flexWrap: 'wrap', alignItems: 'flex-start' }
      ),
    }}>

      {jamMode ? (
        <JamView
          steps={steps}
          resolved={resolved}
          activeStep={activeStep}
          beatIndex={beatIndex}
          playing={playing}
          root={root}
          ec={ec}
          hoverStep={hoverStep}
          handleStepClick={handleStepClick}
          removeAt={removeAt}
          restart={restart}
          stepBy={stepBy}
          toggle={toggle}
          toggleLoop={toggleLoop}
          setBpm={setBpm}
          bpm={bpm}
          loop={loop}
          playing2={playing}
          progEmpty={progEmpty}
          progPos={progPos}
          jamMode={jamMode}
          setJamMode={setJamMode}
          saving={saving}
          setSaving={setSaving}
          setSaveName={setSaveName}
          saveInputRef={saveInputRef}
          saveName={saveName}
          saveSong={saveSong}
        />
      ) : (
      <>
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
          <>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
              {diatonic.map((chord, i) => {
                const deg      = i + 1
                const fill     = DEGREE_FILLS[deg] ?? DEGREE_FILLS[1]
                const rootName = getPitchName(chord.root, 'auto', root)
                const numeral  = romanNumeral(i, chord.quality)
                const isActive = activeStep != null && steps[activeStep]?.degree === deg && steps[activeStep]?.secondaryDominantOf == null

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

            {/* Secondary dominants row */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '9.5px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#4a4136', marginBottom: '7px' }}>
                Secondary dominants
              </div>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                {/* V/ii through V/vi = target degrees 2–6 */}
                {[1, 2, 3, 4, 5].map(targetDegIdx => {
                  const targetDeg   = targetDegIdx + 1   // 2–6
                  const targetChord = diatonic[targetDegIdx]
                  if (!targetChord) return null
                  const secDom    = getSecondaryDominant(targetChord.root)
                  const secName   = getPitchName(secDom.root, 'auto', root)
                  const fill      = DEGREE_FILLS[targetDeg] ?? DEGREE_FILLS[1]
                  const targetRn  = ROMAN[targetDegIdx] ?? `${targetDeg}`
                  const isActive  = activeStep != null && steps[activeStep]?.secondaryDominantOf === targetDeg

                  return (
                    <button
                      key={targetDeg}
                      onClick={() => handleSecDomTap(targetDeg, targetDegIdx)}
                      title={`${secName}7 → resolves to ${getPitchName(targetChord.root, 'auto', root)} (V/${targetRn})`}
                      className={!isActive ? 'h-chord' : ''}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                        padding: '7px 12px', borderRadius: '10px',
                        border: `1px solid ${isActive ? '#5a4632' : '#221c15'}`,
                        background: isActive ? '#2a2017' : '#161009',
                        cursor: 'pointer', minWidth: '52px',
                        transition: 'background .12s, border-color .12s',
                      }}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: fill, lineHeight: 1, opacity: 0.85 }}>
                        V/{targetRn}
                      </span>
                      <span style={{ fontSize: '11.5px', color: isActive ? '#ede6dd' : '#6b6258', fontWeight: 600 }}>
                        {secName}7
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
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
            {!progEmpty && (
              <button
                onClick={() => { setSaving(s => !s); setSaveName(''); setTimeout(() => saveInputRef.current?.focus(), 50) }}
                title="Save progression as a song"
                className="h-ghost"
                style={{ fontSize: '11.5px', color: saving ? '#e0a85a' : '#8a7f72', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', marginLeft: '2px', transition: 'color .12s' }}
              >
                Save…
              </button>
            )}
            {!progEmpty && (
              <button
                onClick={() => setJamMode(!jamMode)}
                title={jamMode ? 'Exit jam mode' : 'Jam mode — large chord cards for playing along'}
                className="h-ghost"
                style={{
                  fontSize: '11.5px', fontWeight: 700, fontFamily: 'inherit',
                  padding: '3px 9px', borderRadius: '7px', marginLeft: '4px',
                  border: `1px solid ${jamMode ? 'rgba(224,168,90,.45)' : '#2a221b'}`,
                  background: jamMode ? 'rgba(224,168,90,.12)' : 'transparent',
                  color: jamMode ? '#e0a85a' : '#6b6258',
                  cursor: 'pointer',
                  transition: 'background .12s, border-color .12s, color .12s',
                }}
              >
                Jam
              </button>
            )}
          </div>
        </div>

        {/* Save form */}
        {saving && (
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', alignItems: 'center' }}>
            <input
              ref={saveInputRef}
              type="text"
              value={saveName}
              onChange={e => setSaveName(e.currentTarget.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && saveName.trim()) {
                  saveSong(saveName)
                  setSaving(false)
                  setSaveName('')
                }
                if (e.key === 'Escape') { setSaving(false); setSaveName('') }
              }}
              placeholder="Song name…"
              style={{
                flex: 1, height: '28px', borderRadius: '7px',
                border: '1px solid #3a2e22', background: '#16120e',
                color: '#ede6dd', padding: '0 10px',
                fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', outline: 'none',
              }}
            />
            <button
              onClick={() => { if (saveName.trim()) { saveSong(saveName); setSaving(false); setSaveName('') } }}
              disabled={!saveName.trim()}
              className={saveName.trim() ? 'h-icon' : ''}
              style={{
                height: '28px', padding: '0 12px', borderRadius: '7px',
                border: '1px solid #3a2e22',
                background: saveName.trim() ? '#231b13' : '#1b150f',
                color: saveName.trim() ? '#ede6dd' : '#4a4136',
                cursor: saveName.trim() ? 'pointer' : 'not-allowed',
                fontSize: '11.5px', fontWeight: 700, fontFamily: 'inherit',
                transition: 'background .12s, color .12s',
              }}
            >
              Save
            </button>
            <button
              onClick={() => { setSaving(false); setSaveName('') }}
              className="h-ghost"
              style={{ height: '28px', padding: '0 8px', background: 'none', border: 'none', color: '#574d42', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', transition: 'color .12s' }}
            >
              ×
            </button>
          </div>
        )}

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
                const secDomOf = step.secondaryDominantOf
                const fill     = DEGREE_FILLS[Math.min(7, secDomOf ?? deg)] ?? DEGREE_FILLS[1]
                const targetRn = secDomOf != null ? (ROMAN[secDomOf - 1] ?? `${secDomOf}`) : null
                const numeral  = targetRn != null
                  ? `V/${targetRn}`
                  : (chord ? romanNumeral(deg - 1, chord.quality) : ROMAN[deg - 1] ?? `${deg}`)
                const noteName = chord ? getPitchName(chord.root, 'auto', root) : ''
                const qualSym  = chord?.quality.symbol ?? ''
                const tipLabel = chord ? `${noteName}${chord.quality.name}` : ''

                return (
                  <div
                    key={idx}
                    onClick={() => handleStepClick(idx)}
                    onMouseEnter={() => { if (chord) hoverStep(idx) }}
                    onMouseLeave={() => hoverStep(null)}
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
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: secDomOf != null ? '13px' : '19px', fontWeight: 700, color: fill, lineHeight: 1, marginTop: '4px' }}>
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

        <SongMatchesPanel />
      </div>
      </>
      )}
    </div>
  )
}

// ── Jam View ────────────────────────────────────────────────────────────────

interface JamViewProps {
  steps: ReturnType<typeof useProgressionStore.getState>['steps']
  resolved: ReturnType<typeof useProgressionStore.getState>['resolved'] extends () => infer R ? R : never
  activeStep: number | null
  beatIndex: number
  playing: boolean
  root: import('../../theory/types').PitchClass
  ec: number | 'new'
  hoverStep: (i: number | null) => void
  handleStepClick: (i: number) => void
  removeAt: (i: number) => void
  restart: () => void
  stepBy: (dir: 1 | -1) => void
  toggle: () => void
  toggleLoop: () => void
  setBpm: (bpm: number) => void
  bpm: number
  loop: boolean
  playing2: boolean
  progEmpty: boolean
  progPos: string
  jamMode: boolean
  setJamMode: (v: boolean) => void
  saving: boolean
  setSaving: React.Dispatch<React.SetStateAction<boolean>>
  setSaveName: React.Dispatch<React.SetStateAction<string>>
  saveInputRef: React.RefObject<HTMLInputElement | null>
  saveName: string
  saveSong: (name: string) => void
}

function JamView({
  steps, resolved, activeStep, beatIndex, playing, root,
  hoverStep, handleStepClick, removeAt,
  restart, stepBy, toggle, toggleLoop, setBpm, bpm, loop,
  progEmpty, progPos, setJamMode,
  saving, setSaving, setSaveName, saveInputRef, saveName, saveSong,
}: JamViewProps) {
  const BTN_JAM: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px', fontSize: '11px',
    color: '#9a8f82', background: '#1b150f',
    border: '1px solid #2a221b', borderRadius: '8px',
    cursor: 'pointer', fontFamily: 'inherit',
    transition: 'background .12s, color .12s',
  }

  return (
    <>
      {/* Transport header — same as normal mode */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', gap: '10px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b6258' }}>
            Progression
          </span>
          <span style={{ fontSize: '10.5px', fontFamily: "'JetBrains Mono', monospace", color: '#574d42', fontWeight: 600 }}>
            {progPos}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={restart} style={BTN_JAM} className="h-icon" title="Restart">&#x23EE;</button>
          <button onClick={() => stepBy(-1)} style={BTN_JAM} className="h-icon" title="Previous">&#x25C0;</button>
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
          <button onClick={() => stepBy(1)} style={BTN_JAM} className="h-icon" title="Next">&#x25B6;</button>
          <button
            onClick={toggleLoop}
            title={loop ? 'Loop: on' : 'Loop: off'}
            className="h-icon"
            style={{ ...BTN_JAM, color: loop ? '#e0a85a' : '#6b6258', background: loop ? 'rgba(224,168,90,.12)' : '#1b150f', border: `1px solid ${loop ? 'rgba(224,168,90,.4)' : '#2a221b'}`, fontSize: '14px' }}
          >
            &#x21BB;
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '4px', background: '#1b150f', border: '1px solid #2a221b', borderRadius: '8px', padding: '0 3px' }}>
            <button onClick={() => setBpm(bpm - 5)} className="h-ghost" style={{ width: '20px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: '#8a7f72', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color .12s' }}>&#x2212;</button>
            <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#c7bcae', minWidth: '52px', textAlign: 'center' }}>{bpm} BPM</span>
            <button onClick={() => setBpm(bpm + 5)} className="h-ghost" style={{ width: '20px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', color: '#8a7f72', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color .12s' }}>+</button>
          </div>
          <button onClick={() => { setSaving(s => !s); setSaveName(''); setTimeout(() => saveInputRef.current?.focus(), 50) }} className="h-ghost" style={{ fontSize: '11.5px', color: saving ? '#e0a85a' : '#8a7f72', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', marginLeft: '4px', transition: 'color .12s' }}>
            Save…
          </button>
          <button
            onClick={() => setJamMode(false)}
            className="h-ghost"
            style={{ fontSize: '11.5px', fontWeight: 700, fontFamily: 'inherit', padding: '3px 9px', borderRadius: '7px', marginLeft: '4px', border: '1px solid rgba(224,168,90,.45)', background: 'rgba(224,168,90,.12)', color: '#e0a85a', cursor: 'pointer', transition: 'background .12s, border-color .12s, color .12s' }}
          >
            Jam
          </button>
        </div>
      </div>

      {/* Save form */}
      {saving && (
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
          <input
            ref={saveInputRef}
            type="text" value={saveName}
            onChange={e => setSaveName(e.currentTarget.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && saveName.trim()) { saveSong(saveName); setSaving(false); setSaveName('') }
              if (e.key === 'Escape') { setSaving(false); setSaveName('') }
            }}
            placeholder="Song name…"
            style={{ flex: 1, height: '28px', borderRadius: '7px', border: '1px solid #3a2e22', background: '#16120e', color: '#ede6dd', padding: '0 10px', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', outline: 'none' }}
          />
          <button onClick={() => { if (saveName.trim()) { saveSong(saveName); setSaving(false); setSaveName('') } }} disabled={!saveName.trim()} className={saveName.trim() ? 'h-icon' : ''} style={{ height: '28px', padding: '0 12px', borderRadius: '7px', border: '1px solid #3a2e22', background: saveName.trim() ? '#231b13' : '#1b150f', color: saveName.trim() ? '#ede6dd' : '#4a4136', cursor: saveName.trim() ? 'pointer' : 'not-allowed', fontSize: '11.5px', fontWeight: 700, fontFamily: 'inherit', transition: 'background .12s, color .12s' }}>Save</button>
          <button onClick={() => { setSaving(false); setSaveName('') }} className="h-ghost" style={{ height: '28px', padding: '0 8px', background: 'none', border: 'none', color: '#574d42', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit', transition: 'color .12s' }}>×</button>
        </div>
      )}

      {/* Large chord cards */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {steps.map((step, idx) => {
          const chord    = resolved[idx]
          const isPlay   = activeStep === idx
          const deg      = step.degree
          const secDomOf = step.secondaryDominantOf
          const fill     = DEGREE_FILLS[Math.min(7, secDomOf ?? deg)] ?? DEGREE_FILLS[1]
          const targetRn = secDomOf != null ? (ROMAN[secDomOf - 1] ?? `${secDomOf}`) : null
          const numeral  = targetRn != null
            ? `V/${targetRn}`
            : (chord ? romanNumeral(deg - 1, chord.quality) : ROMAN[deg - 1] ?? `${deg}`)
          const noteName = chord ? getPitchName(chord.root, 'auto', root) : ''
          const qualSym  = chord?.quality.symbol ?? ''

          return (
            <div
              key={idx}
              onClick={() => handleStepClick(idx)}
              onMouseEnter={() => { if (chord) hoverStep(idx) }}
              onMouseLeave={() => hoverStep(null)}
              title={chord ? `${noteName}${chord.quality.name}` : ''}
              className={!isPlay ? 'h-card' : ''}
              style={{
                position: 'relative',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                padding: '24px 28px 18px', borderRadius: '14px',
                cursor: 'pointer', minWidth: '100px',
                transition: 'border-color .12s, background .12s, box-shadow .12s',
                border: isPlay ? '1px solid #8a6e46' : '1px solid #2a221b',
                background: isPlay ? '#2b1e10' : '#16120e',
              }}
            >
              {/* Play bar */}
              <span style={{ position: 'absolute', top: 0, left: '14px', right: '14px', height: '3px', borderRadius: '0 0 2px 2px', background: isPlay ? '#e0a85a' : 'transparent' }} />

              {/* Step number */}
              <span style={{ position: 'absolute', top: '6px', left: '10px', fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: isPlay ? '#e0a85a' : '#3f352a' }}>
                {idx + 1}
              </span>

              {/* Roman numeral */}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: secDomOf != null ? '20px' : '32px', fontWeight: 700, color: fill, lineHeight: 1, marginTop: '6px' }}>
                {numeral}
              </span>

              {/* Chord name */}
              <span style={{ fontSize: '17px', color: isPlay ? '#f1ebe2' : '#8a7f72', fontWeight: 700, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'nowrap' }}>
                {noteName}<span style={{ fontSize: '13px', fontWeight: 500, color: isPlay ? '#b3a89a' : '#6b6258' }}>{qualSym}</span>
              </span>

              {/* Beat dots */}
              <div style={{ display: 'flex', gap: '5px', marginTop: '2px' }}>
                {[0, 1, 2, 3].map(beat => (
                  <span
                    key={beat}
                    style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      transition: 'background .08s',
                      background: isPlay && playing && beat === beatIndex
                        ? fill
                        : isPlay && !playing && beat === 0
                          ? `${fill}55`
                          : '#211a13',
                    }}
                  />
                ))}
              </div>

              {/* Remove */}
              <span
                onClick={e => { e.stopPropagation(); removeAt(idx) }}
                role="button" aria-label="Remove" title="Remove"
                className="h-danger"
                style={{ position: 'absolute', top: '-8px', right: '-7px', width: '17px', height: '17px', borderRadius: '50%', background: '#2a221b', color: '#8a7f72', fontSize: '12px', lineHeight: '15px', textAlign: 'center', border: '1px solid #100c09', cursor: 'pointer', transition: 'background .12s, color .12s, border-color .12s' }}
              >
                &#xd7;
              </span>
            </div>
          )
        })}
      </div>
    </>
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
