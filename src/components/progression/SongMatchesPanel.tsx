import { useMemo, useState, useEffect, useRef } from 'react'
import { useProgressionStore } from '../../store/progression'
import { useTheoryStore } from '../../store/theory'
import {
  fetchHooktheorySongMatches,
  fetchHooktheoryToken,
  resolveHooktheoryBasicChildPath,
  type HooktheorySongMatch,
} from '../../api/hooktheory'
import { lookupSongKey } from '../../api/getsongkey'
import { hooktheoryBasicDegreesFromSteps } from '../../theory/progressionSearch'
import { getPitchName } from '../../theory/pitch'
import type { ScaleDef } from '../../theory/types'

const TOKEN_KEY       = 'neckwise.hooktheoryToken'
const MIN_KEY_MATCHES = 5
const MAX_AUTO_PAGES  = 10

function loadToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) ?? '' } catch { return '' }
}
function saveToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* localStorage may be unavailable */ }
}

function scaleToMode(scale: ScaleDef | null): 1 | 0 | null {
  if (!scale) return null
  const maj = scale.pattern.includes(4)
  const min = scale.pattern.includes(3)
  if (maj && !min) return 1
  if (min && !maj) return 0
  return null
}

const INPUT: React.CSSProperties = {
  flex: '1 1 130px', minWidth: 0,
  height: '30px', borderRadius: '8px',
  border: '1px solid #2a221b', background: '#16120e',
  color: '#ede6dd', padding: '0 10px',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px', outline: 'none',
}

interface KeyCheck { inKey: boolean; tempo?: number }
interface KeyState  { key: string; map: Map<number, KeyCheck> }

export function SongMatchesPanel() {
  const steps   = useProgressionStore(s => s.steps)
  const degrees = useMemo(() => hooktheoryBasicDegreesFromSteps(steps), [steps])

  const root  = useTheoryStore(s => s.root)
  const scale = useTheoryStore(s => s.scale)
  const mode  = scaleToMode(scale)

  const [token,       setToken]       = useState(loadToken)
  const [open,        setOpen]        = useState(false)
  const [username,    setUsername]    = useState('')
  const [password,    setPassword]    = useState('')
  const [matches,     setMatches]     = useState<HooktheorySongMatch[]>([])
  const [page,        setPage]        = useState(1)
  const [loading,     setLoading]     = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [keyFilter,   setKeyFilter]   = useState(true)
  const [keyState,    setKeyState]    = useState<KeyState>({ key: '', map: new Map() })

  // Incremented on each new search; lets in-flight loops detect they've been cancelled
  const searchIdRef = useRef(0)

  const isAuthenticated = token.trim().length > 0
  const hasProgression  = degrees.length > 0
  const effectiveMode   = mode

  const thisKeyStr = effectiveMode !== null ? `${root}:${effectiveMode}` : ''
  const currentKeyCheckMap = useMemo<Map<number, KeyCheck>>(
    () => keyState.key === thisKeyStr ? keyState.map : new Map(),
    [keyState, thisKeyStr]
  )

  const displayMatches = useMemo(() => {
    if (!keyFilter || effectiveMode === null || currentKeyCheckMap.size === 0) return matches
    return matches.filter((_, i) => currentKeyCheckMap.get(i)?.inKey === true)
  }, [matches, keyFilter, effectiveMode, currentKeyCheckMap])

  const hasMore = matches.length > 0 && matches.length % 20 === 0

  const rootName = getPitchName(root, 'auto', root)
  const modeName = mode === 1 ? 'major' : mode === 0 ? 'minor' : null
  const keyLabel = modeName ? `${rootName} ${modeName}` : null
  const chipActive = keyFilter && effectiveMode !== null

  // ── Core search: sequential async loop, no effects involved ────────────
  async function runSearch(tok: string, shouldFilter: boolean) {
    const myId        = ++searchIdRef.current
    const stale       = () => myId !== searchIdRef.current
    const thisRoot    = root
    const thisMode    = effectiveMode
    const keyStr      = thisMode !== null ? `${thisRoot}:${thisMode}` : ''
    const filterOn    = shouldFilter && thisMode !== null

    setLoading(true)
    setError(null)
    setMatches([])
    setPage(1)
    setKeyState({ key: '', map: new Map() })

    let allMatches: HooktheorySongMatch[] = []
    const keyMap = new Map<number, KeyCheck>()

    try {
      const cp = await resolveHooktheoryBasicChildPath(tok, degrees)
      if (stale()) return

      let currentPage = 1

      while (true) {
        const results = await fetchHooktheorySongMatches(tok, cp, currentPage)
        if (stale()) return

        const startIdx = allMatches.length
        allMatches = [...allMatches, ...results]
        setMatches(allMatches)
        setPage(currentPage)

        if (filterOn) {
          const checks = await Promise.all(
            results.map((m, i) =>
              lookupSongKey(m.song, m.artist)
                .then(r => ({ i: startIdx + i, r }))
                .catch(() => ({ i: startIdx + i, r: null as null }))
            )
          )
          if (stale()) return

          for (const { i, r } of checks) {
            keyMap.set(i, {
              inKey: r !== null && r.pitchClass === thisRoot && r.mode === thisMode,
              tempo: r?.tempo,
            })
          }
          setKeyState({ key: keyStr, map: new Map(keyMap) })

          const inKeyCount = [...keyMap.values()].filter(c => c.inKey).length
          if (inKeyCount >= MIN_KEY_MATCHES || results.length < 20 || currentPage >= MAX_AUTO_PAGES) break
        } else {
          break
        }

        currentPage++
      }
    } catch (err) {
      if (!stale()) setError(err instanceof Error ? err.message : 'Could not fetch songs.')
    } finally {
      if (!stale()) setLoading(false)
    }
  }

  // Append one more page manually (for "More →" when auto-loop has already stopped)
  async function appendPage(tok: string) {
    const myId     = ++searchIdRef.current
    const stale    = () => myId !== searchIdRef.current
    const nextPage = page + 1
    const thisRoot = root
    const thisMode = effectiveMode
    const keyStr   = thisMode !== null ? `${thisRoot}:${thisMode}` : ''
    const filterOn = keyFilter && thisMode !== null

    setLoading(true)
    setError(null)

    try {
      const cp      = await resolveHooktheoryBasicChildPath(tok, degrees)
      const results = await fetchHooktheorySongMatches(tok, cp, nextPage)
      if (stale()) return

      const startIdx    = matches.length
      const allMatches  = [...matches, ...results]
      setMatches(allMatches)
      setPage(nextPage)

      if (filterOn) {
        const checks = await Promise.all(
          results.map((m, i) =>
            lookupSongKey(m.song, m.artist)
              .then(r => ({ i: startIdx + i, r }))
              .catch(() => ({ i: startIdx + i, r: null as null }))
          )
        )
        if (stale()) return

        const nextKeyMap = new Map(currentKeyCheckMap)
        for (const { i, r } of checks) {
          nextKeyMap.set(i, {
            inKey: r !== null && r.pitchClass === thisRoot && r.mode === thisMode,
            tempo: r?.tempo,
          })
        }
        setKeyState({ key: keyStr, map: nextKeyMap })
      }
    } catch (err) {
      if (!stale()) setError(err instanceof Error ? err.message : 'Could not fetch more songs.')
    } finally {
      if (!stale()) setLoading(false)
    }
  }

  async function signIn() {
    if (!username.trim() || !password || authLoading) return
    setAuthLoading(true)
    setError(null)
    try {
      const tok = await fetchHooktheoryToken(username.trim(), password)
      setToken(tok)
      saveToken(tok)
      setPassword('')
      await runSearch(tok, keyFilter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setAuthLoading(false)
    }
  }

  // ── Re-run search when degrees change ───────────────────────────────────
  const degreesKey     = degrees.join(',')
  const prevDegreesKey = useRef(degreesKey)
  // Capture latest values in a ref so the effect can call without being a dep
  const runRef = useRef({ token, keyFilter, open, isAuthenticated, degrees })
  useEffect(() => { runRef.current = { token, keyFilter, open, isAuthenticated, degrees } })

  useEffect(() => {
    if (degreesKey === prevDegreesKey.current) return
    prevDegreesKey.current = degreesKey
    const { token: tok, keyFilter: kf, open: o, isAuthenticated: auth, degrees: degs } = runRef.current
    if (!o || !auth || !degs.length) {
      // Reset state even when panel is closed
      searchIdRef.current++
      setMatches([])
      setPage(1)
      setError(null)
      setKeyState({ key: '', map: new Map() })
      return
    }
    runSearch(tok, kf)
  }, [degreesKey])

  function handleOpen() {
    setOpen(true)
    if (isAuthenticated && hasProgression && matches.length === 0 && !loading) {
      runSearch(token, keyFilter)
    }
  }

  function handleClose() { setOpen(false); setError(null) }

  function handleSignOut() {
    searchIdRef.current++  // cancel any in-flight search
    setToken(''); saveToken('')
    setMatches([]); setError(null); setLoading(false)
  }

  // ── Collapsed trigger row ───────────────────────────────────────────────
  if (!open) {
    return (
      <div style={{ marginTop: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <span style={{ fontSize: '11px', color: '#4a4136', fontWeight: 600 }}>
          Find songs that use this progression
        </span>
        <button
          onClick={handleOpen}
          disabled={!hasProgression}
          className={hasProgression ? 'h-chip' : ''}
          style={{
            fontSize: '11px', fontWeight: 700, fontFamily: 'inherit',
            padding: '4px 10px', borderRadius: '7px',
            border: '1px solid #2a221b', background: '#1b150f',
            color: hasProgression ? '#9a8f82' : '#3f352a',
            cursor: hasProgression ? 'pointer' : 'not-allowed',
            flexShrink: 0,
            transition: 'background .12s, border-color .12s, color .12s',
          }}
          title={hasProgression ? 'Search Hooktheory for matching songs' : 'Add a progression first'}
        >
          Find songs →
        </button>
      </div>
    )
  }

  // ── Expanded panel ──────────────────────────────────────────────────────
  return (
    <div style={{
      marginTop: '11px', padding: '12px 14px',
      background: '#100c09', border: '1px solid #221b14', borderRadius: '11px',
    }}>

      {/* Header */}
      <div
        onClick={handleClose} title="Collapse"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b6258', userSelect: 'none' }}>
            Song matches
          </span>
          {keyLabel && (
            <button
              onClick={e => { e.stopPropagation(); setKeyFilter(f => !f) }}
              title={chipActive
                ? (loading ? `Finding songs in ${keyLabel}…` : `Showing songs in ${keyLabel} — click to show all`)
                : `Click to filter to songs in ${keyLabel}`}
              style={{
                fontSize: '10px', fontWeight: 700, fontFamily: 'inherit',
                padding: '2px 7px', borderRadius: '5px',
                border: `1px solid ${chipActive ? '#5a3a2a' : '#2a221b'}`,
                background: chipActive ? '#1f1008' : 'transparent',
                color: chipActive ? (loading ? '#7a4a2a' : '#c87a3a') : '#574d42',
                cursor: 'pointer', letterSpacing: '.04em',
                transition: 'all .12s', userSelect: 'none',
              }}
            >
              {loading ? '…' : keyLabel}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isAuthenticated && (
            <button
              onClick={e => { e.stopPropagation(); handleSignOut() }}
              className="h-ghost"
              style={{ fontSize: '10.5px', color: '#574d42', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color .12s' }}
            >
              Sign out
            </button>
          )}
          <span style={{ fontSize: '16px', lineHeight: 1, color: '#574d42' }}>×</span>
        </div>
      </div>

      {/* Sign-in form */}
      {!isAuthenticated && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '11.5px', color: '#574d42', marginBottom: '9px', lineHeight: 1.5 }}>
            Sign in with your{' '}
            <a href="https://www.hooktheory.com" target="_blank" rel="noreferrer" style={{ color: '#8a7f72', textDecoration: 'underline' }}>
              Hooktheory
            </a>{' '}
            account to search their song database. Your token is saved locally.
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <input
              type="text" value={username}
              onChange={e => setUsername(e.currentTarget.value)}
              onKeyDown={e => e.key === 'Enter' && signIn()}
              placeholder="Username" autoComplete="username" style={INPUT}
            />
            <input
              type="password" value={password}
              onChange={e => setPassword(e.currentTarget.value)}
              onKeyDown={e => e.key === 'Enter' && signIn()}
              placeholder="Password" autoComplete="current-password" style={INPUT}
            />
            <button
              onClick={signIn}
              disabled={!username.trim() || !password || authLoading}
              className={username.trim() && password && !authLoading ? 'h-icon' : ''}
              style={{
                height: '30px', padding: '0 12px', borderRadius: '8px',
                border: '1px solid #3a2e22',
                background: username.trim() && password ? '#231b13' : '#1b150f',
                color: username.trim() && password ? '#ede6dd' : '#4a4136',
                cursor: username.trim() && password ? 'pointer' : 'not-allowed',
                fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                flexShrink: 0, transition: 'background .12s, color .12s',
              }}
            >
              {authLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: '#e0564f', fontSize: '12px', marginBottom: '10px' }}>{error}</div>
      )}

      {/* Loading indicator — shown alongside any already-arrived results */}
      {loading && (
        <div style={{ color: '#574d42', fontSize: '12px', textAlign: 'center', padding: displayMatches.length > 0 ? '6px 0' : '12px 0' }}>
          {chipActive ? `Finding songs in ${keyLabel}…` : 'Searching…'}
        </div>
      )}

      {/* Empty state */}
      {isAuthenticated && !loading && matches.length === 0 && !error && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px' }}>
          <button
            onClick={() => runSearch(token, keyFilter)} className="h-icon"
            style={{
              padding: '7px 16px', borderRadius: '8px',
              border: '1px solid #3a2e22', background: '#231b13',
              color: '#ede6dd', cursor: 'pointer',
              fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
            }}
          >
            Find songs
          </button>
        </div>
      )}

      {/* No filtered results */}
      {!loading && keyFilter && effectiveMode !== null && matches.length > 0 && displayMatches.length === 0 && (
        <div style={{ fontSize: '11.5px', color: '#574d42', textAlign: 'center', padding: '8px 0' }}>
          No songs found in {keyLabel}.
        </div>
      )}

      {/* Results — shown even while loading (progressive display) */}
      {displayMatches.length > 0 && (
        <>
          <div style={{ maxHeight: '200px', overflowY: 'auto', margin: '0 -2px' }}>
            {displayMatches.map((match, displayIdx) => {
              const originalIdx = matches.indexOf(match)
              const keyCheck    = currentKeyCheckMap.get(originalIdx)
              return (
                <a
                  key={`${match.artist}-${match.song}-${match.section}-${displayIdx}`}
                  href={match.url} target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    gap: '12px', textDecoration: 'none', padding: '6px 2px',
                    borderBottom: displayIdx < displayMatches.length - 1 ? '1px solid #1e1710' : 'none',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#18140f' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
                >
                  <span style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '6px', overflow: 'hidden' }}>
                    <span style={{ color: '#ede6dd', fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>
                      {match.song}
                    </span>
                    <span style={{ color: '#4a4136', fontSize: '11px', flexShrink: 0 }}>·</span>
                    <span style={{ color: '#8a7f72', fontSize: '11.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 2 }}>
                      {match.artist}
                    </span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexShrink: 0 }}>
                    {keyCheck?.tempo ? (
                      <span style={{ color: '#574d42', fontSize: '10px', fontFamily: "'JetBrains Mono', monospace" }}>
                        {keyCheck.tempo} bpm
                      </span>
                    ) : null}
                    <span style={{ color: '#574d42', fontSize: '10.5px', fontFamily: "'JetBrains Mono', monospace", textTransform: 'lowercase' }}>
                      {match.section}
                    </span>
                  </span>
                </a>
              )
            })}
          </div>

          {!loading && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1e1710' }}>
              {chipActive && keyLabel ? (
                <span style={{ fontSize: '10.5px', color: '#574d42', fontFamily: "'JetBrains Mono', monospace" }}>
                  {displayMatches.length} in {keyLabel}
                </span>
              ) : (
                <span style={{ fontSize: '10.5px', color: '#4a4136', fontFamily: "'JetBrains Mono', monospace" }}>
                  {matches.length} results
                </span>
              )}
              {hasMore && (
                <button
                  onClick={() => appendPage(token)}
                  className="h-ghost"
                  style={{ border: 'none', background: 'transparent', color: '#8a7f72', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11.5px', fontWeight: 700, transition: 'color .12s' }}
                >
                  More →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
