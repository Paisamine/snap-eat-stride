import { Link } from "@tanstack/react-router";
import { Clock, CalendarDays } from "lucide-react";

export type BlogCardPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  featured_image_alt?: string | null;
  reading_time: number;
  author_name?: string | null;
  published_at: string | null;
  content_type?: string | null;
};

export function formatDate(value?: string | null) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export function PostCard({ post, compact = false }: { post: BlogCardPost; compact?: boolean }) {
  if (compact) {
    return (
      <Link to="/blog/$slug" params={{ slug: post.slug }} className="group flex gap-3 rounded-xl p-2 transition hover:bg-accent/60">
        {post.featured_image ? (
          <img src={post.featured_image} alt={post.featured_image_alt ?? post.title} loading="lazy" width={72} height={72} className="h-16 w-16 flex-none rounded-lg object-cover" />
        ) : null}
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">{post.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{formatDate(post.published_at)} · {post.reading_time} min read</p>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to="/blog/$slug"
      params={{ slug: post.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-glow"
    >
      {post.featured_image ? (
        <img
          src={post.featured_image}
          alt={post.featured_image_alt ?? post.title}
          loading="lazy"
          width={600}
          height={315}
          className="aspect-[16/9] w-full object-cover"
        />
      ) : (
        <div className="aspect-[16/9] w-full bg-gradient-primary" />
      )}
      <div className="flex flex-1 flex-col p-4">
        {post.content_type ? (
          <span className="mb-2 w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{post.content_type}</span>
        ) : null}
        <h3 className="text-base font-bold leading-snug group-hover:text-primary">{post.title}</h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{post.excerpt}</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(post.published_at)}</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{post.reading_time} min</span>
        </div>
      </div>
    </Link>
  );
}
