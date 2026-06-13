import { useEffect } from 'react'
import { useProgressionStore } from '../store/progression'

/** Global keyboard shortcuts for the app. */
export function useKeyboardShortcuts() {
  const toggle = useProgressionStore(s => s.toggle)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable) return

      if (e.code === 'Space') {
        e.preventDefault()
        toggle()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggle])
}
