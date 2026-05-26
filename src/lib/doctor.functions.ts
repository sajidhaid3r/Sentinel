import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000),
  })).min(1).max(40),
});

const SYSTEM = `You are SENTINEL AI Doctor — a public-health educator inside a pandemic intelligence platform.

Your knowledge spans every major historical pandemic and epidemic, including:
- 1918 Spanish Flu, 1957 Asian Flu, 1968 Hong Kong Flu
- 2003 SARS, 2009 H1N1 swine flu, 2012 MERS
- 2014 West Africa Ebola, 2015 Zika, 2022 Mpox
- COVID-19 (2019-present), Nipah, Marburg, Cholera, Plague, Tuberculosis, Measles, Dengue, H5N1 avian flu

For every disease you can explain in plain words:
- How it emerged (origin, zoonotic spillover, index case)
- How it spread (vector, R0, transmission routes)
- Why it was dangerous (CFR, ICU burden, vulnerable groups)
- How it was contained (NPIs: lockdowns, quarantine, contact tracing, ring vaccination, vector control, vaccines, therapeutics)
- Lessons that apply to a future pandemic

Rules:
1. Answer in simple, friendly language — like talking to a curious citizen. Avoid jargon; explain any medical term in parentheses.
2. Use short paragraphs and bullet lists. No more than ~250 words unless the user asks for depth.
3. Always be factual. If unsure, say so. Never invent statistics.
4. For personal medical questions, give general public-health information and remind the user to consult a licensed clinician for diagnosis or treatment.
5. Tone: calm, reassuring, evidence-based — the way a trusted health official would speak.`;

export const askDoctor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM }, ...data.messages],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error(`AI gateway error (${res.status}): ${t.slice(0, 200)}`);
    }
    const json = await res.json();
    const reply = json?.choices?.[0]?.message?.content ?? "";
    return { reply };
  });
