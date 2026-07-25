"""
Sporting Ethos — Ambient Charting backend.

A single, lightweight FastAPI service that powers "Zero-Click Charting":

    audio  ──►  Groq Whisper-large-v3   ──►  transcript
    transcript ─► Groq Llama 3.3 70B (JSON) ─► { summary, symptoms, prescriptions, actions }

It is designed to DEGRADE GRACEFULLY: with no GROQ_API_KEY set (or if Groq is
unreachable) it returns a clearly-labelled mock so the whole product still runs
and demos. Add a free key from https://console.groq.com and it becomes real.

Run it:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000
"""

import json
import os

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# Load backend/.env if present, so the key survives restarts with no shell setup.
load_dotenv()

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
GROQ_BASE = "https://api.groq.com/openai/v1"
WHISPER_MODEL = "whisper-large-v3"
LLM_MODEL = "llama-3.3-70b-versatile"

app = FastAPI(title="Sporting Ethos — Ambient Charting")

# Wide-open CORS is fine for a local hackathon tool (frontend runs on :5173).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = (
    "You are a precise clinical scribe at a sports-medicine clinic. "
    "From the consultation transcript, extract structured notes. "
    "Return ONLY valid JSON with exactly these keys: "
    '"summary" (a one-sentence string), '
    '"symptoms" (array of short strings), '
    '"prescriptions" (array of short strings, medications or dosages), '
    '"actions" (array of short strings, follow-ups / referrals / tests). '
    "If a section has nothing, use an empty array. Do not invent details."
)

MOCK_NOTE = {
    "summary": "Sample note — add a GROQ_API_KEY (or start the backend) for real AI charting.",
    "symptoms": ["Right knee pain after running", "Mild swelling, 3 days"],
    "prescriptions": ["Ibuprofen 400mg, twice daily with food"],
    "actions": ["RICE protocol", "MRI if no improvement in 1 week", "Physio referral"],
    "engine": "mock",
    "transcript": "",
}


@app.get("/health")
@app.get("/api/health")
def health():
    return {"ok": True, "groq_configured": bool(GROQ_API_KEY)}


def transcribe(audio_bytes: bytes, filename: str) -> str:
    """Groq Whisper transcription."""
    resp = requests.post(
        f"{GROQ_BASE}/audio/transcriptions",
        headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
        files={"file": (filename or "audio.webm", audio_bytes, "application/octet-stream")},
        data={"model": WHISPER_MODEL, "response_format": "json"},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json().get("text", "").strip()


def structure(transcript: str) -> dict:
    """Groq Llama structuring into strict JSON."""
    resp = requests.post(
        f"{GROQ_BASE}/chat/completions",
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": LLM_MODEL,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": transcript},
            ],
        },
        timeout=60,
    )
    resp.raise_for_status()
    content = resp.json()["choices"][0]["message"]["content"]
    return json.loads(content)


@app.post("/api/chart")
@app.post("/chart")
def chart(audio: UploadFile = File(default=None), transcript: str = Form(default="")):
    """
    Accepts an audio file (preferred) and/or a text transcript.
    Returns structured clinical notes.
    """
    transcript_text = (transcript or "").strip()

    # No key configured -> return a labelled sample so the UI still works.
    if not GROQ_API_KEY:
        note = dict(MOCK_NOTE)
        note["transcript"] = transcript_text
        return note

    try:
        if audio is not None:
            audio_bytes = audio.file.read()
            if audio_bytes:
                transcript_text = transcribe(audio_bytes, audio.filename)

        if not transcript_text:
            return {**MOCK_NOTE, "engine": "mock",
                    "summary": "No speech detected — nothing to chart."}

        data = structure(transcript_text)
        return {
            "summary": data.get("summary", ""),
            "symptoms": data.get("symptoms", []),
            "prescriptions": data.get("prescriptions", []),
            "actions": data.get("actions", []),
            "transcript": transcript_text,
            "engine": "groq",
        }
    except Exception as e:  # noqa: BLE001 — always return something usable
        return {**MOCK_NOTE, "engine": "error", "summary": f"Charting failed: {e}",
                "transcript": transcript_text}
