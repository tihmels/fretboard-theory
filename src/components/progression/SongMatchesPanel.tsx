import { useMemo, useState, useEffect, useRef } from 'react'
import { useProgressionStore } from '../../store/progression'
import {
  fetchHooktheorySongMatches,
  fetchHooktheoryToken,
  resolveHooktheoryBasicChildPath,
  type HooktheorySongMatch,
} from '../../api/hooktheory'
import { hooktheoryBasicDegreesFromSteps } from '../../theory/progressionSearch'

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

const INPUT: React.CSSProperties = {
  flex: '1 1 130px', minWidth: 0,
  height: '30px', borderRadius: '8px',
  border: '1px solid #2a221b', background: '#16120e',
  color: '#ede6dd', padding: '0 10px',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '11px', outline: 'none',
}

export function SongMatchesPanel() {
  const steps   = useProgressionStore(s => s.steps)
  const degrees = useMemo(() => hooktheoryBasicDegreesFromSteps(steps), [steps])

  const [token,       setToken]       = useState(loadToken)
  const [open,        setOpen]        = useState(false)
  const [username,    setUsername]    = useState('')
  const [password,    setPassword]    = useState('')
  const [matches,     setMatches]     = useState<HooktheorySongMatch[]>([])
  const [page,        setPage]        = useState(1)
  const [loading,     setLoading]     = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const isAuthenticated = token.trim().length > 0
  const hasProgression  = degrees.length > 0

  // Stable ref so the effect below can call search() without it being a dependency
  const searchRef = useRef(search)
  useEffect(() => { searchRef.current = search })

  const degreesKey = degrees.join(',')
  const prevDegreesKey = useRef(degreesKey)
  useEffect(() => {
    if (degreesKey === prevDegreesKey.current) return
    prevDegreesKey.current = degreesKey
    // Stale results: clear always, re-search if panel is open + authenticated
    setMatches([])
    setPage(1)
    setError(null)
    if (open && isAuthenticated && degrees.length > 0) {
      searchRef.current(1)
    }
  }, [degreesKey, open, isAuthenticated, degrees.length])

  async function signIn() {
    if (!username.trim() || !password || authLoading) return
    setAuthLoading(true)
    setError(null)
    try {
      const tok = await fetchHooktheoryToken(username.trim(), password)
      setToken(tok)
      saveToken(tok)
      setPassword('')
      await search(1, tok)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setAuthLoading(false)
    }
  }

  async function search(nextPage = 1, overrideToken?: string) {
    const tok = (overrideToken ?? token).trim()
    if (!tok || !degrees.length) return
    setLoading(true)
    setError(null)
    try {
      const cp      = await resolveHooktheoryBasicChildPath(tok, degrees)
      const results = await fetchHooktheorySongMatches(tok, cp, nextPage)
      setMatches(results)
      setPage(nextPage)
    } catch (err) {
      setMatches([])
      setError(err instanceof Error ? err.message : 'Could not fetch song matches.')
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    setOpen(true)
    if (isAuthenticated && hasProgression && matches.length === 0 && !loading) {
      search(1)
    }
  }

  function handleClose() {
    setOpen(false)
    setError(null)
  }

  function handleSignOut() {
    setToken('')
    saveToken('')
    setMatches([])
    setError(null)
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
      marginTop: '11px',
      padding: '12px 14px',
      background: '#100c09',
      border: '1px solid #221b14',
      borderRadius: '11px',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '10.5px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#6b6258' }}>
          Song matches
        </span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isAuthenticated && (
            <button
              onClick={handleSignOut}
              className="h-ghost"
              style={{ fontSize: '10.5px', color: '#574d42', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color .12s' }}
            >
              Sign out
            </button>
          )}
          <button
            onClick={handleClose}
            className="h-ghost"
            style={{ fontSize: '16px', lineHeight: 1, color: '#574d42', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'color .12s' }}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Sign-in form — only shown when not authenticated */}
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
              type="text"
              value={username}
              onChange={e => setUsername(e.currentTarget.value)}
              onKeyDown={e => e.key === 'Enter' && signIn()}
              placeholder="Username"
              autoComplete="username"
              style={INPUT}
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.currentTarget.value)}
              onKeyDown={e => e.key === 'Enter' && signIn()}
              placeholder="Password"
              autoComplete="current-password"
              style={INPUT}
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
                flexShrink: 0,
                transition: 'background .12s, color .12s',
              }}
            >
              {authLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ color: '#e0564f', fontSize: '12px', marginBottom: '10px' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ color: '#574d42', fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>
          Searching…
        </div>
      )}

      {/* Empty state (authenticated, no results yet) */}
      {isAuthenticated && !loading && matches.length === 0 && !error && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0 2px' }}>
          <button
            onClick={() => search(1)}
            className="h-icon"
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
      {matches.length > 0 && !loading && (
        <>
          <div style={{ maxHeight: '200px', overflowY: 'auto', margin: '0 -2px' }}>
            {matches.map((match, idx) => (
              <a
                key={`${match.artist}-${match.song}-${match.section}-${idx}`}
                href={match.url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  gap: '12px', textDecoration: 'none',
                  padding: '6px 2px',
                  borderBottom: idx < matches.length - 1 ? '1px solid #1e1710' : 'none',
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
                <span style={{ color: '#574d42', fontSize: '10.5px', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, textTransform: 'lowercase' }}>
                  {match.section}
                </span>
              </a>
            ))}
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #1e1710' }}>
            <button
              onClick={() => search(Math.max(1, page - 1))}
              disabled={page <= 1}
              className={page > 1 ? 'h-ghost' : ''}
              style={{ border: 'none', background: 'transparent', color: page > 1 ? '#8a7f72' : '#3f352a', cursor: page > 1 ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: '11.5px', fontWeight: 700, transition: 'color .12s' }}
            >
              ← Prev
            </button>
            <span style={{ color: '#574d42', fontSize: '11px', fontFamily: "'JetBrains Mono', monospace" }}>
              page {page}
            </span>
            <button
              onClick={() => search(page + 1)}
              disabled={matches.length < 20}
              className={matches.length >= 20 ? 'h-ghost' : ''}
              style={{ border: 'none', background: 'transparent', color: matches.length >= 20 ? '#8a7f72' : '#3f352a', cursor: matches.length >= 20 ? 'pointer' : 'default', fontFamily: 'inherit', fontSize: '11.5px', fontWeight: 700, transition: 'color .12s' }}
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
