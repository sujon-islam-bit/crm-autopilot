import "server-only";

/**
 * The AI provider layer — ONE place that knows which model answers.
 * Today: Gemini (free tier) via its REST API, the same provider
 * BuilderAI runs on. Switching providers later (OpenAI, Claude) is a
 * change to this file + env, nowhere else — Sujon's standing rule.
 */

export type AiMessage = { role: "system" | "user"; content: string };

function provider(): string {
  return (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
}

export function aiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

export async function aiComplete(messages: AiMessage[]): Promise<string> {
  if (provider() !== "gemini") {
    throw new Error(`AI provider "${provider()}" is not wired yet — gemini is.`);
  }
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("AI_API_KEY is not set");
  const model = process.env.AI_MODEL ?? "gemini-3.5-flash-lite";

  const system = messages.find((m) => m.role === "system")?.content;
  const userText = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content)
    .join("\n\n");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: "user", parts: [{ text: userText }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI request failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("AI returned an empty answer");
  return text;
}

/** Parse a JSON value out of a model answer (tolerates code fences). */
export function parseAiJson<T>(text: string): T | null {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
