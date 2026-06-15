/**
 * CAGED chord shape system.
 *
 * Each shape is defined by its root string and a list of per-string entries.
 * `fretOffset` is relative to the root fret on `rootStringIdx` and can be
 * negative (G and C shapes have notes below the root fret on higher strings).
 * `interval` declares what the string MUST produce — a mismatch discards the
 * whole voicing rather than silently trimming it.
 *
 * All offsets are verified against standard tuning (E2 A2 D3 G3 B3 E4).
 */

import type { PitchClass } from './types'

export type CAGEDShapeName = 'C' | 'A' | 'G' | 'E' | 'D'

interface CAGEDStringDef {
  stringIdx:  number
  fretOffset: number      // semitones from rootFret; may be negative
  interval:   0 | 4 | 7  // expected interval from root — strict, not advisory
}

export interface CAGEDShape {
  name:          CAGEDShapeName
  color:         string
  rootStringIdx: number
  strings:       CAGEDStringDef[]
}

export const CAGED_SHAPES: CAGEDShape[] = [
  {
    // Open E: 022100 — root on strings 0, 2, 5; third on 3; fifth on 1, 4
    name:          'E',
    color:         '#e05a7a',
    rootStringIdx: 0,
    strings: [
      { stringIdx: 0, fretOffset:  0, interval: 0 },
      { stringIdx: 1, fretOffset:  2, interval: 7 },
      { stringIdx: 2, fretOffset:  2, interval: 0 },
      { stringIdx: 3, fretOffset:  1, interval: 4 },
      { stringIdx: 4, fretOffset:  0, interval: 7 },
      { stringIdx: 5, fretOffset:  0, interval: 0 },
    ],
  },
  {
    // Open D: xx0232 — root on D string (2); negative offsets not needed here
    name:          'D',
    color:         '#e09a30',
    rootStringIdx: 2,
    strings: [
      { stringIdx: 2, fretOffset:  0, interval: 0 },
      { stringIdx: 3, fretOffset:  2, interval: 7 },
      { stringIdx: 4, fretOffset:  3, interval: 0 },
      { stringIdx: 5, fretOffset:  2, interval: 4 },
    ],
  },
  {
    // Open C: x32010 — root on A string; strings 2–5 sit below root fret
    name:          'C',
    color:         '#a8c640',
    rootStringIdx: 1,
    strings: [
      { stringIdx: 1, fretOffset:  0, interval: 0 },
      { stringIdx: 2, fretOffset: -1, interval: 4 },
      { stringIdx: 3, fretOffset: -3, interval: 7 },
      { stringIdx: 4, fretOffset: -2, interval: 0 },
      { stringIdx: 5, fretOffset: -3, interval: 4 },
    ],
  },
  {
    // Open A: x02220 — root on A string; uniform +2 barre on middle strings
    name:          'A',
    color:         '#38c4d6',
    rootStringIdx: 1,
    strings: [
      { stringIdx: 1, fretOffset:  0, interval: 0 },
      { stringIdx: 2, fretOffset:  2, interval: 7 },
      { stringIdx: 3, fretOffset:  2, interval: 0 },
      { stringIdx: 4, fretOffset:  2, interval: 4 },
      { stringIdx: 5, fretOffset:  0, interval: 7 },
    ],
  },
  {
    // Open G: 320003 — root on low E and high e; strings 1–4 sit below root fret
    // Only playable when rootFret >= 3 (otherwise frets go negative → voicing discarded)
    name:          'G',
    color:         '#9a7fd6',
    rootStringIdx: 0,
    strings: [
      { stringIdx: 0, fretOffset:  0, interval: 0 },
      { stringIdx: 1, fretOffset: -1, interval: 4 },
      { stringIdx: 2, fretOffset: -3, interval: 7 },
      { stringIdx: 3, fretOffset: -3, interval: 0 },
      { stringIdx: 4, fretOffset: -3, interval: 4 },
      { stringIdx: 5, fretOffset:  0, interval: 0 },
    ],
  },
]

export interface CAGEDVoicing {
  shape:    CAGEDShape
  rootFret: number
  /** Set of "stringIdx-fret" keys for all notes in this shape. */
  cells:    Set<string>
}

/**
 * Given a chord root and tuning open notes, compute where each CAGED shape
 * lands on the neck for the first two octaves (frets 0–17).
 *
 * Returns at most one voicing per shape per 12-fret span.
 * A voicing is discarded if any string produces the wrong interval or goes
 * outside fret 0–22.
 */
export function getCAGEDVoicings(
  root: PitchClass,
  openNotes: number[],
): CAGEDVoicing[] {
  const voicings: CAGEDVoicing[] = []

  for (const shape of CAGED_SHAPES) {
    const openMidi = openNotes[shape.rootStringIdx]
    if (openMidi == null) continue

    for (let rootFret = 0; rootFret <= 17; rootFret++) {
      if ((openMidi + rootFret) % 12 !== root) continue

      const cells = new Set<string>()
      let valid = true

      for (const { stringIdx, fretOffset, interval } of shape.strings) {
        const noteFret = rootFret + fretOffset
        if (noteFret < 0 || noteFret > 22) { valid = false; break }
        const notePc = (openNotes[stringIdx] + noteFret) % 12
        if ((notePc - root + 12) % 12 !== interval) { valid = false; break }
        cells.add(`${stringIdx}-${noteFret}`)
      }

      if (valid) voicings.push({ shape, rootFret, cells })
    }
  }

  // Keep at most one voicing per shape per 12-fret span
  const seen = new Map<string, number>()
  return voicings.filter(v => {
    const prev = seen.get(v.shape.name)
    if (prev == null || v.rootFret - prev >= 12) {
      seen.set(v.shape.name, v.rootFret)
      return true
    }
    return false
  })
}
