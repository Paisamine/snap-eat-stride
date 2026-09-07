import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Sparkles, Clock, CalendarDays, TrendingUp, RefreshCw } from "lucide-react";
import { z } from "zod";
import { getBlogHome, listBlogPosts } from "@/lib/blog.functions";
import { BlogShell } from "@/components/blog/blog-shell";
import { PostCard, formatDate, type BlogCardPost } from "@/components/blog/post-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SearchSchema = z.object({
  category: z.string().optional(),
  tag: z.string().optional(),
  q: z.string().optional(),
  page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute("/blog/")({
  validateSearch: (s: Record<string, unknown>) => SearchSchema.parse(s),
  loader: () => getBlogHome(),
  head: () => ({
    meta: [
      { title: "Health & Nutrition Blog — Calorie Count" },
      { name: "description", content: "Practical, evidence-informed guides on calories, nutrition, weight management, hydration, walking and healthy eating — including calorie guides for everyday Indian foods." },
      { property: "og:title", content: "Health & Nutrition Blog — Calorie Count" },
      { property: "og:description", content: "Calorie guides, nutrition explainers and weight-management basics from Calorie Count." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "alternate", type: "application/rss+xml", href: "/rss.xml" }],
  }),
  component: BlogHome,
  errorComponent: () => (
    <BlogShell>
      <p className="py-20 text-center text-sm text-muted-foreground">The blog could not be loaded right now. Please try again.</p>
    </BlogShell>
  ),
});

const PAGE_SIZE = 9;

function BlogHome() {
  const home = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(search.q ?? "");

  const filtering = Boolean(search.category || search.tag || search.q);
  const page = search.page ?? 1;

  const { data: filtered, isFetching } = useQuery({
    queryKey: ["blog-list", search.category, search.tag, search.q, page],
    queryFn: () => listBlogPosts({ data: { page, pageSize: PAGE_SIZE, category: search.category, tag: search.tag, search: search.q } }),
    enabled: filtering,
  });

  const go = (next: Record<string, unknown>) => navigate({ to: "/blog", search: next as never });
  const setSearch = (patch: Record<string, unknown>) => go({ ...search, page: undefined, ...patch });

  const activeCategory = home.categories.find((c) => c.slug === search.category);
  const totalPages = filtered ? Math.max(1, Math.ceil(filtered.total / PAGE_SIZE)) : 1;

  return (
    <BlogShell>
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Health &amp; Nutrition Blog
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
          Know your calories, <span className="text-primary">understand your food</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Clear, practical guides on calories, nutrition, weight management, hydration and everyday healthy habits — written for real kitchens and real routines.
        </p>
      </div>

      <form
        className="mb-6 flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => { e.preventDefault(); setSearch({ q: term || undefined }); }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search articles, foods or keywords" className="pl-9" />
        </div>
        <Button type="submit" className="rounded-full">Search</Button>
        {filtering ? (
          <Button type="button" variant="ghost" onClick={() => { setTerm(""); navigate({ search: {} as any }); }}>Clear</Button>
        ) : null}
      </form>

      <div className="mb-8 flex flex-wrap gap-2">
        <button
          onClick={() => setSearch({ category: undefined, tag: undefined })}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${!search.category && !search.tag ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
        >
          All topics
        </button>
        {home.categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSearch({ category: c.slug, tag: undefined })}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${search.category === c.slug ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {filtering ? (
        <section>
          <h2 className="mb-4 text-lg font-bold">
            {activeCategory ? activeCategory.name : search.tag ? `#${search.tag}` : `Results for “${search.q}”`}
            {filtered ? <span className="ml-2 text-sm font-normal text-muted-foreground">{filtered.total} article{filtered.total === 1 ? "" : "s"}</span> : null}
          </h2>
          {isFetching && !filtered ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered && filtered.posts.length ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.posts.map((p) => <PostCard key={p.id} post={p as BlogCardPost} />)}
              </div>
              {totalPages > 1 ? (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => go({ ...search, page: page - 1 })}>Previous</Button>
                  <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => go({ ...search, page: page + 1 })}>Next</Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No articles match that yet — try another topic.</p>
          )}
        </section>
      ) : (
        <>
          {home.featured ? (
            <section className="mb-10">
              <h2 className="mb-4 text-lg font-bold">Featured</h2>
              <Link
                to="/blog/$slug"
                params={{ slug: home.featured.slug }}
                className="group grid overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft transition hover:shadow-glow md:grid-cols-2"
              >
                {home.featured.featured_image ? (
                  <img src={home.featured.featured_image} alt={home.featured.featured_image_alt ?? home.featured.title} width={800} height={500} className="h-full w-full object-cover" />
                ) : <div className="min-h-48 bg-gradient-primary" />}
                <div className="flex flex-col justify-center p-6">
                  <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Featured</span>
                  <h3 className="mt-3 text-2xl font-extrabold leading-tight group-hover:text-primary">{home.featured.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{home.featured.excerpt}</p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(home.featured.published_at)}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{home.featured.reading_time} min read</span>
                  </div>
                </div>
              </Link>
            </section>
          ) : null}

          <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
            <section>
              <h2 className="mb-4 text-lg font-bold">Latest articles</h2>
              {home.latest.length ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  {home.latest.map((p) => <PostCard key={p.id} post={p as BlogCardPost} />)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">New articles are on the way.</p>
              )}
            </section>

            <aside className="space-y-8">
              <div>
                <h2 className="mb-2 inline-flex items-center gap-2 text-sm font-bold"><TrendingUp className="h-4 w-4 text-primary" />Popular</h2>
                <div className="space-y-1">
                  {home.popular.map((p) => <PostCard key={p.id} post={p as BlogCardPost} compact />)}
                </div>
              </div>
              <div>
                <h2 className="mb-2 inline-flex items-center gap-2 text-sm font-bold"><RefreshCw className="h-4 w-4 text-primary" />Recently updated</h2>
                <div className="space-y-1">
                  {home.recentlyUpdated.map((p) => <PostCard key={p.id} post={p as BlogCardPost} compact />)}
                </div>
              </div>
              <div>
                <h2 className="mb-2 text-sm font-bold">Tags</h2>
                <div className="flex flex-wrap gap-1.5">
                  {home.tags.map((t) => (
                    <button key={t.id} onClick={() => setSearch({ tag: t.slug, category: undefined })} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent">
                      #{t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-card p-4">
                <h2 className="text-sm font-bold">Try the tools</h2>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li><Link to="/analyze" className="text-primary hover:underline">AI Food Scanner</Link></li>
                  <li><Link to="/nutrition" className="text-primary hover:underline">Personalized Diet Planner</Link></li>
                  <li><Link to="/home" className="text-primary hover:underline">Calorie Dashboard</Link></li>
                  <li><Link to="/checkin" className="text-primary hover:underline">Weekly Check-in</Link></li>
                </ul>
              </div>
            </aside>
          </div>

          <section className="mt-12">
            <h2 className="mb-4 text-lg font-bold">Browse by topic</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {home.categories.map((c) => (
                <button key={c.id} onClick={() => setSearch({ category: c.slug })} className="rounded-2xl border border-border/70 bg-card p-4 text-left transition hover:border-primary/50 hover:shadow-soft">
                  <p className="font-semibold">{c.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </BlogShell>
  );
}
