/**
 * Minimal chord synthesizer using the Web Audio API.
 * No dependencies — just oscillators with a guitar-like pluck envelope.
 *
 * Octave layout mimics a strummed guitar chord: bass note at the bottom,
 * upper voices spread across octaves 3–4.
 */

const C4_FREQ = 261.6256  // Concert C4

function noteFreq(pitchClass: number, octave: number): number {
  return C4_FREQ * Math.pow(2, pitchClass / 12 + (octave - 4))
}

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/**
 * Play a chord — rootPc is a pitch class 0–11, pattern is the chord's
 * interval offsets (e.g. [0, 4, 7] for major).
 * Notes are spread across octaves and slightly arpeggiated (strum feel).
 */
export function playChord(rootPc: number, pattern: number[]): void {
  try {
    const ac  = getCtx()
    const now = ac.currentTime

    // Assign each chord tone an octave: root goes low, upper voices spread
    const octaveFor = (i: number) => {
      if (i === 0) return 2          // bass
      if (i <= 2)  return 3          // mid
      return 4                       // high
    }

    pattern.forEach((offset, i) => {
      const pc   = (rootPc + offset) % 12
      const freq = noteFreq(pc, octaveFor(i))
      const t0   = now + i * 0.028  // strum spread ~28ms per note

      const osc  = ac.createOscillator()
      const gain = ac.createGain()

      // Triangle wave — softer than sawtooth, cleaner than sine
      osc.type = 'triangle'
      osc.frequency.value = freq

      // Pluck envelope: fast attack, quick decay to low sustain, fade out
      gain.gain.setValueAtTime(0, t0)
      gain.gain.linearRampToValueAtTime(0.20, t0 + 0.010)
      gain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.12)
      gain.gain.exponentialRampToValueAtTime(0.03, t0 + 0.50)
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.80)

      osc.connect(gain)
      gain.connect(ac.destination)
      osc.start(t0)
      osc.stop(t0 + 1.85)
    })
  } catch {
    // AudioContext may be blocked by browser autoplay policy until first user gesture
  }
}
