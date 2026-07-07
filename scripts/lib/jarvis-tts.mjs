/**
 * Voz OpenAI (TTS) — voz original da API, não do Windows/Edge.
 */
const VOICES = ["nova", "alloy", "echo", "fable", "onyx", "shimmer"];

export function listJarvisTtsVoices() {
  return VOICES.map((id) => ({
    id,
    label:
      id === "nova"
        ? "Nova (OpenAI · recomendada)"
        : id === "alloy"
          ? "Alloy (OpenAI)"
          : id === "echo"
            ? "Echo (OpenAI)"
            : id === "fable"
              ? "Fable (OpenAI)"
              : id === "onyx"
                ? "Onyx (OpenAI · grave)"
                : "Shimmer (OpenAI)",
  }));
}

export async function synthesizeJarvisSpeech(text, { voice = "nova" } = {}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY ausente");
  }

  const clean = String(text || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
  if (!clean) throw new Error("Texto vazio");

  const chosen = VOICES.includes(voice) ? voice : "nova";

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: chosen,
      input: clean,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    // fallback modelo antigo
    const res2 = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: chosen,
        input: clean,
        response_format: "mp3",
      }),
    });
    if (!res2.ok) {
      const err = await res2.text();
      throw new Error(err.slice(0, 200) || res2.statusText);
    }
    const buf2 = Buffer.from(await res2.arrayBuffer());
    return { buffer: buf2, contentType: "audio/mpeg", voice: chosen, model: "tts-1" };
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return { buffer: buf, contentType: "audio/mpeg", voice: chosen, model: "gpt-4o-mini-tts" };
}
