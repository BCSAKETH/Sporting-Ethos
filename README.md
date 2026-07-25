# Ambient Charting backend (FastAPI + Groq)

Turns a consultation recording into structured clinical notes:

```
audio → Groq Whisper-large-v3 → transcript → Groq Llama 3.3 70B → { summary, symptoms, prescriptions, actions }
```

Runs fine **without** a key (returns a labelled sample), so the app always works.
Add a **free** Groq key to make it real.

## Run

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate      WSL/bash:  source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Make it real (free, no credit card)

1. Get a key at <https://console.groq.com/keys>.
2. Set it before starting uvicorn:
   - PowerShell: `$env:GROQ_API_KEY="gsk_..."`
   - WSL/bash: `export GROQ_API_KEY="gsk_..."`
3. Restart uvicorn. `GET http://localhost:8000/health` should show `"groq_configured": true`.

The frontend calls `http://localhost:8000` by default. Override with
`VITE_CHART_API_URL` in the app's `.env` if you host it elsewhere.

## Swap to Gemini later

Replace the `transcribe()` + `structure()` calls in `main.py` with a single
Gemini `generateContent` request (Gemini is multimodal, so it takes the audio
directly). The `/api/chart` contract stays identical, so the frontend needs no
changes.
