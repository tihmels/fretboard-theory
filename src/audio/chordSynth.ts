/**
 * Chord synthesizer using the Web Audio API.
 *
 * Uses the Karplus-Strong algorithm to produce a plucked-string sound:
 * 1. Fill a short delay buffer with white noise (one period of the target frequency).
 * 2. Run the KS feedback loop (average adjacent samples × decay) to generate
 *    the full waveform offline into an AudioBuffer.
 * 3. Play the result via a BufferSourceNode — no feedback graph needed.
 *
 * Pre-generating the buffer avoids Web Audio's DAG restrictions (no cycles allowed),
 * which caused screaming artifacts in a live delay-feedback approach.
 */

const C4_FREQ = 261.6256

function noteFreq(pitchClass: number, octave: number): number {
  return C4_FREQ * Math.pow(2, pitchClass / 12 + (octave - 4))
}

let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx || ctx.state === 'closed') ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

const DURATION_S = 2.2   // max note duration in seconds
const DECAY      = 0.998 // higher = longer sustain / more ringing
// Averaging blend: 0.5 = max damping (dark), >0.5 = brighter (keeps more highs)
const BLEND      = 0.55

/** Generate a Karplus-Strong plucked-string waveform into an AudioBuffer. */
function generateKS(ac: AudioContext, freq: number): AudioBuffer {
  const sr         = ac.sampleRate
  const totalSamps = Math.ceil(sr * DURATION_S)
  const delayLen   = Math.round(sr / freq)

  const delay = new Float32Array(delayLen)
  for (let i = 0; i < delayLen; i++) delay[i] = Math.random() * 2 - 1

  const buf  = ac.createBuffer(1, totalSamps, sr)
  const data = buf.getChannelData(0)
  let pos    = 0
  for (let i = 0; i < totalSamps; i++) {
    const next = (pos + 1) % delayLen
    data[i]    = delay[pos]
    // Slightly biased average: retains more of current sample = brighter tone
    delay[pos] = (delay[pos] * BLEND + delay[next] * (1 - BLEND)) * DECAY
    pos        = next
  }
  return buf
}

/** Gentle soft-saturation curve — adds harmonic warmth without clipping. */
function makeSaturationCurve(drive = 2): Float32Array<ArrayBuffer> {
  const n = 256
  const curve = new Float32Array(n) as Float32Array<ArrayBuffer>
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1
    curve[i] = Math.tanh(drive * x) / Math.tanh(drive)
  }
  return curve
}

const satCurve = makeSaturationCurve(0.8)

function playBuffer(ac: AudioContext, buf: AudioBuffer, startTime: number, gain: number): void {
  const src      = ac.createBufferSource()
  const gainNode = ac.createGain()
  const shaper   = ac.createWaveShaper()
  shaper.curve   = satCurve
  shaper.oversample = '2x'

  src.buffer = buf

  gainNode.gain.setValueAtTime(gain, startTime)
  gainNode.gain.setValueAtTime(gain, startTime + DURATION_S - 0.3)
  gainNode.gain.linearRampToValueAtTime(0, startTime + DURATION_S)

  src.connect(gainNode)
  gainNode.connect(shaper)
  shaper.connect(ac.destination)
  src.start(startTime)
  src.stop(startTime + DURATION_S)
}

export function playNote(midi: number): void {
  try {
    const ac   = getCtx()
    const freq = 440 * Math.pow(2, (midi - 69) / 12)
    playBuffer(ac, generateKS(ac, freq), ac.currentTime, 0.5)
  } catch { /* blocked by autoplay policy */ }
}

export function playChord(rootPc: number, pattern: number[]): void {
  try {
    const ac  = getCtx()
    const now = ac.currentTime

    const octaveFor = (i: number) => {
      if (i === 0) return 2   // bass
      if (i <= 2)  return 3
      return 4
    }

    pattern.forEach((offset, i) => {
      const pc   = (rootPc + offset) % 12
      const freq = noteFreq(pc, octaveFor(i))
      const t0   = now + i * 0.030  // 30 ms strum spread
      const vol  = i === 0 ? 0.55 : Math.max(0.28, 0.48 - i * 0.04)
      playBuffer(ac, generateKS(ac, freq), t0, vol)
    })
  } catch { /* blocked by autoplay policy */ }
}
