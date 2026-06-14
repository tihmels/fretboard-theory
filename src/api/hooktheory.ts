export interface HooktheorySongMatch {
  artist: string
  song: string
  section: string
  url: string
}

interface HooktheoryNode {
  chord_ID: string
  chord_HTML: string
  probability: number
  child_path: string
}

const API_ROOT = 'https://api.hooktheory.com/v1'

function encodeChildPath(childPath: string): string {
  return childPath
    .split(',')
    .map(part => encodeURIComponent(part))
    .join(',')
}

function authHeaders(token: string): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function requestUrl(path: string, params: string[]): string {
  return `${API_ROOT}/${path}${params.length ? `?${params.join('&')}` : ''}`
}

export async function fetchHooktheoryToken(username: string, password: string): Promise<string> {
  const response = await fetch(`${API_ROOT}/users/auth`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Hooktheory rejected the username or password.')
    }
    if (response.status === 429) {
      throw new Error('Hooktheory rate limit reached. Try again shortly.')
    }
    throw new Error(`Hooktheory authentication failed (${response.status}).`)
  }

  const data: unknown = await response.json()
  if (!data || typeof data !== 'object') {
    throw new Error('Hooktheory did not return an auth token.')
  }

  const token = (data as Record<string, unknown>).activkey
  if (typeof token !== 'string' || token.length === 0) {
    throw new Error('Hooktheory did not return an auth token.')
  }

  return token
}

export async function fetchHooktheorySongMatches(
  token: string,
  childPath: string,
  page = 1,
): Promise<HooktheorySongMatch[]> {
  const query = [`cp=${encodeChildPath(childPath)}`]
  if (page > 1) query.push(`page=${encodeURIComponent(String(page))}`)

  const response = await fetch(requestUrl('trends/songs', query), {
    headers: authHeaders(token),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Hooktheory rejected the token.')
    }
    if (response.status === 429) {
      throw new Error('Hooktheory rate limit reached. Try again shortly.')
    }
    if (response.status >= 500) {
      throw new Error(`Hooktheory errored on this exact progression (${childPath}). Try a shorter progression or a different chord sequence.`)
    }
    throw new Error(`Hooktheory request failed (${response.status}).`)
  }

  const data: unknown = await response.json()
  if (!Array.isArray(data)) return []

  return data
    .filter((item): item is HooktheorySongMatch => {
      if (!item || typeof item !== 'object') return false
      const row = item as Record<string, unknown>
      return (
        typeof row.artist === 'string' &&
        typeof row.song === 'string' &&
        typeof row.section === 'string' &&
        typeof row.url === 'string'
      )
    })
    .map(match => ({
      ...match,
      url: match.url.replace('http://local.www.hooktheory.com', 'https://www.hooktheory.com'),
    }))
}

export async function resolveHooktheoryBasicChildPath(
  token: string,
  degrees: number[],
): Promise<string> {
  let childPath = ''

  for (const degree of degrees) {
    const params = childPath ? [`cp=${encodeChildPath(childPath)}`] : []
    const response = await fetch(requestUrl('trends/nodes', params), {
      headers: authHeaders(token),
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Hooktheory rejected the token.')
      }
      if (response.status === 429) {
        throw new Error('Hooktheory rate limit reached. Try again shortly.')
      }
      throw new Error(`Hooktheory could not validate this progression (${response.status}).`)
    }

    const data: unknown = await response.json()
    if (!Array.isArray(data)) {
      throw new Error('Hooktheory returned an unexpected chord-node response.')
    }

    const nodes = data.filter((item): item is HooktheoryNode => {
      if (!item || typeof item !== 'object') return false
      const row = item as Record<string, unknown>
      return (
        typeof row.chord_ID === 'string' &&
        typeof row.chord_HTML === 'string' &&
        typeof row.probability === 'number' &&
        typeof row.child_path === 'string'
      )
    })

    const nextNode = nodes.find(node => node.chord_ID === String(degree))
    if (!nextNode) {
      throw new Error(`Hooktheory has no basic ${degree} chord node after ${childPath || 'the start'}. Try a shorter progression.`)
    }

    childPath = nextNode.child_path
  }

  return childPath
}
