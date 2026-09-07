// Quality & safety validation for blog articles (client-safe: also used to render admin reports).

export type QualityIssue = { field: string; severity: "error" | "warning"; message: string };
export type QualityReport = { passed: boolean; issues: QualityIssue[]; checkedAt: string };

const UNSAFE_PATTERNS: Array<{ re: RegExp; message: string }> = [
  { re: /\b(crash diet|starvation diet|starve yourself|water fast for)\b/i, message: "Contains crash-diet or starvation language." },
  { re: /\b(500|600|700|800)\s*calorie[s]?\s*(a|per)\s*day\b/i, message: "Suggests extreme calorie restriction." },
  { re: /\bguaranteed\b.{0,30}\b(weight loss|lose)\b/i, message: "Contains a guaranteed weight-loss claim." },
  { re: /\b(cures?|cured|curing)\b.{0,30}\b(cancer|diabetes|disease|obesity)\b/i, message: "Claims a food cures a disease." },
  { re: /\b(you (probably )?have|this means you have|diagnos(is|e|ed))\b/i, message: "Reads as a medical diagnosis." },
  { re: /\b(take|prescribe|dosage of)\b.{0,20}\b(metformin|ozempic|semaglutide|orlistat|pills?)\b/i, message: "Recommends prescription medication." },
  { re: /\bmiracle\b/i, message: "Uses unsupported 'miracle' framing." },
  { re: /\b(lose|drop)\s*\d+\s*(kg|kilos|pounds|lbs)\s*in\s*\d+\s*(days?|week)\b/i, message: "Promises rapid unrealistic weight loss." },
];

const FABRICATED_CITATION = /\b(according to a \d{4} study|a study published in [A-Z][\w\s]+ found)\b/i;

export type ValidatableArticle = {
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  meta_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  faq?: Array<{ q: string; a: string }> | null;
  featured_image?: string | null;
  internal_links?: Array<{ label: string; to: string }> | null;
};

export const VALID_INTERNAL_PATHS = [
  "/",
  "/blog",
  "/auth",
  "/home",
  "/analyze",
  "/nutrition",
  "/history",
  "/checkin",
  "/profile",
];

export function validateArticle(a: ValidatableArticle, opts?: { existingSlugs?: string[]; existingTitles?: string[] }): QualityReport {
  const issues: QualityIssue[] = [];
  const push = (field: string, severity: QualityIssue["severity"], message: string) => issues.push({ field, severity, message });

  const words = a.content.trim().split(/\s+/).filter(Boolean).length;

  if (!a.title || a.title.length < 15) push("title", "error", "Title is too short to be useful.");
  if (a.title && a.title.length > 75) push("title", "warning", "Title is longer than 75 characters.");
  if (!/^[a-z0-9-]+$/.test(a.slug)) push("slug", "error", "Slug must be lowercase words separated by hyphens.");
  if (words < 400) push("content", "error", `Article is only ${words} words; aim for at least 400.`);
  if (!/^##\s+/m.test(a.content)) push("content", "error", "Article has no H2 sections.");
  if (!a.excerpt || a.excerpt.length < 40) push("excerpt", "warning", "Excerpt is missing or very short.");
  if (!a.meta_title) push("meta_title", "error", "SEO title is missing.");
  if (a.meta_title && a.meta_title.length > 60) push("meta_title", "warning", "SEO title exceeds 60 characters.");
  if (!a.meta_description) push("meta_description", "error", "Meta description is missing.");
  if (a.meta_description && (a.meta_description.length < 70 || a.meta_description.length > 160))
    push("meta_description", "warning", "Meta description should be roughly 70-160 characters.");
  if (!a.focus_keyword) push("focus_keyword", "warning", "No focus keyword set.");
  if (!a.faq || a.faq.length === 0) push("faq", "warning", "No FAQ section — most guides benefit from one.");
  if (!a.featured_image) push("featured_image", "warning", "No featured image assigned.");

  // Keyword stuffing
  if (a.focus_keyword) {
    const kw = a.focus_keyword.toLowerCase();
    const count = (a.content.toLowerCase().match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;
    const density = words ? (count * kw.split(/\s+/).length) / words : 0;
    if (density > 0.03) push("focus_keyword", "error", "Focus keyword appears too often (keyword stuffing).");
    if (count === 0) push("focus_keyword", "warning", "Focus keyword does not appear in the article body.");
  }

  // Readability: very long sentences
  const sentences = a.content.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
  const longOnes = sentences.filter((s) => s.split(/\s+/).length > 40).length;
  if (sentences.length && longOnes / sentences.length > 0.15) push("content", "warning", "Many sentences are very long; readability may suffer.");

  // Safety
  for (const p of UNSAFE_PATTERNS) if (p.re.test(a.content) || p.re.test(a.title)) push("safety", "error", p.message);
  if (FABRICATED_CITATION.test(a.content)) push("sources", "warning", "Contains a study reference that may be fabricated — verify or remove.");

  // Approximate language for nutrition values
  if (/\b\d{2,4}\s*(kcal|calories)\b/i.test(a.content) && !/(approx|about|roughly|around|estimate|vary)/i.test(a.content))
    push("content", "warning", "Uses exact calorie figures without approximate language.");

  // Internal links
  for (const l of a.internal_links ?? []) {
    if (!VALID_INTERNAL_PATHS.includes(l.to) && !l.to.startsWith("/blog/")) push("internal_links", "error", `Internal link "${l.to}" does not exist.`);
  }
  for (const m of a.content.matchAll(/\]\((\/[a-z0-9\-/]*)\)/g)) {
    const to = m[1]!;
    if (!VALID_INTERNAL_PATHS.includes(to) && !to.startsWith("/blog/")) push("content", "error", `In-body link "${to}" does not exist.`);
  }

  // Duplicates
  if (opts?.existingSlugs?.includes(a.slug)) push("slug", "error", "An article with this slug already exists.");
  const t = a.title.toLowerCase();
  if (opts?.existingTitles?.some((x) => similarity(x.toLowerCase(), t) > 0.82)) push("title", "error", "A very similar article already exists.");

  return { passed: !issues.some((i) => i.severity === "error"), issues, checkedAt: new Date().toISOString() };
}

export function similarity(a: string, b: string): number {
  const set = (s: string) => new Set(s.split(/\W+/).filter((w) => w.length > 2));
  const A = set(a);
  const B = set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((w) => { if (B.has(w)) inter++; });
  return inter / new Set([...A, ...B]).size;
}
