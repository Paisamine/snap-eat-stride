import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

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
