// AI triage: map a patient's described symptoms to the best OPD department.
// Uses Groq (Llama 3.3 70B) when EXPO_PUBLIC_GROQ_API_KEY is set, and falls
// back to a keyword matcher so it always returns something offline.

const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? "";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const LLM = "llama-3.3-70b-versatile";

// Transcribe an Expo audio recording via Groq Whisper. Uses the client key when
// present; otherwise falls back to a public backend proxy if one is configured.
export async function transcribeAudio(uri: string): Promise<string> {
  const form = new FormData();
  // React Native FormData file part — exact shape Groq/Whisper expects.
  form.append("file", { uri, name: "recording.m4a", type: "audio/m4a" } as unknown as Blob);
  form.append("model", "whisper-large-v3");

  if (!GROQ_KEY) {
    const proxy = process.env.EXPO_PUBLIC_TRANSCRIBE_PROXY;
    if (!proxy) return "";
    const res = await fetch(proxy, { method: "POST", body: form });
    if (!res.ok) return "";
    const d = await res.json();
    return (d.text as string) ?? "";
  }

  const res = await fetch(WHISPER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${GROQ_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Groq STT ${res.status}`);
  const d = await res.json();
  return (d.text as string) ?? "";
}

export interface TriageDept {
  id: string;
  name: string;
}

export interface TriageResult {
  departmentId: string | null;
  departmentName: string;
  reason: string;
}

const HELP: TriageResult = {
  departmentId: null,
  departmentName: "Reception Help Desk",
  reason: "Please see reception for guidance.",
};

const RULES: Array<[RegExp, string[]]> = [
  [/heart|chest pain|palpitation|bp|blood pressure|cardiac/, ["cardio"]],
  [/bone|fracture|joint|knee|shoulder|back pain|sprain|orthop/, ["ortho"]],
  [/child|baby|infant|kid|paediatr|pediatr/, ["peds", "paediatr", "pediatr", "child"]],
  [/skin|rash|acne|itch|derma/, ["derma", "skin"]],
  [/head|brain|seizure|migraine|numb|stroke|neuro/, ["neuro"]],
  [/eye|vision|ophthal/, ["ophthal", "eye"]],
  [/tooth|teeth|dental|gum/, ["dental"]],
  [/ear|nose|throat|sinus|ent\b/, ["ent"]],
  [/fever|cold|cough|flu|general|body ache|weakness/, ["general"]],
];

function keywordSuggest(symptoms: string, departments: TriageDept[]): TriageResult {
  const s = symptoms.toLowerCase();
  for (const [re, keys] of RULES) {
    if (re.test(s)) {
      const dept = departments.find((d) => keys.some((k) => d.name.toLowerCase().includes(k)));
      if (dept) return { departmentId: dept.id, departmentName: dept.name, reason: "Matched from your symptoms." };
    }
  }
  const gen = departments.find((d) => /general/i.test(d.name));
  if (gen) return { departmentId: gen.id, departmentName: gen.name, reason: "A general assessment is recommended." };
  return HELP;
}

export async function suggestDepartment(symptoms: string, departments: TriageDept[]): Promise<TriageResult> {
  const list = departments.map((d) => ({ id: d.id, name: d.name }));
  const trimmed = symptoms.trim();
  if (!trimmed) return HELP;
  if (!GROQ_KEY) return keywordSuggest(trimmed, list);

  try {
    const deptText = list.map((d) => `${d.name} (id:${d.id})`).join("; ");
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: LLM,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `You are a hospital OPD triage assistant. Departments available: ${deptText}. ` +
              `From the patient's described symptoms, pick the single most appropriate department. ` +
              `Return ONLY JSON: {"department_id":"<exact id or empty>","department_name":"<name>","reason":"<one short sentence>"}.`,
          },
          { role: "user", content: trimmed },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Groq ${res.status}`);
    const data = await res.json();
    const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    const match =
      list.find((d) => d.id === parsed.department_id) ||
      list.find((d) => d.name.toLowerCase() === String(parsed.department_name ?? "").toLowerCase());
    if (!match) return keywordSuggest(trimmed, list);
    return { departmentId: match.id, departmentName: match.name, reason: String(parsed.reason ?? "Suggested by AI triage.") };
  } catch {
    return keywordSuggest(trimmed, list);
  }
}
