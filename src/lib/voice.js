// Voice announcements via the browser's built-in Speech Synthesis API.
// Free, no dependency, works offline. Sound is ALWAYS ON: we simply prime the
// audio engine on the first user interaction (browsers require one gesture
// before audio can play) — no button, nothing for staff to remember.

let enabled = true
let primed = false

export function enableVoice() {
  enabled = true
  primeOnce()
}

// Attach once at startup: the first click/keypress/touch primes audio.
export function autoPrimeVoice() {
  const handler = () => primeOnce()
  window.addEventListener('pointerdown', handler, { once: true })
  window.addEventListener('keydown', handler, { once: true })
}

function primeOnce() {
  if (primed) return
  primed = true
  try {
    const u = new SpeechSynthesisUtterance('')
    window.speechSynthesis.speak(u)
  } catch {
    /* no-op */
  }
}

export function isVoiceEnabled() {
  return enabled
}

export function announce(text, lang = 'en-US') {
  if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return
  try {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 1
    u.pitch = 1
    u.volume = 1
    // Prefer a voice matching the requested language, if the device has one.
    const voices = window.speechSynthesis.getVoices?.() || []
    const match = voices.find((v) => v.lang === lang) || voices.find((v) => v.lang?.startsWith(lang.slice(0, 2)))
    if (match) u.voice = match
    window.speechSynthesis.cancel() // interrupt any queued speech for immediacy
    window.speechSynthesis.speak(u)
  } catch (e) {
    console.warn('voice failed', e)
  }
}

// A short arrival chime using the Web Audio API — plays alongside the voice
// so a new arrival is impossible to miss.
let audioCtx = null
export function chime() {
  if (!enabled) return
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    const ctx = audioCtx
    const notes = [880, 1174.66] // A5 -> D6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.13
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.24)
    })
  } catch {
    /* no-op */
  }
}
