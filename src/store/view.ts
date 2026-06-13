import { create } from 'zustand'
import type { LabelMode } from '../theory/types'

interface ViewState {
  labelMode: LabelMode
}

interface ViewActions {
  setLabelMode: (mode: LabelMode) => void
}

export const useViewStore = create<ViewState & ViewActions>(set => ({
  labelMode:    'note',
  setLabelMode: labelMode => set({ labelMode }),
}))
