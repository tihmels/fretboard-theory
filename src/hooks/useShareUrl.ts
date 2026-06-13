import { useEffect } from 'react'
import { useTheoryStore } from '../store/theory'
import { useViewStore } from '../store/view'
import { encodeUrlState, decodeUrlState } from '../utils/url'
import { SCALES_BY_ID } from '../theory/scales'

export function useShareUrl() {
  const root              = useTheoryStore(s => s.root)
  const scale             = useTheoryStore(s => s.scale)
  const chordQualityId    = useTheoryStore(s => s.chordQualityId)
  const setRoot           = useTheoryStore(s => s.setRoot)
  const setScale          = useTheoryStore(s => s.setScale)
  const setChordQualityId = useTheoryStore(s => s.setChordQualityId)
  const labelMode         = useViewStore(s => s.labelMode)
  const setLabelMode      = useViewStore(s => s.setLabelMode)

  // Hydrate stores from URL on first mount
  useEffect(() => {
    const parsed = decodeUrlState(window.location.search)
    if (parsed.root           !== undefined) setRoot(parsed.root)
    if (parsed.scaleId        != null) setScale(SCALES_BY_ID[parsed.scaleId] ?? null)
    if (parsed.chordQualityId !== undefined) setChordQualityId(parsed.chordQualityId)
    if (parsed.labelMode      !== undefined) setLabelMode(parsed.labelMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep URL in sync with store
  useEffect(() => {
    const qs = encodeUrlState({
      root,
      scaleId:        scale?.id ?? null,
      chordQualityId,
      labelMode,
    })
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }, [root, scale, chordQualityId, labelMode])
}
