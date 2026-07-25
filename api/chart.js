// Vercel serverless function → POST /api/chart
// Ambient charting: audio (base64) -> Groq Whisper -> transcript -> Groq Llama
// -> { summary, symptoms, prescriptions, actions }. Degrades to a labelled
// sample when GROQ_API_KEY is missing, so the UI never dead-ends.

const GROQ_BASE = 'https://api.groq.com/openai/v1'
const WHISPER_MODEL = 'whisper-large-v3'
const LLM_MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT =
  'You are a precise clinical scribe at a sports-medicine clinic. ' +
  'From the consultation transcript, extract structured notes. ' +
  'Return ONLY valid JSON with exactly these keys: ' +
  '"summary" (a one-sentence string), ' +
  '"symptoms" (array of short strings), ' +
  '"prescriptions" (array of short strings, medications or dosages), ' +
  '"actions" (array of short strings, follow-ups / referrals / tests). ' +
  'If a section has nothing, use an empty array. Do not invent details.'

const MOCK_NOTE = {
  summary: 'Sample note — add a GROQ_API_KEY in Vercel for real AI charting.',
  symptoms: ['Right knee pain after running', 'Mild swelling, 3 days'],
  prescriptions: ['Ibuprofen 400mg, twice daily with food'],
  actions: ['RICE protocol', 'MRI if no improvement in 1 week', 'Physio referral'],
  engine: 'mock',
  transcript: '',
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  const key = (process.env.GROQ_API_KEY || '').trim()
  const body = req.body || {}
  let transcript = (body.transcript || '').trim()
  const audioBase64 = body.audioBase64 || ''
  const mime = body.mime || 'audio/webm'

  if (!key) {
    res.status(200).json({ ...MOCK_NOTE, transcript })
    return
  }

  try {
    if (audioBase64) {
      const buf = Buffer.from(audioBase64, 'base64')
      const form = new FormData()
      form.append('file', new Blob([buf], { type: mime }), 'audio.webm')
      form.append('model', WHISPER_MODEL)
      form.append('response_format', 'json')
      const tr = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
      })
      if (!tr.ok) throw new Error(`whisper ${tr.status}`)
      transcript = ((await tr.json()).text || '').trim()
    }

    if (!transcript) {
      res.status(200).json({ ...MOCK_NOTE, engine: 'mock', summary: 'No speech detected — nothing to chart.' })
      return
    }

    const cr = await fetch(`${GROQ_BASE}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: transcript },
        ],
      }),
    })
    if (!cr.ok) throw new Error(`llm ${cr.status}`)
    const data = JSON.parse((await cr.json()).choices[0].message.content)
    res.status(200).json({
      summary: data.summary || '',
      symptoms: data.symptoms || [],
      prescriptions: data.prescriptions || [],
      actions: data.actions || [],
      transcript,
      engine: 'groq',
    })
  } catch (e) {
    res.status(200).json({ ...MOCK_NOTE, engine: 'error', summary: `Charting failed: ${e.message}`, transcript })
  }
}
