import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  imageBase64: z.string().min(20),
  mimeType: z.string().default("image/jpeg"),
});

const AnalysisSchema = z.object({
  food_name: z.string(),
  items: z.array(z.object({ name: z.string(), quantity: z.string().optional() })).optional().default([]),
  portion_size: z.string().optional().default(""),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  health_score: z.number().min(0).max(100),
  is_healthy: z.boolean(),
  confidence: z.number().min(0).max(1),
  tips: z.array(z.string()).default([]),
  alternatives: z.array(z.string()).default([]),
});

export type AnalysisResult = z.infer<typeof AnalysisSchema> & {
  steps_needed: number;
  walking_minutes: number;
};

const SYSTEM = `You are a nutritionist AI. Given a photo of food, identify items, estimate portion size, calories and macros. Be realistic; if the image is not clearly food, say so via low confidence and food_name="Unknown". Respond ONLY with valid JSON matching the schema.`;

const SCHEMA_HINT = `{
  "food_name": "string",
  "items": [{"name":"string","quantity":"string"}],
  "portion_size": "string (e.g. '1 bowl, ~300g')",
  "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number,
  "health_score": number (0-100),
  "is_healthy": boolean,
  "confidence": number (0-1),
  "tips": ["short tip", ...],
  "alternatives": ["lower-cal alternative", ...]
}`;

export const analyzeFood = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const dataUrl = data.imageBase64.startsWith("data:")
      ? data.imageBase64
      : `data:${data.mimeType};base64,${data.imageBase64}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM + "\nSchema: " + SCHEMA_HINT },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyze this meal. Return ONLY the JSON." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("AI rate limit reached. Please try again in a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in workspace settings.");
      throw new Error(`AI error: ${res.status} ${text.slice(0, 200)}`);
    }

    const body = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const raw = body.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch { throw new Error("AI returned invalid JSON"); }

    const analysis = AnalysisSchema.parse(parsed);
    const steps_needed = Math.round(analysis.calories * 20);
    const walking_minutes = Math.round(steps_needed / 120);

    return { ...analysis, steps_needed, walking_minutes };
  });
