import { describe, it, expect } from 'vitest'
import { CAGED_SHAPES, getCAGEDVoicings } from '../cagedShapes'
import type { CAGEDShapeName, CAGEDVoicing } from '../cagedShapes'
import type { PitchClass } from '../types'

// Standard tuning: E2 A2 D3 G3 B3 E4
const STD = [40, 45, 50, 55, 59, 64]

// Pitch-class names for readable assertions
const PC_NAME: Record<number, string> = {
  0:'C', 1:'C#', 2:'D', 3:'Eb', 4:'E', 5:'F', 6:'F#', 7:'G', 8:'Ab', 9:'A', 10:'Bb', 11:'B',
}

function findVoicing(voicings: CAGEDVoicing[], name: CAGEDShapeName, rootFret: number) {
  return voicings.find(v => v.shape.name === name && v.rootFret === rootFret)
}

/** Verify that every cell in a voicing produces the expected interval from root. */
function assertAllIntervalsCorrect(voicing: CAGEDVoicing, root: PitchClass) {
  for (const key of voicing.cells) {
    const [siStr, fretStr] = key.split('-')
    const si   = parseInt(siStr, 10)
    const fret = parseInt(fretStr, 10)
    const pc   = (STD[si] + fret) % 12
    const interval = (pc - root + 12) % 12
    expect(
      [0, 4, 7].includes(interval),
      `cell ${key}: PC=${PC_NAME[pc]} gives interval ${interval} from ${PC_NAME[root]} — not in major triad`,
    ).toBe(true)
  }
}

// ─── Shape definitions ────────────────────────────────────────────────────────

describe('CAGED_SHAPES definitions', () => {
  it('contains exactly 5 shapes with distinct names', () => {
    const names = CAGED_SHAPES.map(s => s.name)
    expect(new Set(names).size).toBe(5)
    expect(names.sort()).toEqual(['A','C','D','E','G'])
  })

  it('each shape has a unique color', () => {
    const colors = CAGED_SHAPES.map(s => s.color)
    expect(new Set(colors).size).toBe(5)
  })

  it('E shape: 6 strings, root on string 0', () => {
    const e = CAGED_SHAPES.find(s => s.name === 'E')!
    expect(e.rootStringIdx).toBe(0)
    expect(e.strings).toHaveLength(6)
  })

  it('A shape: 5 strings, root on string 1', () => {
    const a = CAGED_SHAPES.find(s => s.name === 'A')!
    expect(a.rootStringIdx).toBe(1)
    expect(a.strings).toHaveLength(5)
  })

  it('G shape: 6 strings, root on string 0', () => {
    const g = CAGED_SHAPES.find(s => s.name === 'G')!
    expect(g.rootStringIdx).toBe(0)
    expect(g.strings).toHaveLength(6)
  })

  it('C shape: 5 strings, root on string 1', () => {
    const c = CAGED_SHAPES.find(s => s.name === 'C')!
    expect(c.rootStringIdx).toBe(1)
    expect(c.strings).toHaveLength(5)
  })

  it('D shape: 4 strings, root on string 2', () => {
    const d = CAGED_SHAPES.find(s => s.name === 'D')!
    expect(d.rootStringIdx).toBe(2)
    expect(d.strings).toHaveLength(4)
  })

  it('G shape has negative fret offsets on strings 1–4', () => {
    const g = CAGED_SHAPES.find(s => s.name === 'G')!
    const inner = g.strings.filter(s => s.stringIdx >= 1 && s.stringIdx <= 4)
    expect(inner.every(s => s.fretOffset < 0)).toBe(true)
  })

  it('C shape has negative fret offsets on strings 2–5', () => {
    const c = CAGED_SHAPES.find(s => s.name === 'C')!
    const higher = c.strings.filter(s => s.stringIdx >= 2)
    expect(higher.every(s => s.fretOffset < 0)).toBe(true)
  })
})

// ─── E shape voicings ─────────────────────────────────────────────────────────

describe('E shape voicings', () => {
  it('E major at open position: root fret 0', () => {
    const voicings = getCAGEDVoicings(4, STD)
    const v = findVoicing(voicings, 'E', 0)
    expect(v).toBeDefined()
    expect(v!.cells).toEqual(new Set(['0-0','1-2','2-2','3-1','4-0','5-0']))
  })

  it('E major open position: all 6 cells are major-triad tones', () => {
    const voicings = getCAGEDVoicings(4, STD)
    const v = findVoicing(voicings, 'E', 0)!
    assertAllIntervalsCorrect(v, 4)
  })

  it('A major E shape at fret 5 (barre)', () => {
    const voicings = getCAGEDVoicings(9, STD)
    const v = findVoicing(voicings, 'E', 5)
    expect(v).toBeDefined()
    expect(v!.cells).toEqual(new Set(['0-5','1-7','2-7','3-6','4-5','5-5']))
  })

  it('A major E shape barre: all cells are major-triad tones', () => {
    const voicings = getCAGEDVoicings(9, STD)
    const v = findVoicing(voicings, 'E', 5)!
    assertAllIntervalsCorrect(v, 9)
  })

  it('G major E shape at fret 3', () => {
    const voicings = getCAGEDVoicings(7, STD)
    const v = findVoicing(voicings, 'E', 3)
    expect(v).toBeDefined()
    expect(v!.cells).toEqual(new Set(['0-3','1-5','2-5','3-4','4-3','5-3']))
  })

  it('C major E shape at fret 8', () => {
    const voicings = getCAGEDVoicings(0, STD)
    const v = findVoicing(voicings, 'E', 8)
    expect(v).toBeDefined()
    assertAllIntervalsCorrect(v!, 0)
  })

  it('E shape is valid for all 12 roots', () => {
    for (let root = 0; root < 12; root++) {
      const voicings = getCAGEDVoicings(root as PitchClass, STD)
      const eVoicings = voicings.filter(v => v.shape.name === 'E')
      expect(eVoicings.length, `root ${root}: expected at least one E shape`).toBeGreaterThan(0)
    }
  })

  it('E shape has exactly 6 cells', () => {
    const voicings = getCAGEDVoicings(4, STD)
    const v = findVoicing(voicings, 'E', 0)!
    expect(v.cells.size).toBe(6)
  })
})

// ─── A shape voicings ─────────────────────────────────────────────────────────

describe('A shape voicings', () => {
  it('A major at open position: root fret 0 on A string', () => {
    const voicings = getCAGEDVoicings(9, STD)
    const v = findVoicing(voicings, 'A', 0)
    expect(v).toBeDefined()
    expect(v!.cells).toEqual(new Set(['1-0','2-2','3-2','4-2','5-0']))
  })

  it('A major open position: all 5 cells are major-triad tones', () => {
    const voicings = getCAGEDVoicings(9, STD)
    const v = findVoicing(voicings, 'A', 0)!
    assertAllIntervalsCorrect(v, 9)
  })

  it('C major A shape at fret 3', () => {
    const voicings = getCAGEDVoicings(0, STD)
    const v = findVoicing(voicings, 'A', 3)
    expect(v).toBeDefined()
    expect(v!.cells).toEqual(new Set(['1-3','2-5','3-5','4-5','5-3']))
  })

  it('C major A shape: all cells are major-triad tones', () => {
    const voicings = getCAGEDVoicings(0, STD)
    const v = findVoicing(voicings, 'A', 3)!
    assertAllIntervalsCorrect(v, 0)
  })

  it('G major A shape at fret 10', () => {
    const voicings = getCAGEDVoicings(7, STD)
    const v = findVoicing(voicings, 'A', 10)
    expect(v).toBeDefined()
    assertAllIntervalsCorrect(v!, 7)
  })

  it('A shape is valid for all 12 roots', () => {
    for (let root = 0; root < 12; root++) {
      const voicings = getCAGEDVoicings(root as PitchClass, STD)
      const aVoicings = voicings.filter(v => v.shape.name === 'A')
      expect(aVoicings.length, `root ${root}: expected at least one A shape`).toBeGreaterThan(0)
    }
  })

  it('A shape has exactly 5 cells', () => {
    const voicings = getCAGEDVoicings(9, STD)
    const v = findVoicing(voicings, 'A', 0)!
    expect(v.cells.size).toBe(5)
  })
})

// ─── G shape voicings ─────────────────────────────────────────────────────────

describe('G shape voicings', () => {
  it('G major open position: root fret 3 on low E', () => {
    const voicings = getCAGEDVoicings(7, STD)
    const v = findVoicing(voicings, 'G', 3)
    expect(v).toBeDefined()
    // Open G: 3 2 0 0 0 3
    expect(v!.cells).toEqual(new Set(['0-3','1-2','2-0','3-0','4-0','5-3']))
  })

  it('G major open position: all 6 cells are major-triad tones', () => {
    const voicings = getCAGEDVoicings(7, STD)
    const v = findVoicing(voicings, 'G', 3)!
    assertAllIntervalsCorrect(v, 7)
  })

  it('A major G shape at fret 5', () => {
    const voicings = getCAGEDVoicings(9, STD)
    const v = findVoicing(voicings, 'G', 5)
    expect(v).toBeDefined()
    expect(v!.cells).toEqual(new Set(['0-5','1-4','2-2','3-2','4-2','5-5']))
  })

  it('A major G shape: all cells are major-triad tones', () => {
    const voicings = getCAGEDVoicings(9, STD)
    const v = findVoicing(voicings, 'G', 5)!
    assertAllIntervalsCorrect(v, 9)
  })

  it('G shape absent for E major at fret 0 (rootFret=0, would need fret -3)', () => {
    const voicings = getCAGEDVoicings(4, STD)
    // E on low E = fret 0; G shape inner strings need fret -3 → invalid
    expect(findVoicing(voicings, 'G', 0)).toBeUndefined()
  })

  it('G shape absent for F major (rootFret=1) and F# major (rootFret=2)', () => {
    const fVoicings  = getCAGEDVoicings(5, STD)
    const fsVoicings = getCAGEDVoicings(6, STD)
    expect(findVoicing(fVoicings,  'G', 1)).toBeUndefined()
    expect(findVoicing(fsVoicings, 'G', 2)).toBeUndefined()
  })

  it('G shape present for Ab major (rootFret=4) and above', () => {
    const voicings = getCAGEDVoicings(8, STD)  // Ab = 8, low E fret 4
    const v = findVoicing(voicings, 'G', 4)
    expect(v).toBeDefined()
    assertAllIntervalsCorrect(v!, 8)
  })

  it('G shape has exactly 6 cells', () => {
    const voicings = getCAGEDVoicings(7, STD)
    const v = findVoicing(voicings, 'G', 3)!
    expect(v.cells.size).toBe(6)
  })
})

// ─── C shape voicings ─────────────────────────────────────────────────────────

describe('C shape voicings', () => {
  it('C major open position: root fret 3 on A string', () => {
    const voicings = getCAGEDVoicings(0, STD)
    const v = findVoicing(voicings, 'C', 3)
    expect(v).toBeDefined()
    // Open C: x 3 2 0 1 0
    expect(v!.cells).toEqual(new Set(['1-3','2-2','3-0','4-1','5-0']))
  })

  it('C major open position: all 5 cells are major-triad tones', () => {
    const voicings = getCAGEDVoicings(0, STD)
    const v = findVoicing(voicings, 'C', 3)!
    assertAllIntervalsCorrect(v, 0)
  })

  it('D major C shape at fret 5', () => {
    const voicings = getCAGEDVoicings(2, STD)
    const v = findVoicing(voicings, 'C', 5)
    expect(v).toBeDefined()
    // D shape C barre: x 5 4 2 3 2
    expect(v!.cells).toEqual(new Set(['1-5','2-4','3-2','4-3','5-2']))
  })

  it('D major C shape: all cells are major-triad tones', () => {
    const voicings = getCAGEDVoicings(2, STD)
    const v = findVoicing(voicings, 'C', 5)!
    assertAllIntervalsCorrect(v, 2)
  })

  it('C shape absent for Bb major (rootFret=1 on A string)', () => {
    // Bb on A string: (45+1)%12=10=Bb; rootFret=1; s3 at fret -2 → invalid
    const voicings = getCAGEDVoicings(10, STD)
    expect(findVoicing(voicings, 'C', 1)).toBeUndefined()
  })

  it('C shape absent for B major (rootFret=2 on A string)', () => {
    // B on A string: fret 2; s3 at fret -1 → invalid
    const voicings = getCAGEDVoicings(11, STD)
    expect(findVoicing(voicings, 'C', 2)).toBeUndefined()
  })

  it('C shape present for C# major (rootFret=4 on A string)', () => {
    const voicings = getCAGEDVoicings(1, STD)
    const v = findVoicing(voicings, 'C', 4)
    expect(v).toBeDefined()
    assertAllIntervalsCorrect(v!, 1)
  })

  it('C shape has exactly 5 cells', () => {
    const voicings = getCAGEDVoicings(0, STD)
    const v = findVoicing(voicings, 'C', 3)!
    expect(v.cells.size).toBe(5)
  })
})

// ─── D shape voicings ─────────────────────────────────────────────────────────

describe('D shape voicings', () => {
  it('D major at open position: root fret 0 on D string', () => {
    const voicings = getCAGEDVoicings(2, STD)
    const v = findVoicing(voicings, 'D', 0)
    expect(v).toBeDefined()
    // Open D: xx 0 2 3 2
    expect(v!.cells).toEqual(new Set(['2-0','3-2','4-3','5-2']))
  })

  it('D major open position: all 4 cells are major-triad tones', () => {
    const voicings = getCAGEDVoicings(2, STD)
    const v = findVoicing(voicings, 'D', 0)!
    assertAllIntervalsCorrect(v, 2)
  })

  it('E major D shape at fret 2', () => {
    const voicings = getCAGEDVoicings(4, STD)
    const v = findVoicing(voicings, 'D', 2)
    expect(v).toBeDefined()
    expect(v!.cells).toEqual(new Set(['2-2','3-4','4-5','5-4']))
  })

  it('E major D shape: all cells are major-triad tones', () => {
    const voicings = getCAGEDVoicings(4, STD)
    const v = findVoicing(voicings, 'D', 2)!
    assertAllIntervalsCorrect(v, 4)
  })

  it('G major D shape at fret 5', () => {
    const voicings = getCAGEDVoicings(7, STD)
    const v = findVoicing(voicings, 'D', 5)
    expect(v).toBeDefined()
    assertAllIntervalsCorrect(v!, 7)
  })

  it('D shape is valid for all 12 roots', () => {
    for (let root = 0; root < 12; root++) {
      const voicings = getCAGEDVoicings(root as PitchClass, STD)
      const dVoicings = voicings.filter(v => v.shape.name === 'D')
      expect(dVoicings.length, `root ${root}: expected at least one D shape`).toBeGreaterThan(0)
    }
  })

  it('D shape has exactly 4 cells', () => {
    const voicings = getCAGEDVoicings(2, STD)
    const v = findVoicing(voicings, 'D', 0)!
    expect(v.cells.size).toBe(4)
  })
})

// ─── Deduplication ────────────────────────────────────────────────────────────

describe('deduplication', () => {
  it('does not return two voicings of the same shape within 12 frets', () => {
    for (let root = 0; root < 12; root++) {
      const voicings = getCAGEDVoicings(root as PitchClass, STD)
      for (const name of ['C','A','G','E','D'] as CAGEDShapeName[]) {
        const group = voicings.filter(v => v.shape.name === name).map(v => v.rootFret).sort((a,b) => a-b)
        for (let i = 1; i < group.length; i++) {
          expect(
            group[i] - group[i-1],
            `root=${root} shape=${name}: voicings at frets ${group[i-1]} and ${group[i]} are too close`,
          ).toBeGreaterThanOrEqual(12)
        }
      }
    }
  })

  it('keeps second voicing when shapes are exactly 12 frets apart', () => {
    // E major: E shape at fret 0 and fret 12
    const voicings = getCAGEDVoicings(4, STD)
    expect(findVoicing(voicings, 'E', 0)).toBeDefined()
    expect(findVoicing(voicings, 'E', 12)).toBeDefined()
  })

  it('A major: E shape appears at fret 5 and fret 17', () => {
    const voicings = getCAGEDVoicings(9, STD)
    expect(findVoicing(voicings, 'E', 5)).toBeDefined()
    expect(findVoicing(voicings, 'E', 17)).toBeDefined()
  })
})

// ─── Interval correctness across all roots ───────────────────────────────────

describe('all cells are triad tones across roots', () => {
  it('every cell in every voicing for all 12 roots is a major-triad tone', () => {
    for (let root = 0; root < 12; root++) {
      const voicings = getCAGEDVoicings(root as PitchClass, STD)
      for (const v of voicings) {
        for (const key of v.cells) {
          const [siStr, fretStr] = key.split('-')
          const pc       = (STD[parseInt(siStr, 10)] + parseInt(fretStr, 10)) % 12
          const interval = (pc - root + 12) % 12
          expect(
            [0, 4, 7].includes(interval),
            `root=${root} shape=${v.shape.name} fret=${v.rootFret} cell=${key}: interval ${interval} is not in [0,4,7]`,
          ).toBe(true)
        }
      }
    }
  })
})

// ─── Full voicing set for specific keys ──────────────────────────────────────

describe('complete voicing sets', () => {
  it('G major returns all 5 shape types', () => {
    const voicings = getCAGEDVoicings(7, STD)
    const names = new Set(voicings.map(v => v.shape.name))
    expect(names.has('E')).toBe(true)
    expect(names.has('A')).toBe(true)
    expect(names.has('G')).toBe(true)
    expect(names.has('C')).toBe(true)
    expect(names.has('D')).toBe(true)
  })

  it('C major returns all 5 shape types', () => {
    const voicings = getCAGEDVoicings(0, STD)
    const names = new Set(voicings.map(v => v.shape.name))
    expect(names.size).toBe(5)
  })

  it('E major: G shape only appears at high frets (rootFret >= 12)', () => {
    const voicings = getCAGEDVoicings(4, STD)
    const gVoicings = voicings.filter(v => v.shape.name === 'G')
    // E on low E string = fret 0 (too low for G shape), next = fret 12
    expect(gVoicings.every(v => v.rootFret >= 12)).toBe(true)
  })

  it('A major: C shape only appears at high frets (rootFret >= 12)', () => {
    const voicings = getCAGEDVoicings(9, STD)
    const cVoicings = voicings.filter(v => v.shape.name === 'C')
    // A on A string = fret 0 (rootFret=0, s3 at -3 = invalid), next = fret 12
    expect(cVoicings.every(v => v.rootFret >= 12)).toBe(true)
  })

  it('root fret on designated root string is consistent with root pitch class', () => {
    for (let root = 0; root < 12; root++) {
      const voicings = getCAGEDVoicings(root as PitchClass, STD)
      for (const v of voicings) {
        const openMidi  = STD[v.shape.rootStringIdx]
        const actualPc  = (openMidi + v.rootFret) % 12
        expect(actualPc).toBe(root)
      }
    }
  })
})
