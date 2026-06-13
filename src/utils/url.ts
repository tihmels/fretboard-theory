import type { PitchClass, LabelMode } from '../theory/types'
import { SCALES_BY_ID } from '../theory/scales'
import { CHORD_QUALITIES_BY_ID } from '../theory/chords'
import { parsePitchName, getPitchName } from '../theory/pitch'

export interface UrlState {
  root:           PitchClass
  scaleId:        string | null
  chordQualityId: string | null
  labelMode:      LabelMode
}

export function encodeUrlState(state: UrlState): string {
  const p = new URLSearchParams()
  p.set('root', getPitchName(state.root, 'auto', state.root))
  if (state.scaleId)        p.set('scale', state.scaleId)
  if (state.chordQualityId) p.set('chord', state.chordQualityId)
  if (state.labelMode !== 'note') p.set('label', state.labelMode)
  return p.toString()
}

export function decodeUrlState(search: string): Partial<UrlState> {
  const p   = new URLSearchParams(search)
  const out: Partial<UrlState> = {}

  const rootName = p.get('root')
  if (rootName !== null) {
    const pc = parsePitchName(rootName)
    if (pc !== null) out.root = pc
  }

  const scaleId = p.get('scale')
  if (scaleId && SCALES_BY_ID[scaleId]) out.scaleId = scaleId

  const chordQualityId = p.get('chord')
  if (chordQualityId && CHORD_QUALITIES_BY_ID[chordQualityId])
    out.chordQualityId = chordQualityId

  const label = p.get('label') as LabelMode | null
  if (label && ['note', 'degree', 'interval'].includes(label)) out.labelMode = label

  return out
}
