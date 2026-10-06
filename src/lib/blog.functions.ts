import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { HEALTH_DISCLAIMER, readingTime, slugify } from "./blog/markdown";
import { validateArticle } from "./blog/validate";

const POST_LIST_COLUMNS =
  "id, title, slug, excerpt, featured_image, featured_image_alt, category_id, author_name, reading_time, language, is_featured, view_count, published_at, updated_at, content_type";

const POST_FULL_COLUMNS = `${POST_LIST_COLUMNS}, content, focus_keyword, secondary_keywords, meta_title, meta_description, canonical_url, faq, sources, internal_links, status, created_at`;

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/* ---------------------------------- public --------------------------------- */

const ListInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(24).default(9),
  category: z.string().optional(),
  tag: z.string().optional(),
  search: z.string().max(120).optional(),
});

export const listBlogPosts = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => ListInput.parse(i ?? {}))
  .handler(async ({ data }) => {
    const db = publicClient();
    let postIds: string[] | null = null;

    if (data.tag) {
      const { data: tag } = await db.from("blog_tags").select("id").eq("slug", data.tag).maybeSingle();
      if (!tag) return { posts: [], total: 0, page: data.page, pageSize: data.pageSize };
      const { data: links } = await db.from("blog_post_tags").select("post_id").eq("tag_id", tag.id);
      postIds = (links ?? []).map((l) => l.post_id);
      if (!postIds.length) return { posts: [], total: 0, page: data.page, pageSize: data.pageSize };
    }

    let query = db
      .from("blog_posts")
      .select(POST_LIST_COLUMNS, { count: "exact" })
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (data.category) {
      const { data: cat } = await db.from("blog_categories").select("id").eq("slug", data.category).maybeSingle();
      if (!cat) return { posts: [], total: 0, page: data.page, pageSize: data.pageSize };
      query = query.eq("category_id", cat.id);
    }
    if (postIds) query = query.in("id", postIds);
    if (data.search) query = query.or(`title.ilike.%${data.search}%,excerpt.ilike.%${data.search}%,focus_keyword.ilike.%${data.search}%`);

    const from = (data.page - 1) * data.pageSize;
    const { data: posts, count, error } = await query.range(from, from + data.pageSize - 1);
    if (error) throw new Error(error.message);
    return { posts: posts ?? [], total: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const getBlogHome = createServerFn({ method: "GET" }).handler(async () => {
  const db = publicClient();
  const [{ data: categories }, { data: tags }, { data: featured }, { data: latest }, { data: popular }, { data: updated }] =
    await Promise.all([
      db.from("blog_categories").select("id, name, slug, description, sort_order").order("sort_order"),
      db.from("blog_tags").select("id, name, slug").order("name").limit(20),
      db.from("blog_posts").select(POST_LIST_COLUMNS).eq("status", "published").eq("is_featured", true).order("published_at", { ascending: false }).limit(1),
      db.from("blog_posts").select(POST_LIST_COLUMNS).eq("status", "published").order("published_at", { ascending: false }).limit(9),
      db.from("blog_posts").select(POST_LIST_COLUMNS).eq("status", "published").order("view_count", { ascending: false }).limit(5),
      db.from("blog_posts").select(POST_LIST_COLUMNS).eq("status", "published").order("updated_at", { ascending: false }).limit(5),
    ]);

  const hero = featured?.[0] ?? latest?.[0] ?? null;
  return {
    categories: categories ?? [],
    tags: tags ?? [],
    featured: hero,
    latest: (latest ?? []).filter((p) => p.id !== hero?.id),
    popular: popular ?? [],
    recentlyUpdated: updated ?? [],
  };
});

export const getBlogPost = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(i))
  .handler(async ({ data }) => {
    const db = publicClient();
    const { data: post } = await db.from("blog_posts").select(POST_FULL_COLUMNS).eq("slug", data.slug).eq("status", "published").maybeSingle();
    if (!post) return null;

    const [{ data: category }, { data: tagLinks }, { data: related }] = await Promise.all([
      post.category_id
        ? db.from("blog_categories").select("id, name, slug").eq("id", post.category_id).maybeSingle()
        : Promise.resolve({ data: null } as any),
      db.from("blog_post_tags").select("tag_id").eq("post_id", post.id),
      db
        .from("blog_posts")
        .select(POST_LIST_COLUMNS)
        .eq("status", "published")
        .neq("id", post.id)
        .eq("category_id", post.category_id ?? "")
        .order("published_at", { ascending: false })
        .limit(3),
    ]);

    let tags: Array<{ name: string; slug: string }> = [];
    const ids = (tagLinks ?? []).map((t: any) => t.tag_id);
    if (ids.length) {
      const { data: t } = await db.from("blog_tags").select("name, slug").in("id", ids);
      tags = t ?? [];
    }

    let relatedPosts = related ?? [];
    if (relatedPosts.length < 3) {
      const { data: fill } = await db
        .from("blog_posts")
        .select(POST_LIST_COLUMNS)
        .eq("status", "published")
        .neq("id", post.id)
        .order("published_at", { ascending: false })
        .limit(4);
      const seen = new Set(relatedPosts.map((p) => p.id));
      relatedPosts = [...relatedPosts, ...(fill ?? []).filter((p) => !seen.has(p.id))].slice(0, 3);
    }

    return { post, category, tags, related: relatedPosts };
  });

export const trackBlogView = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ slug: z.string().min(1).max(200), referrerHost: z.string().max(120).optional() }).parse(i))
  .handler(async ({ data }) => {
    const db = publicClient();
    await db.rpc("increment_blog_view", { _slug: data.slug, _referrer_host: data.referrerHost ?? null } as any);
    return { ok: true };
  });

/* ---------------------------------- admin ---------------------------------- */

async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" } as any);
  if (error || !data) throw new Error("Forbidden: administrator access required.");
}

export const getMyBlogAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" } as any);
    return { isAdmin: Boolean(data) };
  });

/** First signed-in user can claim admin when no admin exists yet. */
export const claimBlogAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An administrator already exists for this site.");
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { isAdmin: true };
  });

export const getAdminBlogOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = context.supabase;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();

    const counts = async (build: (q: any) => any) => {
      const { count } = await build(db.from("blog_posts").select("id", { count: "exact", head: true }));
      return count ?? 0;
    };

    const [total, published, drafts, scheduled, ai, thisMonth, thisWeek, needsReview] = await Promise.all([
      counts((q: any) => q),
      counts((q: any) => q.eq("status", "published")),
      counts((q: any) => q.eq("status", "draft")),
      counts((q: any) => q.eq("status", "scheduled")),
      counts((q: any) => q.eq("is_ai_generated", true)),
      counts((q: any) => q.gte("created_at", monthStart)),
      counts((q: any) => q.gte("created_at", weekStart)),
      counts((q: any) => q.eq("needs_review", true)),
    ]);

    const [{ data: posts }, { data: categories }, { data: settings }, { data: jobs }, { data: ideas }] = await Promise.all([
      db.from("blog_posts").select(`${POST_LIST_COLUMNS}, status, is_ai_generated, needs_review, quality_report, scheduled_for, focus_keyword, meta_title, meta_description`).order("created_at", { ascending: false }).limit(60),
      db.from("blog_categories").select("id, name, slug").order("sort_order"),
      db.from("blog_automation_settings").select("*").eq("singleton", true).maybeSingle(),
      db.from("blog_generation_jobs").select("*").order("created_at", { ascending: false }).limit(12),
      db.from("blog_topic_ideas").select("*").eq("status", "idea").order("created_at", { ascending: false }).limit(25),
    ]);

    return {
      stats: { total, published, drafts, scheduled, ai, thisMonth, thisWeek, needsReview },
      posts: posts ?? [],
      categories: categories ?? [],
      settings,
      jobs: jobs ?? [],
      ideas: ideas ?? [],
    };
  });

const GenerateInput = z.object({
  topic: z.string().min(4).max(300),
  keyword: z.string().max(120).optional(),
  categoryId: z.string().uuid().optional(),
  language: z.string().min(2).max(10).default("en"),
  targetWordCount: z.number().int().min(500).max(3000).default(1200),
  contentType: z.string().max(60).default("Educational Guide"),
  publishNow: z.boolean().default(false),
});

export const generateBlogArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => GenerateInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { runGenerationPipeline } = await import("./blog/generate.server");
    const result = await runGenerationPipeline(supabaseAdmin as any, {
      topic: data.topic,
      keyword: data.keyword ?? null,
      categoryId: data.categoryId ?? null,
      language: data.language,
      targetWordCount: data.targetWordCount,
      contentType: data.contentType,
      authorId: context.userId,
      triggeredBy: "manual",
      autoPublish: data.publishNow,
    });
    return { post: result.post, report: result.report };
  });

export const discoverBlogTopics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { discoverTopics } = await import("./blog/generate.server");
    const topics = await discoverTopics(supabaseAdmin as any, 6);
    return { topics };
  });

const UpdatePostInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(200).optional(),
  excerpt: z.string().max(400).optional(),
  content: z.string().optional(),
  category_id: z.string().uuid().nullable().optional(),
  featured_image: z.string().url().nullable().optional(),
  meta_title: z.string().max(80).optional(),
  meta_description: z.string().max(200).optional(),
  focus_keyword: z.string().max(120).optional(),
  is_featured: z.boolean().optional(),
  needs_review: z.boolean().optional(),
  tags: z.array(z.string().max(40)).max(8).optional(),
});

export const updateBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdatePostInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { id, tags, ...patch } = data;
    const db = context.supabase;

    const { data: current } = await db.from("blog_posts").select("*").eq("id", id).maybeSingle();
    if (!current) throw new Error("Article not found");

    if (patch.content && patch.content !== current.content) {
      // preserve the previous version before overwriting
      await db.from("blog_revisions").insert({
        post_id: id,
        title: current.title,
        content: current.content,
        excerpt: current.excerpt,
        version: current.version,
        note: current.status === "published" ? "Previous published version" : "Previous draft",
      });
      const { readingTime } = await import("./blog/markdown");
      (patch as any).reading_time = readingTime(patch.content);
      (patch as any).version = (current.version ?? 1) + 1;
    }

    const { data: updated, error } = await db.from("blog_posts").update(patch as any).eq("id", id).select("*").single();
    if (error) throw new Error(error.message);

    if (tags) {
      const { slugify } = await import("./blog/markdown");
      await db.from("blog_post_tags").delete().eq("post_id", id);
      for (const name of tags) {
        const slug = slugify(name);
        if (!slug) continue;
        await db.from("blog_tags").upsert({ name, slug }, { onConflict: "slug", ignoreDuplicates: true });
        const { data: tag } = await db.from("blog_tags").select("id").eq("slug", slug).maybeSingle();
        if (tag?.id) await db.from("blog_post_tags").insert({ post_id: id, tag_id: tag.id });
      }
    }
    return updated;
  });

const StatusInput = z.object({
  id: z.string().uuid(),
  action: z.enum(["publish", "unpublish", "schedule", "delete", "needs_review"]),
  scheduledFor: z.string().datetime().optional(),
});

export const setBlogPostStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => StatusInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = context.supabase;
    if (data.action === "delete") {
      const { error } = await db.from("blog_posts").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, deleted: true };
    }

    const { data: post } = await db.from("blog_posts").select("*").eq("id", data.id).maybeSingle();
    if (!post) throw new Error("Article not found");

    if (data.action === "publish") {
      const { validateArticle } = await import("./blog/validate");
      const report = validateArticle(post as any);
      const { error } = await db
        .from("blog_posts")
        .update({
          status: "published",
          published_at: post.published_at ?? new Date().toISOString(),
          scheduled_for: null,
          needs_review: !report.passed,
          quality_report: report as any,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, report };
    }
    if (data.action === "unpublish") {
      const { error } = await db.from("blog_posts").update({ status: "draft" }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    if (data.action === "schedule") {
      if (!data.scheduledFor) throw new Error("Pick a date and time to schedule.");
      const { error } = await db.from("blog_posts").update({ status: "scheduled", scheduled_for: data.scheduledFor }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { error } = await db.from("blog_posts").update({ needs_review: true }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const RegenInput = z.object({ id: z.string().uuid(), part: z.enum(["title", "seo", "image", "article"]) });

export const regenerateBlogPart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RegenInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = context.supabase;
    const { data: post } = await db.from("blog_posts").select("*").eq("id", data.id).maybeSingle();
    if (!post) throw new Error("Article not found");

    const { generateJson } = await import("./blog/ai-provider.server");

    if (data.part === "image") {
      const { resolveFeaturedImage } = await import("./blog/generate.server");
      const image = await resolveFeaturedImage(`Featured image for "${post.title}"`, `${post.slug}-${Date.now()}`);
      await db.from("blog_posts").update({ featured_image: image, featured_image_alt: post.title }).eq("id", data.id);
      return { featured_image: image };
    }

    if (data.part === "title") {
      const r = await generateJson<{ title: string }>({
        system: 'You improve health article headlines. No clickbait, no health guarantees. Respond ONLY {"title":"string"} of 50-70 characters.',
        user: `Current title: ${post.title}\nFocus keyword: ${post.focus_keyword ?? ""}\nExcerpt: ${post.excerpt ?? ""}`,
      });
      await db.from("blog_posts").update({ title: r.title }).eq("id", data.id);
      return { title: r.title };
    }

    if (data.part === "seo") {
      const r = await generateJson<{ meta_title: string; meta_description: string; focus_keyword: string; secondary_keywords: string[] }>({
        system: 'You write SEO metadata for health articles. Respond ONLY {"meta_title":"<=60 chars","meta_description":"70-160 chars","focus_keyword":"string","secondary_keywords":["string"]}',
        user: `Title: ${post.title}\nExcerpt: ${post.excerpt ?? ""}\nBody start: ${String(post.content).slice(0, 1500)}`,
      });
      await db
        .from("blog_posts")
        .update({
          meta_title: r.meta_title.slice(0, 60),
          meta_description: r.meta_description.slice(0, 160),
          focus_keyword: r.focus_keyword,
          secondary_keywords: r.secondary_keywords ?? [],
        })
        .eq("id", data.id);
      return r;
    }

    // full rewrite -> stored as a new draft revision on the same post
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generateArticle, normalizeArticle } = await import("./blog/generate.server");
    const { validateArticle } = await import("./blog/validate");
    const { readingTime } = await import("./blog/markdown");
    const { data: cats } = await db.from("blog_categories").select("slug");
    const fresh = normalizeArticle(
      await generateArticle({
        topic: post.title,
        keyword: post.focus_keyword,
        categorySlugs: (cats ?? []).map((c: any) => c.slug),
        language: post.language,
        targetWordCount: 1300,
        contentType: post.content_type ?? "Educational Guide",
        existingTitles: [],
      }),
    );
    await supabaseAdmin.from("blog_revisions").insert({
      post_id: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      version: post.version,
      note: "Version before AI refresh",
    });
    const report = validateArticle({ ...fresh, featured_image: post.featured_image });
    const { data: updated, error } = await db
      .from("blog_posts")
      .update({
        content: fresh.content,
        excerpt: fresh.excerpt,
        faq: fresh.faq,
        sources: fresh.sources,
        internal_links: fresh.internal_links,
        meta_title: fresh.meta_title,
        meta_description: fresh.meta_description,
        reading_time: readingTime(fresh.content),
        version: (post.version ?? 1) + 1,
        quality_report: report as any,
        needs_review: !report.passed,
        status: post.status === "published" ? "published" : "draft",
      })
      .eq("id", post.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { post: updated, report };
  });

export const getBlogRevisions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ postId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: revisions } = await context.supabase
      .from("blog_revisions")
      .select("id, title, version, note, created_at")
      .eq("post_id", data.postId)
      .order("version", { ascending: false });
    return revisions ?? [];
  });

const SettingsInput = z.object({
  enabled: z.boolean().optional(),
  posts_per_week: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(5), z.literal(7)]).optional(),
  auto_publish: z.boolean().optional(),
  default_language: z.string().min(2).max(10).optional(),
  target_word_count: z.number().int().min(500).max(3000).optional(),
  preferred_categories: z.array(z.string()).max(12).optional(),
  content_calendar: z.array(z.object({ day: z.string(), category_slug: z.string() })).max(7).optional(),
  clearPause: z.boolean().optional(),
});

export const updateBlogAutomation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SettingsInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { clearPause, ...patch } = data;
    const update: Record<string, unknown> = { ...patch };
    if (clearPause) {
      update["paused_reason"] = null;
      update["paused_at"] = null;
    }
    const { data: settings, error } = await context.supabase
      .from("blog_automation_settings")
      .update(update as any)
      .eq("singleton", true)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return settings;
  });

export const runContentFreshnessScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { markStaleForReview } = await import("./blog/generate.server");
    const flagged = await markStaleForReview(supabaseAdmin as any, 180, 5);
    return { flagged };
  });

/* ------------------------------- ad settings ------------------------------- */

const AD_COLUMNS =
  "enabled, publisher_id, slot_header, slot_in_article, slot_footer, slot_sidebar, show_to_signed_in, contact_email";

export const getAdSettings = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await (publicClient() as any)
      .from("blog_ad_settings")
      .select(AD_COLUMNS)
      .eq("singleton", true)
      .maybeSingle();
    return (data ?? null) as AdSettingsRow | null;
  });

export type AdSettingsRow = {
  enabled: boolean;
  publisher_id: string | null;
  slot_header: string | null;
  slot_in_article: string | null;
  slot_footer: string | null;
  slot_sidebar: string | null;
  show_to_signed_in: boolean;
  contact_email: string | null;
};

const slotId = z
  .string()
  .trim()
  .max(20)
  .refine((v) => v === "" || /^\d{6,20}$/.test(v), { message: "Ad unit ID should be digits only." })
  .default("");

const AdSettingsInput = z.object({
  enabled: z.boolean(),
  publisher_id: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === "" || /^ca-pub-\d{6,20}$/.test(v), {
      message: "Publisher ID should look like ca-pub-1234567890123456.",
    })
    .default(""),
  slot_header: slotId,
  slot_in_article: slotId,
  slot_footer: slotId,
  slot_sidebar: slotId,
  show_to_signed_in: z.boolean().default(false),
  contact_email: z
    .string()
    .trim()
    .max(160)
    .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), { message: "Enter a valid contact email." })
    .default(""),
});

export const updateAdSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => AdSettingsInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const patch = {
      enabled: data.enabled,
      publisher_id: data.publisher_id || null,
      slot_header: data.slot_header || null,
      slot_in_article: data.slot_in_article || null,
      slot_footer: data.slot_footer || null,
      slot_sidebar: data.slot_sidebar || null,
      show_to_signed_in: data.show_to_signed_in,
      contact_email: data.contact_email || null,
    };
    const { data: row, error } = await (context.supabase as any)
      .from("blog_ad_settings")
      .update(patch)
      .eq("singleton", true)
      .select(AD_COLUMNS)
      .single();
    if (error) throw new Error(error.message);
    return row as AdSettingsRow;
  });

/* --------------------------- manual article paste -------------------------- */

const PasteInput = z.object({
  title: z.string().trim().min(15).max(200),
  content: z.string().min(200).max(60000),
  excerpt: z.string().trim().max(400).optional(),
  category_slug: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  featured_image: z.union([z.string().trim().url().max(600), z.literal("")]).optional(),
  focus_keyword: z.string().trim().max(80).optional(),
  meta_title: z.string().trim().max(120).optional(),
  meta_description: z.string().trim().max(200).optional(),
  slug: z.string().trim().max(120).optional(),
  language: z.string().trim().max(8).default("en"),
  status: z.enum(["draft", "published"]).default("draft"),
  is_featured: z.boolean().default(false),
});

function firstParagraph(md: string) {
  const para = md
    .split(/\n\s*\n/)
    .find((p) => p.trim() && !/^(#{2,4}|\||>|\s*[-*]|\s*\d+\.)/.test(p.trim()));
  return (para ?? "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`#]/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Stores an article typed or pasted by an editor. It goes through the same
 * quality, safety and SEO checks as AI-generated articles, and always carries
 * the health disclaimer. Anything that fails a hard check is kept as a draft.
 */
export const createBlogPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => PasteInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = context.supabase as any;

    const body = data.content.trim();
    const content = body.includes(HEALTH_DISCLAIMER) ? body : `${body}\n\n---\n\n> ${HEALTH_DISCLAIMER}`;

    const base = slugify(data.slug || data.title) || "article";
    let slug = base;
    for (let n = 2; n < 30; n++) {
      const { data: hit } = await db.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
      if (!hit) break;
      slug = `${base}-${n}`;
    }

    let categoryId: string | null = null;
    if (data.category_slug) {
      const { data: cat } = await db.from("blog_categories").select("id").eq("slug", data.category_slug).maybeSingle();
      categoryId = cat?.id ?? null;
    }

    const { data: existing } = await db.from("blog_posts").select("slug, title");
    const report = validateArticle(
      {
        title: data.title,
        slug,
        excerpt: data.excerpt || firstParagraph(content).slice(0, 200),
        content,
        meta_title: data.meta_title || data.title.slice(0, 60),
        meta_description: data.meta_description || firstParagraph(content).slice(0, 155),
        focus_keyword: data.focus_keyword || null,
        faq: [],
        featured_image: data.featured_image || null,
      },
      {
        existingSlugs: (existing ?? []).map((r: any) => r.slug),
        existingTitles: (existing ?? []).map((r: any) => r.title),
      },
    );

    const status = data.status === "published" && !report.passed ? "draft" : data.status;
    const excerpt = data.excerpt || firstParagraph(content).slice(0, 200);

    const { data: created, error } = await db
      .from("blog_posts")
      .insert({
        title: data.title,
        slug,
        excerpt,
        content,
        featured_image: data.featured_image || null,
        featured_image_alt: data.featured_image ? data.title : null,
        category_id: categoryId,
        author_id: context.userId,
        author_name: "Calorie Count Editorial",
        focus_keyword: data.focus_keyword || null,
        secondary_keywords: [],
        meta_title: data.meta_title || data.title.slice(0, 60),
        meta_description: data.meta_description || excerpt.slice(0, 155),
        status,
        content_type: "Educational Guide",
        is_ai_generated: false,
        is_featured: data.is_featured,
        reading_time: readingTime(content),
        language: data.language,
        faq: [],
        sources: [],
        internal_links: [],
        needs_review: !report.passed,
        quality_report: report,
        published_at: status === "published" ? new Date().toISOString() : null,
      })
      .select("id, slug, status")
      .single();
    if (error) throw new Error(error.message);

    for (const name of data.tags) {
      const tSlug = slugify(name);
      if (!tSlug) continue;
      let { data: tag } = await db.from("blog_tags").select("id").eq("slug", tSlug).maybeSingle();
      if (!tag) {
        const { data: made } = await db.from("blog_tags").insert({ name, slug: tSlug }).select("id").single();
        tag = made;
      }
      if (tag) await db.from("blog_post_tags").insert({ post_id: created.id, tag_id: tag.id });
    }

    return { post: created, quality: report, demoted: data.status === "published" && status === "draft" };
  });

/* ------------------------------ contact form ------------------------------ */

const ContactInput = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  subject: z.string().trim().max(120).optional(),
  message: z.string().trim().min(10).max(4000),
  honeypot: z.string().max(200).optional(),
});

export const submitContactMessage = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => ContactInput.parse(i))
  .handler(async ({ data }) => {
    if (data.honeypot) return { ok: true };
    const { error } = await (publicClient() as any).from("contact_messages").insert({
      name: data.name,
      email: data.email,
      subject: data.subject || null,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getContactMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ page: z.number().int().min(1).default(1) }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const from = (data.page - 1) * 20;
    const { data: rows, error, count } = await (context.supabase as any)
      .from("contact_messages")
      .select("id, name, email, subject, message, is_read, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, from + 19);
    if (error) throw new Error(error.message);
    return { messages: rows ?? [], total: count ?? 0 };
  });

export const setContactMessageRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), is_read: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await (context.supabase as any)
      .from("contact_messages")
      .update({ is_read: data.is_read })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
