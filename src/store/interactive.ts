import { create } from 'zustand'
import type { PitchClass } from '../theory/types'

export interface PinnedNote {
  string: number
  fret:   number
  pc:     PitchClass
  midi:   number
}

export const POSITIONS = [
  { lo: 0,  hi: 4,  label: '0–4'   },
  { lo: 2,  hi: 6,  label: '2–6'   },
  { lo: 4,  hi: 8,  label: '4–8'   },
  { lo: 7,  hi: 11, label: '7–11'  },
  { lo: 9,  hi: 13, label: '9–13'  },
  { lo: 12, hi: 15, label: '12–15' },
] as const

interface InteractiveState {
  hoverPc:      PitchClass | null
  posIdx:       number | null
  identify:     boolean
  voicingMode:  boolean
  pinned:       PinnedNote[]
}

interface InteractiveActions {
  setHoverPc:        (pc: PitchClass | null) => void
  setPosIdx:         (idx: number | null)    => void
  toggleIdentify:    ()                      => void
  toggleVoicingMode: ()                      => void
  togglePin:         (note: PinnedNote)      => void
  clearPins:         ()                      => void
}

export const useInteractiveStore = create<InteractiveState & InteractiveActions>(set => ({
  hoverPc:     null,
  posIdx:      null,
  identify:    false,
  voicingMode: false,
  pinned:      [],

  setHoverPc:        pc  => set({ hoverPc: pc }),
  setPosIdx:         idx => set({ posIdx: idx }),
  toggleIdentify:    ()  => set(s => ({ identify: !s.identify, pinned: [] })),
  toggleVoicingMode: ()  => set(s => ({ voicingMode: !s.voicingMode })),
  clearPins:         ()  => set({ pinned: [] }),

  togglePin: note => set(s => {
    const exists = s.pinned.some(p => p.string === note.string && p.fret === note.fret)
    return {
      pinned: exists
        ? s.pinned.filter(p => !(p.string === note.string && p.fret === note.fret))
        : [...s.pinned, note],
    }
  }),
}))
