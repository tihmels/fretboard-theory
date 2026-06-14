import { describe, it, expect } from 'vitest'
import { resolveProgression, COMMON_PROGRESSIONS } from '../progression'
import {
  hooktheoryBasicChildPathFromSteps,
  hooktheoryBasicDegreesFromSteps,
} from '../progressionSearch'
import { SCALES_BY_ID } from '../scales'
import { CHORD_QUALITIES_BY_ID } from '../chords'

const major = SCALES_BY_ID['major']

describe('resolveProgression', () => {
  it('resolves ii–V–I in C major to Dm7–G7–Cmaj7', () => {
    const prog = { steps: [{ degree: 2 }, { degree: 5 }, { degree: 1 }] }
    const chords = resolveProgression(0, major, prog)
    expect(chords).toHaveLength(3)
    expect(chords[0].root).toBe(2);  expect(chords[0].quality.id).toBe('min7')  // Dm7
    expect(chords[1].root).toBe(7);  expect(chords[1].quality.id).toBe('dom7')  // G7
    expect(chords[2].root).toBe(0);  expect(chords[2].quality.id).toBe('maj7')  // Cmaj7
  })

  it('uses chordOverride when provided', () => {
    const g7 = { root: 7 as const, quality: CHORD_QUALITIES_BY_ID['dom7'] }
    const prog = { steps: [{ degree: 1 }, { degree: 5, chordOverride: g7 }] }
    const chords = resolveProgression(0, major, prog)
    expect(chords[1]).toBe(g7)
  })

  it('throws when the scale cannot produce diatonic seventh chords', () => {
    const prog = { steps: [{ degree: 1 }] }
    expect(() => resolveProgression(0, SCALES_BY_ID['minor-pentatonic'], prog)).toThrow(RangeError)
  })

  it('throws when a progression degree is outside the scale', () => {
    const prog = { steps: [{ degree: 8 }] }
    expect(() => resolveProgression(0, major, prog)).toThrow(RangeError)
  })

  it('resolves 12-bar blues as dominant chords on I, IV, and V', () => {
    const blues = COMMON_PROGRESSIONS.find(prog => prog.name === '12-Bar Blues')
    expect(blues).toBeDefined()

    const chords = resolveProgression(0, major, blues!)
    expect(chords).toHaveLength(12)
    expect(chords.map(chord => chord.root)).toEqual([0,0,0,0,5,5,0,0,7,5,0,7])
    expect(chords.every(chord => chord.quality.id === 'dom7')).toBe(true)
  })
})

describe('COMMON_PROGRESSIONS', () => {
  it('contains at least the core progressions', () => {
    const names = COMMON_PROGRESSIONS.map(p => p.name)
    expect(names).toContain('ii–V–I')
    expect(names).toContain('I–IV–V–I')
    expect(names).toContain('I–V–vi–IV')
  })
})

describe('hooktheoryBasicChildPathFromSteps', () => {
  it('extracts basic Hooktheory degrees from progression steps', () => {
    expect(hooktheoryBasicDegreesFromSteps([{ degree: 1 }, { degree: 8 }, { degree: 5 }])).toEqual([1,5])
  })

  it('serializes progression degrees as a Hooktheory child path', () => {
    expect(hooktheoryBasicChildPathFromSteps([{ degree: 1 }, { degree: 4 }, { degree: 5 }, { degree: 1 }])).toBe('1,4,5,1')
  })

  it('uses simple chord IDs and does not encode exact chord qualities yet', () => {
    expect(hooktheoryBasicChildPathFromSteps([
      { degree: 1, qualityOverride: CHORD_QUALITIES_BY_ID['dom7'] },
      { degree: 4, qualityOverride: CHORD_QUALITIES_BY_ID['dom7'] },
    ])).toBe('1,4')
  })

  it('drops degrees outside the simple 1-7 Hooktheory search range', () => {
    expect(hooktheoryBasicChildPathFromSteps([{ degree: 1 }, { degree: 8 }, { degree: 5 }])).toBe('1,5')
  })
})
