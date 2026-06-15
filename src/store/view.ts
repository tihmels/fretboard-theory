import { create } from 'zustand'
import type { LabelMode } from '../theory/types'

interface ViewState {
  labelMode: LabelMode
  jamMode:   boolean
}

interface ViewActions {
  setLabelMode: (mode: LabelMode) => void
  setJamMode:   (v: boolean)      => void
}

export const useViewStore = create<ViewState & ViewActions>(set => ({
  labelMode:    'note',
  jamMode:      false,
  setLabelMode: labelMode => set({ labelMode }),
  setJamMode:   jamMode   => set({ jamMode }),
}))
