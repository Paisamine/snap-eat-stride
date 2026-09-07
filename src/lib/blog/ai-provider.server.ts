// Modular, swappable AI provider for blog content generation.
// Server-only: never imported from client code. API keys are read inside calls.
//
// Configure with env vars:
//   BLOG_AI_PROVIDER = "lovable" (default) | "openai" | "custom"
//   BLOG_AI_MODEL    = model id override
//   OPENAI_API_KEY   = when provider = "openai"
//   BLOG_AI_BASE_URL + BLOG_AI_API_KEY = when provider = "custom"

type ProviderConfig = {
  name: string;
  url: string;
  model: string;
  headers: Record<string, string>;
};

export class AIProviderError extends Error {
  status: number;
  terminal: boolean;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    // Only 429 / 5xx are retryable.
    this.terminal = !(status === 429 || status >= 500);
  }
}

function resolveProvider(): ProviderConfig {
  const provider = (process.env["BLOG_AI_PROVIDER"] ?? "lovable").toLowerCase();

  if (provider === "openai") {
    const key = process.env["OPENAI_API_KEY"];
    if (!key) throw new AIProviderError(401, "OPENAI_API_KEY is not configured.");
    return {
      name: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      model: process.env["BLOG_AI_MODEL"] ?? "gpt-4o-mini",
      headers: { Authorization: `Bearer ${key}` },
    };
  }

  if (provider === "custom") {
    const base = process.env["BLOG_AI_BASE_URL"];
    const key = process.env["BLOG_AI_API_KEY"];
    if (!base || !key) throw new AIProviderError(401, "BLOG_AI_BASE_URL / BLOG_AI_API_KEY are not configured.");
    return {
      name: "custom",
      url: `${base.replace(/\/$/, "")}/chat/completions`,
      model: process.env["BLOG_AI_MODEL"] ?? "gpt-4o-mini",
      headers: { Authorization: `Bearer ${key}` },
    };
  }

  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new AIProviderError(401, "LOVABLE_API_KEY is not configured.");
  return {
    name: "lovable",
    url: "https://ai.gateway.lovable.dev/v1/chat/completions",
    model: process.env["BLOG_AI_MODEL"] ?? "google/gemini-3.7-flash",
    headers: { "Lovable-API-Key": key },
  };
}

function messageFor(status: number, body: string): string {
  if (status === 429) return "The AI service is rate limited right now. Please try again in a moment.";
  if (status === 402) return "AI credits are exhausted. Add credits to continue generating articles.";
  if (status === 403) return "AI access is blocked by workspace policy.";
  if (status === 401) return "The AI provider key is missing or invalid.";
  if (status === 400) return `The AI request was rejected: ${body.slice(0, 200)}`;
  return `AI service error (${status}): ${body.slice(0, 200)}`;
}

export async function generateJson<T = unknown>(opts: {
  system: string;
  user: string;
  maxOutputTokens?: number;
}): Promise<T> {
  const cfg = resolveProvider();
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...cfg.headers },
    body: JSON.stringify({
      model: cfg.model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      ...(cfg.name === "lovable" ? {} : { max_completion_tokens: opts.maxOutputTokens ?? 6000 }),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AIProviderError(res.status, messageFor(res.status, text));
  }

  const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = body.choices?.[0]?.message?.content ?? "{}";
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new AIProviderError(400, "The AI returned content that could not be read as JSON.");
  }
}

export async function generateFeaturedImage(prompt: string): Promise<string | null> {
  // Uses the Lovable gateway image endpoint when available; otherwise the caller
  // falls back to a curated stock image.
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) return null;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image",
        prompt,
        n: 1,
        size: "1200x630",
      }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
    const item = body.data?.[0];
    if (item?.url) return item.url;
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    return null;
  } catch {
    return null;
  }
}

export function providerName(): string {
  try {
    return resolveProvider().name;
  } catch {
    return "unconfigured";
  }
}
