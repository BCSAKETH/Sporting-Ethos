// Vercel serverless function → GET /api/health
export default function handler(req, res) {
  const key = (process.env.GROQ_API_KEY || '').trim()
  res.status(200).json({ ok: true, groq_configured: Boolean(key) })
}
