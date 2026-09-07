import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const Route = createFileRoute("/rss.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const db = createClient(process.env["SUPABASE_URL"]!, key, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
              h.set("apikey", key);
              return fetch(input, { ...init, headers: h });
            },
          },
        });

        const { data: posts } = await db
          .from("blog_posts")
          .select("title, slug, excerpt, published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(50);

        const items = (posts ?? [])
          .map(
            (p: any) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${origin}/blog/${p.slug}</link>
      <guid>${origin}/blog/${p.slug}</guid>
      <description>${esc(p.excerpt ?? "")}</description>
      <pubDate>${new Date(p.published_at).toUTCString()}</pubDate>
    </item>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
    <title>Calorie Count — Health &amp; Nutrition Blog</title>
    <link>${origin}/blog</link>
    <description>Practical, educational articles on calories, nutrition, weight management and healthy habits.</description>
    <language>en</language>
${items}
</channel></rss>`;
        return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=1800" } });
      },
    },
  },
});
