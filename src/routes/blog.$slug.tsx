import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { Clock, CalendarDays, User, Share2, Link2, ListTree, ShieldAlert } from "lucide-react";
import { getBlogPost, trackBlogView } from "@/lib/blog.functions";
import { BlogShell } from "@/components/blog/blog-shell";
import { PostCard, formatDate, type BlogCardPost } from "@/components/blog/post-card";
import { markdownToHtml, extractToc, HEALTH_DISCLAIMER } from "@/lib/blog/markdown";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const data = await getBlogPost({ data: { slug: params.slug } });
    if (!data?.post) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Article unavailable — Calorie Count" }, { name: "robots", content: "noindex" }] };
    }
    const p = loaderData.post;
    const title = p.meta_title || p.title;
    const description = p.meta_description || p.excerpt || "";
    const image = p.featured_image && p.featured_image.startsWith("http") ? p.featured_image : null;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image ? [{ property: "og:image", content: image }, { name: "twitter:image", content: image }] : []),
      ],
      links: p.canonical_url ? [{ rel: "canonical", href: p.canonical_url }] : [],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: p.title,
            description,
            datePublished: p.published_at,
            dateModified: p.updated_at,
            author: { "@type": "Organization", name: p.author_name ?? "Calorie Count Editorial" },
            ...(image ? { image: [image] } : {}),
          }),
        },
        ...(Array.isArray(p.faq) && p.faq.length
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: (p.faq as Array<{ question: string; answer: string }>).map((f) => ({
                    "@type": "Question",
                    name: f.question,
                    acceptedAnswer: { "@type": "Answer", text: f.answer },
                  })),
                }),
              },
            ]
          : []),
      ],
    };
  },
  component: ArticlePage,
  notFoundComponent: () => (
    <BlogShell>
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Article not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">This article may have been moved or unpublished.</p>
        <Link to="/blog" className="mt-4 inline-block text-primary underline">Back to the blog</Link>
      </div>
    </BlogShell>
  ),
  errorComponent: () => (
    <BlogShell>
      <p className="py-20 text-center text-sm text-muted-foreground">This article could not be loaded right now.</p>
    </BlogShell>
  ),
});

const TOOL_LABELS: Record<string, string> = {
  "/analyze": "AI Food Scanner",
  "/nutrition": "Personalized Diet Planner",
  "/home": "Calorie Dashboard",
  "/checkin": "Weekly Check-in",
  "/history": "Scan History",
  "/profile": "Health Profile",
};

function ArticlePage() {
  const { post, category, tags, related } = Route.useLoaderData();
  const html = useMemo(() => markdownToHtml(post.content ?? ""), [post.content]);
  const toc = useMemo(() => extractToc(post.content ?? ""), [post.content]);
  const faq = (Array.isArray(post.faq) ? post.faq : []) as Array<{ question: string; answer: string }>;
  const internalLinks = (Array.isArray(post.internal_links) ? post.internal_links : []) as Array<{ path?: string; label?: string }>;
  const sources = (Array.isArray(post.sources) ? post.sources : []) as Array<{ title?: string; publisher?: string; url?: string }>;

  useEffect(() => {
    trackBlogView({ data: { slug: post.slug, referrerHost: document.referrer ? new URL(document.referrer).hostname : null } }).catch(() => {});
  }, [post.slug]);

  function share() {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: post.title, url }).catch(() => {});
    else navigator.clipboard?.writeText(url);
  }

  return (
    <BlogShell>
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link to="/blog" className="hover:text-foreground">Blog</Link>
        {category ? (
          <>
            <span>/</span>
            <Link to="/blog" search={{ category: category.slug }} className="hover:text-foreground">{category.name}</Link>
          </>
        ) : null}
      </nav>

      <article className="grid gap-8 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight md:text-4xl">{post.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{post.author_name ?? "Calorie Count Editorial"}</span>
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Published {formatDate(post.published_at)}</span>
            {post.updated_at && post.updated_at !== post.published_at ? <span>Updated {formatDate(post.updated_at)}</span> : null}
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{post.reading_time} min read</span>
            <Button variant="outline" size="sm" className="ml-auto rounded-full" onClick={share}>
              <Share2 className="mr-1.5 h-3.5 w-3.5" /> Share
            </Button>
          </div>

          {post.featured_image ? (
            <img
              src={post.featured_image}
              alt={post.featured_image_alt ?? post.title}
              width={1200}
              height={630}
              className="mt-6 aspect-[16/9] w-full rounded-2xl object-cover shadow-soft"
            />
          ) : null}

          {post.excerpt ? <p className="mt-6 text-base leading-relaxed text-muted-foreground">{post.excerpt}</p> : null}

          {toc.length >= 4 ? (
            <div className="mt-6 rounded-2xl border border-border/70 bg-card p-4 lg:hidden">
              <p className="inline-flex items-center gap-2 text-sm font-bold"><ListTree className="h-4 w-4 text-primary" />In this article</p>
              <ol className="mt-2 space-y-1 text-sm">
                {toc.map((h) => (
                  <li key={h.id} className={h.level > 2 ? "ml-4" : ""}>
                    <a href={`#${h.id}`} className="text-muted-foreground hover:text-primary">{h.text}</a>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="blog-content mt-8" dangerouslySetInnerHTML={{ __html: html }} />

          {faq.length ? (
            <section className="mt-10">
              <h2 className="text-2xl font-bold">Frequently asked questions</h2>
              <div className="mt-4 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
                {faq.map((f, i) => (
                  <details key={i} className="group p-4">
                    <summary className="cursor-pointer list-none font-semibold marker:hidden">{f.question}</summary>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          {internalLinks.length ? (
            <section className="mt-10 rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <h2 className="text-lg font-bold">Put this into practice</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {internalLinks.filter((l) => l.path && TOOL_LABELS[l.path]).map((l, i) => (
                  <li key={i} className="inline-flex w-full items-center gap-2">
                    <Link2 className="h-3.5 w-3.5 text-primary" />
                    <Link to={l.path as any} className="text-primary hover:underline">{l.label || TOOL_LABELS[l.path!]}</Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {sources.length ? (
            <section className="mt-10">
              <h2 className="text-lg font-bold">References</h2>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {sources.map((s, i) => (
                  <li key={i}>
                    {s.url ? <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.title || s.url}</a> : s.title}
                    {s.publisher ? ` — ${s.publisher}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <aside className="mt-10 flex gap-3 rounded-2xl border border-border/70 bg-muted/40 p-4 text-xs text-muted-foreground">
            <ShieldAlert className="h-4 w-4 flex-none text-primary" />
            <p>{HEALTH_DISCLAIMER}</p>
          </aside>

          {tags.length ? (
            <div className="mt-8 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <Link key={t.id} to="/blog" search={{ tag: t.slug }} className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent">
                  #{t.name}
                </Link>
              ))}
            </div>
          ) : null}

          {related.length ? (
            <section className="mt-12">
              <h2 className="mb-4 text-lg font-bold">Related articles</h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((p) => <PostCard key={p.id} post={p as BlogCardPost} />)}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-6">
            {toc.length ? (
              <div className="rounded-2xl border border-border/70 bg-card p-4">
                <p className="inline-flex items-center gap-2 text-sm font-bold"><ListTree className="h-4 w-4 text-primary" />In this article</p>
                <ol className="mt-2 space-y-1 text-sm">
                  {toc.map((h) => (
                    <li key={h.id} className={h.level > 2 ? "ml-3" : ""}>
                      <a href={`#${h.id}`} className="text-muted-foreground hover:text-primary">{h.text}</a>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="text-sm font-bold">Calorie Count tools</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {Object.entries(TOOL_LABELS).slice(0, 4).map(([path, label]) => (
                  <li key={path}><Link to={path as any} className="text-primary hover:underline">{label}</Link></li>
                ))}
              </ul>
            </div>
          </div>
        </aside>
      </article>
    </BlogShell>
  );
}
