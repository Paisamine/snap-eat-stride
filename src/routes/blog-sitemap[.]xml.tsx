import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/blog-sitemap.xml")({
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

        const [{ data: posts }, { data: cats }] = await Promise.all([
          db.from("blog_posts").select("slug, updated_at").eq("status", "published").order("published_at", { ascending: false }).limit(2000),
          db.from("blog_categories").select("slug"),
        ]);

        const urls = [
          { loc: `${origin}/`, priority: "1.0" },
          { loc: `${origin}/blog`, priority: "0.9" },
          ...(cats ?? []).map((c: any) => ({ loc: `${origin}/blog?category=${c.slug}`, priority: "0.5" })),
          ...(posts ?? []).map((p: any) => ({ loc: `${origin}/blog/${p.slug}`, lastmod: p.updated_at as string, priority: "0.8" })),
        ];

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u: any) =>
      `  <url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ""}<priority>${u.priority}</priority></url>`,
  )
  .join("\n")}
</urlset>`;
        return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=1800" } });
      },
    },
  },
});
