// Server-only blog content pipeline: topic discovery -> outline -> article -> SEO -> image -> validation.
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateJson, generateFeaturedImage, AIProviderError } from "./ai-provider.server";
import { readingTime, slugify, HEALTH_DISCLAIMER } from "./markdown";
import { validateArticle, similarity, VALID_INTERNAL_PATHS, type QualityReport } from "./validate";

type DB = SupabaseClient<any, any, any>;

export const CONTENT_TYPES = [
  "Educational Guide",
  "Food Calorie Guide",
  "Nutrition Guide",
  "Weight Management",
  "Healthy Recipe",
  "Fitness Guide",
  "FAQ Article",
  "Comparison Article",
] as const;

const SAFETY_RULES = `HEALTH SAFETY RULES (absolute):
- Educational and responsible only. Never suggest crash diets, starvation, fasting extremes, or calorie intakes below 1200 kcal/day.
- Never guarantee weight loss, never claim a food cures or treats disease, never diagnose, never recommend prescription medication.
- Never fabricate studies, citations, statistics or references. If you name a source, it must be a well-known authority (WHO, ICMR, NIH, USDA, NHS) referenced generally, without inventing a title, journal or year.
- Nutrition values vary by preparation and serving size: always use approximate language ("approximately", "roughly", "about", "varies with").
- Recommend consulting a qualified healthcare professional or registered dietitian where relevant.
- Distinguish established guidance from estimates.`;

const STYLE_RULES = `WRITING RULES:
- Warm, clear, practical. Short paragraphs. Grade 8-9 readability.
- Markdown body only: use "## " and "### " headings, "- " bullets, markdown tables for nutrition data, "> " for important callouts. No H1 in the body (the title is the H1).
- Include at least one nutrition table when food or calorie values are discussed.
- Include a short conclusion section.
- Prioritise locally relevant and Indian foods where the topic allows.
- Never stuff the focus keyword; use it naturally 3-6 times.`;

const LINK_RULES = `INTERNAL LINKS: choose 2-4 from this exact list only (never invent paths):
/analyze (AI Food Scanner), /nutrition (Personalized Diet Planner & Meal Planner), /home (Nutrition & Progress Dashboard), /history (Calorie History & Trends), /checkin (Weekly Weight Check-in), /profile (Health Profile).`;

export type GeneratedArticle = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  secondary_keywords: string[];
  faq: Array<{ q: string; a: string }>;
  sources: Array<{ label: string; note?: string }>;
  internal_links: Array<{ label: string; to: string }>;
  category_slug?: string;
  tags: string[];
  image_prompt: string;
};

const SCHEMA = `{
  "title": "string (50-70 chars, specific, no clickbait)",
  "slug": "kebab-case-slug",
  "excerpt": "80-180 chars summary",
  "content": "markdown body: intro paragraphs, ## sections, ### subsections, tables, > callouts, conclusion",
  "meta_title": "string <= 60 chars",
  "meta_description": "string 70-160 chars",
  "focus_keyword": "string",
  "secondary_keywords": ["string"],
  "faq": [{"q":"string","a":"string"}],
  "sources": [{"label":"authority name","note":"what it informs"}],
  "internal_links": [{"label":"string","to":"/analyze"}],
  "category_slug": "one of the provided category slugs",
  "tags": ["short tag"],
  "image_prompt": "photo description for the featured image"
}`;

export async function generateArticle(input: {
  topic: string;
  keyword?: string | null;
  categorySlug?: string | null;
  categorySlugs: string[];
  language?: string;
  targetWordCount?: number;
  contentType?: string;
  existingTitles: string[];
}): Promise<GeneratedArticle> {
  const outline = await generateJson<{ outline: string[]; angle: string; key_facts: string[] }>({
    system: `You plan health and nutrition articles.\n${SAFETY_RULES}\nRespond ONLY with JSON: {"angle":"string","outline":["H2 heading"],"key_facts":["fact with approximate values"]}`,
    user: `Topic: ${input.topic}
Target keyword: ${input.keyword ?? input.topic}
Content type: ${input.contentType ?? "Educational Guide"}
Audience: general readers tracking calories and health, many in India.
Existing articles (do NOT overlap heavily): ${input.existingTitles.slice(0, 40).join(" | ") || "none"}
Produce a distinct angle, 5-8 H2 headings, and 5-10 key factual points using approximate values.`,
  });

  const article = await generateJson<GeneratedArticle>({
    system: `You are a senior health & nutrition writer for "Calorie Count", an AI calorie tracking and diet planning app.
${SAFETY_RULES}
${STYLE_RULES}
${LINK_RULES}
Respond ONLY with valid JSON matching this schema:\n${SCHEMA}`,
    user: `Write the full article.

Topic: ${input.topic}
Target keyword: ${input.keyword ?? input.topic}
Content type: ${input.contentType ?? "Educational Guide"}
Language: ${input.language ?? "en"} (write in this language)
Target length: about ${input.targetWordCount ?? 1200} words
Angle: ${outline.angle}
Sections to cover: ${outline.outline.join(" | ")}
Key facts to use: ${outline.key_facts.join(" | ")}
Available category slugs: ${input.categorySlugs.join(", ")}

Include an FAQ of 3-5 questions. Return ONLY the JSON.`,
    maxOutputTokens: 8000,
  });

  return normalizeArticle(article);
}

export function normalizeArticle(a: Partial<GeneratedArticle>): GeneratedArticle {
  const title = (a.title ?? "Untitled article").trim();
  return {
    title,
    slug: slugify(a.slug || title),
    excerpt: (a.excerpt ?? "").trim(),
    content: (a.content ?? "").trim(),
    meta_title: (a.meta_title ?? title).slice(0, 60),
    meta_description: (a.meta_description ?? a.excerpt ?? "").slice(0, 160),
    focus_keyword: (a.focus_keyword ?? "").trim(),
    secondary_keywords: (a.secondary_keywords ?? []).filter(Boolean).slice(0, 8),
    faq: (a.faq ?? []).filter((f) => f && f.q && f.a).slice(0, 8),
    sources: (a.sources ?? []).filter(Boolean).slice(0, 8),
    internal_links: (a.internal_links ?? []).filter((l) => l && VALID_INTERNAL_PATHS.includes(l.to)).slice(0, 5),
    category_slug: a.category_slug ?? undefined,
    tags: (a.tags ?? []).filter(Boolean).slice(0, 6),
    image_prompt: a.image_prompt ?? `Clean editorial food photography for an article titled "${title}"`,
  };
}

const STOCK_IMAGES = [
  "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=1200&h=630&fit=crop",
  "https://images.unsplash.com/photo-1559181567-c3190ca9959b?w=1200&h=630&fit=crop",
];

export function fallbackImage(seed: string): string {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 9973;
  return STOCK_IMAGES[h % STOCK_IMAGES.length]!;
}

export async function resolveFeaturedImage(prompt: string, seed: string): Promise<string> {
  const generated = await generateFeaturedImage(
    `${prompt}. Editorial food/health photography, natural light, warm coffee-and-sand tones, no text, 1200x630.`,
  );
  if (generated && generated.startsWith("http")) return generated;
  return fallbackImage(seed);
}

/** AI topic discovery that avoids duplicates already in the database. */
export async function discoverTopics(db: DB, count = 6) {
  const [{ data: posts }, { data: ideas }, { data: cats }] = await Promise.all([
    db.from("blog_posts").select("title, slug, focus_keyword").order("created_at", { ascending: false }).limit(120),
    db.from("blog_topic_ideas").select("topic, slug_hint").order("created_at", { ascending: false }).limit(200),
    db.from("blog_categories").select("slug, name"),
  ]);

  const existingTitles = (posts ?? []).map((p: any) => p.title as string);
  const existingIdeas = (ideas ?? []).map((i: any) => i.topic as string);
  const categorySlugs = (cats ?? []).map((c: any) => c.slug as string);

  const month = new Date().toLocaleString("en-US", { month: "long" });

  const result = await generateJson<{ topics: Array<{ topic: string; keyword: string; category_slug: string; content_type: string; rationale?: string }> }>({
    system: `You plan an editorial calendar for a health, nutrition and calorie-tracking blog.
${SAFETY_RULES}
Prefer long-tail search queries real people type, local and culturally relevant foods (especially Indian staples), calorie guides, portion sizes, BMR/TDEE, hydration, walking, meal planning and seasonal topics for ${month}.
Never repeat or closely paraphrase an existing article or idea.
Respond ONLY with JSON: {"topics":[{"topic":"string","keyword":"string","category_slug":"string","content_type":"string","rationale":"string"}]}`,
    user: `Suggest ${count} genuinely new article topics.
Category slugs to choose from: ${categorySlugs.join(", ")}
Content types: ${CONTENT_TYPES.join(", ")}
Existing published/draft titles: ${existingTitles.join(" | ") || "none"}
Existing queued ideas: ${existingIdeas.join(" | ") || "none"}`,
  });

  const seen = [...existingTitles, ...existingIdeas];
  const fresh = (result.topics ?? [])
    .filter((t) => t?.topic)
    .filter((t) => !seen.some((s) => similarity(s.toLowerCase(), t.topic.toLowerCase()) > 0.72));

  const rows = fresh.map((t) => ({
    topic: t.topic,
    slug_hint: slugify(t.keyword || t.topic).slice(0, 90),
    keyword: t.keyword ?? null,
    category_slug: categorySlugs.includes(t.category_slug) ? t.category_slug : null,
    content_type: CONTENT_TYPES.includes(t.content_type as any) ? t.content_type : "Educational Guide",
  }));

  if (rows.length) {
    await db.from("blog_topic_ideas").upsert(rows, { onConflict: "slug_hint", ignoreDuplicates: true });
  }
  return rows;
}

function uniqueSlug(slug: string, taken: string[]) {
  if (!taken.includes(slug)) return slug;
  let n = 2;
  while (taken.includes(`${slug}-${n}`)) n++;
  return `${slug}-${n}`;
}

/** Full pipeline: produce a validated draft row in blog_posts. Returns the created post. */
export async function runGenerationPipeline(
  db: DB,
  opts: {
    topic: string;
    keyword?: string | null;
    categorySlug?: string | null;
    categoryId?: string | null;
    language?: string;
    targetWordCount?: number;
    contentType?: string;
    authorId?: string | null;
    triggeredBy?: string;
    autoPublish?: boolean;
  },
) {
  const { data: job } = await db
    .from("blog_generation_jobs")
    .insert({
      topic: opts.topic,
      keyword: opts.keyword ?? null,
      category_id: opts.categoryId ?? null,
      content_type: opts.contentType ?? null,
      language: opts.language ?? "en",
      target_word_count: opts.targetWordCount ?? 1200,
      status: "running",
      stage: "research",
      triggered_by: opts.triggeredBy ?? "manual",
    })
    .select("*")
    .single();

  const jobId = job?.id as string | undefined;
  const setStage = async (stage: string) => { if (jobId) await db.from("blog_generation_jobs").update({ stage }).eq("id", jobId); };

  try {
    const [{ data: cats }, { data: posts }] = await Promise.all([
      db.from("blog_categories").select("id, slug, name"),
      db.from("blog_posts").select("title, slug"),
    ]);
    const categories = (cats ?? []) as Array<{ id: string; slug: string; name: string }>;
    const existingTitles = (posts ?? []).map((p: any) => p.title as string);
    const existingSlugs = (posts ?? []).map((p: any) => p.slug as string);

    await setStage("writing");
    const article = await generateArticle({
      topic: opts.topic,
      keyword: opts.keyword,
      categorySlug: opts.categorySlug,
      categorySlugs: categories.map((c) => c.slug),
      language: opts.language,
      targetWordCount: opts.targetWordCount,
      contentType: opts.contentType,
      existingTitles,
    });

    await setStage("image");
    const image = await resolveFeaturedImage(article.image_prompt, article.slug);

    await setStage("validation");
    const report: QualityReport = validateArticle(
      { ...article, featured_image: image },
      { existingSlugs, existingTitles },
    );

    const categoryId =
      opts.categoryId ??
      categories.find((c) => c.slug === (opts.categorySlug ?? article.category_slug))?.id ??
      categories[0]?.id ??
      null;

    const publish = Boolean(opts.autoPublish) && report.passed;
    const slug = uniqueSlug(article.slug, existingSlugs);

    await setStage("saving");
    const { data: post, error } = await db
      .from("blog_posts")
      .insert({
        title: article.title,
        slug,
        excerpt: article.excerpt,
        content: article.content,
        featured_image: image,
        featured_image_alt: article.title,
        category_id: categoryId,
        author_id: opts.authorId ?? null,
        focus_keyword: article.focus_keyword,
        secondary_keywords: article.secondary_keywords,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
        status: publish ? "published" : "draft",
        content_type: opts.contentType ?? null,
        is_ai_generated: true,
        reading_time: readingTime(article.content),
        language: opts.language ?? "en",
        faq: article.faq,
        sources: article.sources,
        internal_links: article.internal_links,
        quality_report: report as any,
        needs_review: !report.passed,
        published_at: publish ? new Date().toISOString() : null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    // tags
    for (const name of article.tags) {
      const tagSlug = slugify(name);
      if (!tagSlug) continue;
      await db.from("blog_tags").upsert({ name, slug: tagSlug }, { onConflict: "slug", ignoreDuplicates: true });
      const { data: tag } = await db.from("blog_tags").select("id").eq("slug", tagSlug).maybeSingle();
      if (tag?.id) await db.from("blog_post_tags").upsert({ post_id: post.id, tag_id: tag.id }, { ignoreDuplicates: true });
    }

    await db.from("blog_revisions").insert({
      post_id: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      version: 1,
      note: "Initial AI generation",
    });

    if (jobId)
      await db.from("blog_generation_jobs").update({
        status: "completed",
        stage: "done",
        post_id: post.id,
        generated_content: { quality: report } as any,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);

    return { post, report, disclaimer: HEALTH_DISCLAIMER };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (jobId)
      await db.from("blog_generation_jobs").update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      }).eq("id", jobId);
    if (err instanceof AIProviderError) throw err;
    throw new Error(message);
  }
}

/** Flags stale published articles for review and returns what was flagged. */
export async function markStaleForReview(db: DB, olderThanDays = 180, limit = 5) {
  const cutoff = new Date(Date.now() - olderThanDays * 86400000).toISOString();
  const { data: posts } = await db
    .from("blog_posts")
    .select("id, title, slug, content, updated_at, faq, internal_links, meta_description")
    .eq("status", "published")
    .lt("updated_at", cutoff)
    .eq("needs_review", false)
    .limit(limit);

  const flagged: Array<{ slug: string; reasons: string[] }> = [];
  for (const p of (posts ?? []) as any[]) {
    const reasons: string[] = [];
    const words = String(p.content ?? "").split(/\s+/).length;
    if (words < 600) reasons.push("Article is short and could be expanded.");
    if (!Array.isArray(p.faq) || p.faq.length === 0) reasons.push("Missing FAQ section.");
    if (!Array.isArray(p.internal_links) || p.internal_links.length === 0) reasons.push("No internal links to Calorie Count tools.");
    if (!p.meta_description) reasons.push("Missing meta description.");
    for (const m of String(p.content ?? "").matchAll(/\]\((\/[a-z0-9\-/]*)\)/g)) {
      const to = m[1]!;
      if (!VALID_INTERNAL_PATHS.includes(to) && !to.startsWith("/blog/")) reasons.push(`Broken internal link ${to}.`);
    }
    reasons.push("Content is older than 6 months; nutrition guidance should be re-checked.");
    await db.from("blog_posts").update({ needs_review: true, quality_report: { passed: false, checkedAt: new Date().toISOString(), issues: reasons.map((r) => ({ field: "freshness", severity: "warning", message: r })) } as any }).eq("id", p.id);
    flagged.push({ slug: p.slug, reasons });
  }
  return flagged;
}
