import { createFileRoute } from "@tanstack/react-router";

/**
 * Scheduled blog automation endpoint (server-side only).
 *
 * Call with: POST /api/public/blog-automation
 *   header: x-blog-cron-secret: <BLOG_CRON_SECRET>
 *
 * Safety: single-flight DB lock, bounded work per run (1 article), idempotent
 * job rows, circuit breaker that pauses on 402/403 and parks on repeated 429s,
 * and a paused-state guard that only allows one probe per run.
 */
export const Route = createFileRoute("/api/public/blog-automation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["BLOG_CRON_SECRET"];
        const provided = request.headers.get("x-blog-cron-secret");
        if (!secret || !provided || provided !== secret) {
          return json({ error: "Unauthorized" }, 401);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const db = supabaseAdmin as any;

        const { data: settings } = await db.from("blog_automation_settings").select("*").eq("singleton", true).maybeSingle();
        if (!settings) return json({ error: "Automation settings missing" }, 500);

        // 1. Publish anything that was scheduled (always runs, cheap, no AI).
        const nowIso = new Date().toISOString();
        const { data: due } = await db
          .from("blog_posts")
          .select("id")
          .eq("status", "scheduled")
          .lte("scheduled_for", nowIso)
          .limit(10);
        for (const p of due ?? []) {
          await db.from("blog_posts").update({ status: "published", published_at: nowIso, scheduled_for: null }).eq("id", p.id);
        }
        const publishedScheduled = (due ?? []).length;

        if (!settings.enabled) return json({ ok: true, skipped: "automation_disabled", publishedScheduled });

        // 2. Single-flight lock (5 minute lease).
        if (settings.lock_until && new Date(settings.lock_until) > new Date()) {
          return json({ ok: true, skipped: "already_running", publishedScheduled });
        }
        const lockUntil = new Date(Date.now() + 5 * 60_000).toISOString();
        const { data: locked } = await db
          .from("blog_automation_settings")
          .update({ lock_until: lockUntil })
          .eq("singleton", true)
          .or(`lock_until.is.null,lock_until.lt.${nowIso}`)
          .select("id");
        if (!locked || locked.length === 0) return json({ ok: true, skipped: "lock_contended", publishedScheduled });

        const release = (patch: Record<string, unknown> = {}) =>
          db.from("blog_automation_settings").update({ lock_until: null, last_run_at: new Date().toISOString(), ...patch }).eq("singleton", true);

        try {
          // 3. Weekly budget: bounded work per run.
          const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
          const { count: madeThisWeek } = await db
            .from("blog_posts")
            .select("id", { count: "exact", head: true })
            .eq("is_ai_generated", true)
            .gte("created_at", weekAgo);
          const isPaused = Boolean(settings.paused_reason);
          if (!isPaused && (madeThisWeek ?? 0) >= settings.posts_per_week) {
            await release();
            return json({ ok: true, skipped: "weekly_quota_reached", madeThisWeek, publishedScheduled });
          }

          // 4. Topic selection with duplicate protection.
          const { discoverTopics, runGenerationPipeline, markStaleForReview } = await import("@/lib/blog/generate.server");

          let { data: ideas } = await db
            .from("blog_topic_ideas")
            .select("*")
            .eq("status", "idea")
            .order("created_at", { ascending: true })
            .limit(1);

          if (!ideas || ideas.length === 0) {
            await discoverTopics(db, 6);
            const retry = await db.from("blog_topic_ideas").select("*").eq("status", "idea").order("created_at", { ascending: true }).limit(1);
            ideas = retry.data;
          }
          const idea = ideas?.[0];
          if (!idea) {
            await release();
            return json({ ok: true, skipped: "no_fresh_topics", publishedScheduled });
          }

          // Content calendar preference for today, if configured.
          const weekday = new Date().toLocaleString("en-US", { weekday: "long" });
          const calendarEntry = (settings.content_calendar ?? []).find((c: any) => c?.day === weekday);
          const categorySlug = calendarEntry?.category_slug ?? idea.category_slug ?? null;
          const { data: cat } = categorySlug
            ? await db.from("blog_categories").select("id").eq("slug", categorySlug).maybeSingle()
            : { data: null };

          const result = await runGenerationPipeline(db, {
            topic: idea.topic,
            keyword: idea.keyword,
            categorySlug,
            categoryId: cat?.id ?? null,
            language: settings.default_language,
            targetWordCount: settings.target_word_count,
            contentType: idea.content_type ?? "Educational Guide",
            triggeredBy: "scheduled",
            autoPublish: Boolean(settings.auto_publish),
          });

          await db.from("blog_topic_ideas").update({ status: "used", used_at: new Date().toISOString() }).eq("id", idea.id);

          // 5. Content freshness pass (cheap, no AI writing).
          const flagged = await markStaleForReview(db, 180, 3);

          // A successful run clears any prior pause.
          await release({ paused_reason: null, paused_at: null });

          return json({
            ok: true,
            publishedScheduled,
            created: { slug: result.post.slug, status: result.post.status, passedQuality: result.report.passed },
            flaggedForReview: flagged.length,
          });
        } catch (err: any) {
          const status = typeof err?.status === "number" ? err.status : 0;
          const message = err?.message ?? "Unknown error";
          if (status === 402 || status === 403) {
            await release({ paused_reason: message, paused_at: new Date().toISOString() });
            return json({ ok: false, paused: true, error: message }, 200);
          }
          if (status === 429) {
            await release();
            return json({ ok: false, parkedUntilNextRun: true, error: message }, 200);
          }
          await release();
          return json({ ok: false, error: message }, 500);
        }
      },
    },
  },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
