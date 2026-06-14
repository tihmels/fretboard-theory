import { useMemo, useState, useEffect, useRef } from 'react'
import { useProgressionStore } from '../../store/progression'
import { useTheoryStore } from '../../store/theory'
import {
  fetchHooktheorySongMatches,
  fetchHooktheoryToken,
  resolveHooktheoryBasicChildPath,
  type HooktheorySongMatch,
} from '../../api/hooktheory'
import { lookupSongKey, type GetsongkeyKeyResult } from '../../api/getsongkey'
import { hooktheoryBasicDegreesFromSteps } from '../../theory/progressionSearch'
import { getPitchName } from '../../theory/pitch'
import type { PitchClass, ScaleDef } from '../../theory/types'

const TOKEN_KEY = 'neckwise.hooktheoryToken'

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

function keyLabel(pitchClass: PitchClass, mode: 0 | 1, refRoot: PitchClass): string {
  const name = getPitchName(pitchClass, 'auto', refRoot)
  return mode === 0 ? `${name}m` : name
}

const INPUT: React.CSSProperties = {
  flex: '1 1 130px', minWidth: 0,
  height: '30px', borderRadius: '8px',
  border: '1px solid #2a221b', background: '#16120e',
  color: '#ede6dd', padding: '0 10px',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px', outline: 'none',
}

type Augment = GetsongkeyKeyResult | null | undefined

interface GroupedMatch {
  song: string
  artist: string
  url: string
  sections: string[]
  aug: Augment
}

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
  const [augments,    setAugments]    = useState<Augment[]>([])
  const [page,        setPage]        = useState(1)
  const [hasMore,     setHasMore]     = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const searchIdRef  = useRef(0)
  const augmentIdRef = useRef(0)
  const childPathRef = useRef('')

  const isAuthenticated = token.trim().length > 0
  const hasProgression  = degrees.length > 0

  const groupedMatches = useMemo<GroupedMatch[]>(() => {
    const groups: GroupedMatch[] = []
    const seen = new Map<string, GroupedMatch>()
    matches.forEach((m, i) => {
      const key = m.artist.toLowerCase() + '|' + m.song.toLowerCase()
      const existing = seen.get(key)
      if (existing) {
        existing.sections.push(m.section)
      } else {
        const group: GroupedMatch = { song: m.song, artist: m.artist, url: m.url, sections: [m.section], aug: augments[i] }
        seen.set(key, group)
        groups.push(group)
      }
    })
    return groups
  }, [matches, augments])

  async function augment(songs: HooktheorySongMatch[], startIdx: number, myAugId: number) {
    const stale = () => myAugId !== augmentIdRef.current
    const results = await Promise.allSettled(songs.map(m => lookupSongKey(m.song, m.artist)))
    if (stale()) return
    setAugments(prev => {
      const next = [...prev]
      results.forEach((r, i) => {
        next[startIdx + i] = r.status === 'fulfilled' ? r.value : null
      })
      return next
    })
  }

  async function runSearch(tok: string) {
    const myId    = ++searchIdRef.current
    const myAugId = ++augmentIdRef.current
    const stale   = () => myId !== searchIdRef.current

    setLoading(true)
    setError(null)
    setMatches([])
    setAugments([])
    setPage(1)
    setHasMore(false)

    try {
      const cp = await resolveHooktheoryBasicChildPath(tok, degrees)
      if (stale()) return
      childPathRef.current = cp

      const results = await fetchHooktheorySongMatches(tok, cp, 1)
      if (stale()) return

      setMatches(results)
      setAugments(new Array(results.length).fill(undefined))
      setHasMore(results.length === 20)
      setLoading(false)

      augment(results, 0, myAugId)
    } catch (err) {
      if (!stale()) {
        setError(err instanceof Error ? err.message : 'Could not fetch songs.')
        setLoading(false)
      }
    }
  }

  async function loadMore(tok: string) {
    const myId     = ++searchIdRef.current
    const myAugId  = augmentIdRef.current
    const stale    = () => myId !== searchIdRef.current
    const nextPage = page + 1
    const startIdx = matches.length

    setLoading(true)
    setError(null)

    try {
      const results = await fetchHooktheorySongMatches(tok, childPathRef.current, nextPage)
      if (stale()) return

      setMatches(prev => [...prev, ...results])
      setAugments(prev => [...prev, ...new Array(results.length).fill(undefined)])
      setPage(nextPage)
      setHasMore(results.length === 20)
      setLoading(false)

      augment(results, startIdx, myAugId)
    } catch (err) {
      if (!stale()) {
        setError(err instanceof Error ? err.message : 'Could not load more.')
        setLoading(false)
      }
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
      await runSearch(tok)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setAuthLoading(false)
    }
  }

  const degreesKey     = degrees.join(',')
  const prevDegreesKey = useRef(degreesKey)
  const prevRoot       = useRef(root)
  const runRef         = useRef({ token, open, isAuthenticated, degrees })
  useEffect(() => { runRef.current = { token, open, isAuthenticated, degrees } })

  useEffect(() => {
    const degreesChanged = degreesKey !== prevDegreesKey.current
    const rootChanged    = root !== prevRoot.current
    if (!degreesChanged && !rootChanged) return
    prevDegreesKey.current = degreesKey
    prevRoot.current       = root

    const { token: tok, open: o, isAuthenticated: auth, degrees: degs } = runRef.current
    if (!o || !auth || !degs.length) {
      searchIdRef.current++
      augmentIdRef.current++
      setMatches([]); setAugments([]); setPage(1); setError(null); setHasMore(false)
      return
    }
    runSearch(tok)
  }, [degreesKey, root])

  function handleOpen() {
    setOpen(true)
    if (isAuthenticated && hasProgression && matches.length === 0 && !loading) {
      runSearch(token)
    }
  }

  function handleClose() { setOpen(false); setError(null) }

  function handleSignOut() {
    searchIdRef.current++
    augmentIdRef.current++
    setToken(''); saveToken('')
    setMatches([]); setAugments([]); setError(null); setLoading(false); setHasMore(false)
  }

  // ── Collapsed ───────────────────────────────────────────────────────────
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

  // ── Expanded ────────────────────────────────────────────────────────────
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
        <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b6258', userSelect: 'none' }}>
          Song matches
        </span>
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

      {loading && matches.length === 0 && (
        <div style={{ color: '#574d42', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>
          Searching…
        </div>
      )}

      {isAuthenticated && !loading && matches.length === 0 && !error && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px' }}>
          <button
            onClick={() => runSearch(token)} className="h-icon"
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

      {/* Results */}
      {groupedMatches.length > 0 && (
        <>
          <div style={{ maxHeight: '200px', overflowY: 'auto', margin: '0 -2px' }}>
            {groupedMatches.map((group, i) => {
              const { aug } = group
              const inKey   = aug != null && mode !== null && aug.pitchClass === root && aug.mode === mode
              const kLabel  = aug != null ? keyLabel(aug.pitchClass, aug.mode, root) : null
              return (
                <a
                  key={`${group.artist}-${group.song}-${i}`}
                  href={group.url} target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: '12px', textDecoration: 'none', padding: '6px 2px',
                    borderBottom: i < groupedMatches.length - 1 ? '1px solid #1e1710' : 'none',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#18140f' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
                >
                  <span style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '6px', overflow: 'hidden' }}>
                    <span style={{ color: inKey ? '#ede6dd' : '#c8c0b8', fontSize: '12.5px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>
                      {group.song}
                    </span>
                    <span style={{ color: '#4a4136', fontSize: '11px', flexShrink: 0 }}>·</span>
                    <span style={{ color: '#8a7f72', fontSize: '11.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 2 }}>
                      {group.artist}
                    </span>
                  </span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#574d42' }}>
                    {kLabel && (
                      <span style={{ color: inKey ? '#c87a3a' : '#574d42' }}>{kLabel}</span>
                    )}
                    {aug?.tempo && (
                      <span>{aug.tempo}</span>
                    )}
                    <span style={{ textTransform: 'lowercase' }}>{group.sections.join(', ')}</span>
                  </span>
                </a>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1e1710' }}>
            <span style={{ fontSize: '10.5px', color: '#4a4136', fontFamily: "'JetBrains Mono', monospace" }}>
              {loading ? '…' : `${groupedMatches.length} songs`}
            </span>
            {!loading && hasMore && (
              <button
                onClick={() => loadMore(token)}
                className="h-ghost"
                style={{ border: 'none', background: 'transparent', color: '#8a7f72', cursor: 'pointer', fontFamily: 'inherit', fontSize: '11.5px', fontWeight: 700, transition: 'color .12s' }}
              >
                More →
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
