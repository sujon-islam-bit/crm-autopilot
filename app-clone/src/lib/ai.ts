import "server-only";

// Gemini REST provider layer. AI_PROVIDER/AI_MODEL/AI_API_KEY env-gated so the
// model can be swapped in one place. JSON response mode, low temperature.
export async function askAiJson(prompt: string): Promise<unknown | null> {
  const key = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || "gemini-3.5-flash-lite";
  if (!key) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return parseAiJson(text);
  } catch {
    return null;
  }
}

export function parseAiJson(text: string): unknown | null {
  if (!text) return null;
  let t = text.trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("[");
    const objStart = t.indexOf("{");
    const from = start >= 0 && (objStart < 0 || start < objStart) ? start : objStart;
    if (from >= 0) {
      const end = Math.max(t.lastIndexOf("]"), t.lastIndexOf("}"));
      if (end > from) {
        try {
          return JSON.parse(t.slice(from, end + 1));
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}
