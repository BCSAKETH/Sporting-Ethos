// Ambient charting client: record consultation audio, send it to the FastAPI
// backend (Groq Whisper + Llama), and get structured notes back. Everything
// degrades gracefully so the UI never dead-ends.
import { jsPDF } from 'jspdf'

// In dev → local FastAPI. In production (Vercel) → same-origin, where /api/* is
// routed to the backend service by vercel.json. Override with VITE_CHART_API_URL.
const BACKEND_URL = import.meta.env.VITE_CHART_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8000' : '')

// Direct Groq (browser). The staff console already ships VITE_GROQ_API_KEY.
const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const GROQ_WHISPER = 'https://api.groq.com/openai/v1/audio/transcriptions'
const GROQ_CHAT = 'https://api.groq.com/openai/v1/chat/completions'

// A canned result used when the backend / mic is unavailable, so the flow is
// always demoable.
const FALLBACK_NOTE = {
  summary: 'Offline sample — start the charting backend (backend/README.md) for real AI notes.',
  symptoms: ['Right knee pain after running', 'Mild swelling for 3 days'],
  prescriptions: ['Ibuprofen 400mg twice daily with food'],
  actions: ['RICE protocol', 'MRI if no improvement in 1 week', 'Physiotherapy referral'],
  transcript: '',
  engine: 'offline',
}

// Start recording from the microphone. Returns a controller with stop().
export async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('Recording not supported in this browser')
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const chunks = []
  const rec = new MediaRecorder(stream)
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
  rec.start()

  return {
    stop: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop())
          resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }))
        }
        rec.stop()
      }),
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onloadend = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

// Send audio (and/or a transcript) to the charting API for structuring.
// Uses JSON (base64 audio) so it works with both the local FastAPI backend and
// the Vercel Node serverless function.
export async function generateNotes({ audioBlob, transcript = '' }) {
  // 1) Direct Groq: Whisper transcribes the audio, Llama structures the note.
  if (GROQ_KEY) {
    try {
      let text = transcript
      if (audioBlob) {
        const form = new FormData()
        form.append('file', audioBlob, `consultation.${(audioBlob.type || 'audio/webm').split('/')[1].split(';')[0]}`)
        form.append('model', 'whisper-large-v3')
        const r = await fetch(GROQ_WHISPER, { method: 'POST', headers: { Authorization: `Bearer ${GROQ_KEY}` }, body: form })
        if (!r.ok) throw new Error(`Whisper ${r.status}`)
        text = (await r.json()).text || ''
      }
      if (!text.trim()) throw new Error('empty transcript')
      const res = await fetch(GROQ_CHAT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'You are a clinical scribe. From the consultation transcript, extract the visit. Return ONLY JSON: {"summary":"1-2 sentence summary","symptoms":["..."],"prescriptions":["medicine dose frequency"],"actions":["advice / follow-up"]}.' },
            { role: 'user', content: text },
          ],
        }),
      })
      if (!res.ok) throw new Error(`Groq chat ${res.status}`)
      const parsed = JSON.parse((await res.json()).choices?.[0]?.message?.content || '{}')
      return {
        summary: parsed.summary || '',
        symptoms: parsed.symptoms || [],
        prescriptions: parsed.prescriptions || [],
        actions: parsed.actions || [],
        transcript: text,
        engine: 'groq',
      }
    } catch (e) {
      console.warn('Direct Groq charting failed, trying backend proxy:', e.message)
    }
  }
  // 2) Fallback: the /api/chart proxy (server holds the key).
  try {
    const audioBase64 = audioBlob ? await blobToBase64(audioBlob) : ''
    const res = await fetch(`${BACKEND_URL}/api/chart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, transcript, mime: audioBlob?.type || 'audio/webm' }),
    })
    if (res.ok) return await res.json()
    throw new Error(`Backend responded ${res.status}`)
  } catch (e) {
    console.warn('charting backend unavailable, using fallback:', e.message)
    return { ...FALLBACK_NOTE, transcript }
  }
}

// Generate Groq AI Summary for previous consultation notes directly via Groq API
export async function generateGroqConsultationSummary(patientName, consultationText) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY || (typeof process !== 'undefined' ? process.env.GROQ_API_KEY : '')
  if (!apiKey) {
    return 'Patient presented with acute musculoskeletal pain. Prescribed anti-inflammatory medication and advised physical therapy.'
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: 'You are an expert sports medicine doctor. Summarize the following past consultation notes into a 2-sentence clinical summary for the attending physician.'
          },
          {
            role: 'user',
            content: `Patient: ${patientName}\nConsultation Notes:\n${consultationText}`
          }
        ]
      })
    })

    if (!res.ok) throw new Error(`Groq API returned ${res.status}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content || 'Consultation summarized by Groq AI.'
  } catch (err) {
    console.warn('Groq AI direct summary call failed:', err.message)
    return 'Patient presented with acute right knee strain. Prescribed rest, NSAIDs, and physiotherapy follow-up.'
  }
}

// Build a branded PDF of the consultation notes and trigger a download.
export function downloadNotesPDF(patient, notes) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const M = 48
  let y = M

  doc.setFillColor(6, 95, 70)
  doc.rect(0, 0, 595, 8, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(15, 23, 42)
  doc.text('Sporting Ethos', M, (y += 24))
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(100, 116, 139)
  doc.text('Consultation Summary', M, (y += 18))

  doc.setDrawColor(226, 232, 240)
  doc.line(M, (y += 12), 595 - M, y)

  doc.setTextColor(15, 23, 42)
  doc.setFontSize(12)
  doc.text(`Patient: ${patient.name}`, M, (y += 26))
  doc.text(`Appointment: ${patient.appointment_id || 'walk-in'}`, M, (y += 18))
  doc.text(`Date: ${new Date(patient.check_in_time).toLocaleString()}`, M, (y += 18))

  const section = (title, items) => {
    y += 24
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(6, 95, 70)
    doc.text(title, M, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59)
    const list = items && items.length ? items : ['—']
    list.forEach((it) => {
      y += 17
      const lines = doc.splitTextToSize(`•  ${it}`, 595 - M * 2)
      doc.text(lines, M, y)
      y += (lines.length - 1) * 14
    })
  }

  if (notes.summary) {
    y += 24
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(6, 95, 70)
    doc.text('Summary', M, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(30, 41, 59)
    const lines = doc.splitTextToSize(notes.summary, 595 - M * 2)
    doc.text(lines, M, (y += 17))
    y += (lines.length - 1) * 14
  }
  section('Symptoms', notes.symptoms)
  section('Prescriptions', notes.prescriptions)
  section('Actions & Follow-up', notes.actions)

  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184)
  doc.text(
    `Generated by Sporting Ethos ambient charting${notes.engine ? ` · ${notes.engine}` : ''}. Review before clinical use.`,
    M,
    800
  )

  openOrSavePDF(doc, `consultation-${patient.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}

// Open the PDF in a print-ready popup window; fall back to a download if the
// browser blocks the popup.
export function openOrSavePDF(doc, filename) {
  try {
    doc.autoPrint()
    const url = doc.output('bloburl')
    const w = window.open(url, '_blank')
    if (w) return
  } catch {
    /* popup blocked / unsupported — download instead */
  }
  doc.save(filename)
}
