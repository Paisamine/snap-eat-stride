import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, Wand2, RefreshCw, Trash2, Eye, Upload, Download, Clock, ShieldCheck, Lightbulb } from "lucide-react";
import {
  getMyBlogAccess,
  claimBlogAdmin,
  getAdminBlogOverview,
  generateBlogArticle,
  discoverBlogTopics,
  updateBlogPost,
  setBlogPostStatus,
  regenerateBlogPart,
  updateBlogAutomation,
  runContentFreshnessScan,
} from "@/lib/blog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AdminWritePanel } from "@/components/blog/admin-write-panel";
import { AdminAdsPanel } from "@/components/blog/admin-ads-panel";
import { AdminInboxPanel } from "@/components/blog/admin-inbox-panel";

export const Route = createFileRoute("/_authenticated/blog-admin")({
  head: () => ({
    meta: [
      { title: "Blog Admin — Calorie Count" },
      { name: "description", content: "Create, generate, review and schedule Calorie Count health and nutrition articles." },
      { property: "og:title", content: "Blog Admin — Calorie Count" },
      { property: "og:description", content: "Admin dashboard for the Calorie Count health and nutrition blog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BlogAdmin,
});

const CONTENT_TYPE_OPTIONS = [
  "Educational Guide",
  "Food Calorie Guide",
  "Nutrition Guide",
  "Weight Management",
  "Healthy Recipe",
  "Fitness Guide",
  "FAQ Article",
  "Comparison Article",
];

function BlogAdmin() {
  const qc = useQueryClient();
  const access = useQuery({ queryKey: ["blog-access"], queryFn: () => getMyBlogAccess() });

  const claim = useMutation({
    mutationFn: () => claimBlogAdmin(),
    onSuccess: () => { toast.success("You are now the blog administrator."); qc.invalidateQueries({ queryKey: ["blog-access"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Could not grant access."),
  });

  if (access.isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">Checking your access…</p>;

  if (!access.data?.isAdmin) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardHeader><CardTitle>Blog administration</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Only administrators can manage blog content. If you own this site and no administrator exists yet, you can claim access now.</p>
          <Button onClick={() => claim.mutate()} disabled={claim.isPending} className="rounded-full">
            <ShieldCheck className="mr-2 h-4 w-4" /> {claim.isPending ? "Granting…" : "Claim admin access"}
          </Button>
          <p><Link to="/blog" className="text-primary underline">Back to the blog</Link></p>
        </CardContent>
      </Card>
    );
  }

  return <AdminBody />;
}

function AdminBody() {
  const qc = useQueryClient();
  const overview = useQuery({ queryKey: ["blog-admin"], queryFn: () => getAdminBlogOverview() });
  const refresh = () => qc.invalidateQueries({ queryKey: ["blog-admin"] });

  const [topic, setTopic] = useState("");
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [language, setLanguage] = useState("en");
  const [wordCount, setWordCount] = useState(1200);
  const [contentType, setContentType] = useState(CONTENT_TYPE_OPTIONS[0]!);
  const [publishNow, setPublishNow] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const generate = useMutation({
    mutationFn: () =>
      generateBlogArticle({
        data: {
          topic,
          keyword: keyword || undefined,
          categoryId: categoryId || undefined,
          language,
          targetWordCount: wordCount,
          contentType,
          publishNow,
        },
      }),
    onSuccess: (res: any) => {
      toast.success(res?.report?.passed ? "Article generated and quality checks passed." : "Article saved as draft — quality checks flagged items to review.");
      setTopic(""); setKeyword("");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message ?? "Generation failed."),
  });

  const discover = useMutation({
    mutationFn: () => discoverBlogTopics(),
    onSuccess: (r: any) => { toast.success(`${r.topics?.length ?? 0} new topic ideas added.`); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Topic discovery failed."),
  });

  const status = useMutation({
    mutationFn: (v: { id: string; action: "publish" | "unpublish" | "schedule" | "delete" | "needs_review"; scheduledFor?: string }) =>
      setBlogPostStatus({ data: v }),
    onSuccess: () => { toast.success("Updated."); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Action failed."),
  });

  const regen = useMutation({
    mutationFn: (v: { id: string; part: "title" | "seo" | "image" | "article" }) => regenerateBlogPart({ data: v }),
    onSuccess: () => { toast.success("Regenerated."); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Regeneration failed."),
  });

  const save = useMutation({
    mutationFn: (v: any) => updateBlogPost({ data: v }),
    onSuccess: () => { toast.success("Article saved."); setEditing(null); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Save failed."),
  });

  const settingsMut = useMutation({
    mutationFn: (v: any) => updateBlogAutomation({ data: v }),
    onSuccess: () => { toast.success("Automation settings saved."); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Could not save settings."),
  });

  const freshness = useMutation({
    mutationFn: () => runContentFreshnessScan(),
    onSuccess: (r: any) => { toast.success(`${r.flagged ?? 0} article(s) marked for review.`); refresh(); },
    onError: (e: any) => toast.error(e?.message ?? "Scan failed."),
  });

  if (overview.isLoading) return <p className="py-16 text-center text-sm text-muted-foreground">Loading dashboard…</p>;
  const data = overview.data!;
  const s = data.settings as any;

  const statCards = [
    { label: "Total", value: data.stats.total },
    { label: "Published", value: data.stats.published },
    { label: "Drafts", value: data.stats.drafts },
    { label: "Scheduled", value: data.stats.scheduled },
    { label: "AI-written", value: data.stats.ai },
    { label: "This month", value: data.stats.thisMonth },
    { label: "This week", value: data.stats.thisWeek },
    { label: "Needs review", value: data.stats.needsReview },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Blog admin</h1>
          <p className="text-sm text-muted-foreground">Generate, review and schedule health &amp; nutrition articles.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/blog"><Button variant="outline" className="rounded-full"><Eye className="mr-2 h-4 w-4" />View blog</Button></Link>
          <Button variant="outline" className="rounded-full" onClick={() => freshness.mutate()} disabled={freshness.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />Freshness scan
          </Button>
        </div>
      </div>

      {s?.paused_reason ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6 text-sm">
            <span>Automation is paused: {s.paused_reason}</span>
            <Button size="sm" variant="outline" onClick={() => settingsMut.mutate({ clearPause: true })}>Resume</Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <p className="text-2xl font-extrabold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="generate">
        <TabsList className="flex-wrap">
          <TabsTrigger value="generate">AI generator</TabsTrigger>
          <TabsTrigger value="write">Write / paste</TabsTrigger>
          <TabsTrigger value="posts">Articles</TabsTrigger>
          <TabsTrigger value="ideas">Topic ideas</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="ads">Ads</TabsTrigger>
          <TabsTrigger value="jobs">Activity</TabsTrigger>
          <TabsTrigger value="inbox">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="inline-flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" />AI article generator</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Topic</Label>
                <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. How many calories are in one plate of poha?" />
              </div>
              <div>
                <Label>Target keyword</Label>
                <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="calories in poha" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
                  <SelectContent>
                    {data.categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Content type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target word count</Label>
                <Input type="number" min={500} max={3000} step={100} value={wordCount} onChange={(e) => setWordCount(Number(e.target.value))} />
              </div>
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch checked={publishNow} onCheckedChange={setPublishNow} id="publish-now" />
                <Label htmlFor="publish-now" className="text-sm font-normal text-muted-foreground">Publish immediately if all quality checks pass</Label>
              </div>
              <div className="sm:col-span-2">
                <Button className="rounded-full" onClick={() => generate.mutate()} disabled={generate.isPending || topic.trim().length < 4}>
                  <Sparkles className="mr-2 h-4 w-4" />{generate.isPending ? "Writing article…" : "Generate article"}
                </Button>
                <p className="mt-2 text-xs text-muted-foreground">
                  Articles are educational only, include a health disclaimer, and are validated for safety, duplication and SEO before saving.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="write" className="mt-4">
          <AdminWritePanel categories={data.categories} onSaved={refresh} />
        </TabsContent>

        <TabsContent value="posts" className="mt-4 space-y-3">
          {data.posts.map((p: any) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-start gap-3 pt-6">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={p.status === "published" ? "default" : "secondary"}>{p.status}</Badge>
                    {p.is_ai_generated ? <Badge variant="outline">AI</Badge> : null}
                    {p.is_featured ? <Badge variant="outline">Featured</Badge> : null}
                    {p.needs_review ? <Badge variant="destructive">Needs review</Badge> : null}
                    {p.quality_report && p.quality_report.passed === false ? <Badge variant="destructive">Quality flags</Badge> : null}
                  </div>
                  <p className="mt-1.5 font-semibold">{p.title}</p>
                  <p className="text-xs text-muted-foreground">/{p.slug} · {p.reading_time} min · {p.focus_keyword ?? "no focus keyword"}</p>
                  {p.quality_report?.issues?.length ? (
                    <ul className="mt-2 list-disc pl-4 text-xs text-muted-foreground">
                      {p.quality_report.issues.slice(0, 4).map((i: string, idx: number) => <li key={idx}>{i}</li>)}
                    </ul>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
                  {p.status === "published" ? (
                    <Button size="sm" variant="outline" onClick={() => status.mutate({ id: p.id, action: "unpublish" })}><Download className="mr-1 h-3.5 w-3.5" />Unpublish</Button>
                  ) : (
                    <Button size="sm" onClick={() => status.mutate({ id: p.id, action: "publish" })}><Upload className="mr-1 h-3.5 w-3.5" />Publish</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => {
                    const when = window.prompt("Schedule for (YYYY-MM-DD HH:MM, your local time)");
                    if (!when) return;
                    const d = new Date(when.replace(" ", "T"));
                    if (Number.isNaN(d.getTime())) return toast.error("Could not read that date.");
                    status.mutate({ id: p.id, action: "schedule", scheduledFor: d.toISOString() });
                  }}><Clock className="mr-1 h-3.5 w-3.5" />Schedule</Button>
                  <Button size="sm" variant="outline" onClick={() => regen.mutate({ id: p.id, part: "title" })}>Title</Button>
                  <Button size="sm" variant="outline" onClick={() => regen.mutate({ id: p.id, part: "seo" })}>SEO</Button>
                  <Button size="sm" variant="outline" onClick={() => regen.mutate({ id: p.id, part: "image" })}>Image</Button>
                  <Button size="sm" variant="outline" onClick={() => regen.mutate({ id: p.id, part: "article" })}>Rewrite</Button>
                  <Link to="/blog/$slug" params={{ slug: p.slug }}><Button size="sm" variant="ghost"><Eye className="h-3.5 w-3.5" /></Button></Link>
                  <Button size="sm" variant="ghost" onClick={() => { if (window.confirm("Delete this article permanently?")) status.mutate({ id: p.id, action: "delete" }); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!data.posts.length ? <p className="text-sm text-muted-foreground">No articles yet — generate your first one.</p> : null}
        </TabsContent>

        <TabsContent value="ideas" className="mt-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle className="inline-flex items-center gap-2"><Lightbulb className="h-4 w-4 text-primary" />Topic ideas</CardTitle>
              <Button size="sm" variant="outline" onClick={() => discover.mutate()} disabled={discover.isPending}>
                {discover.isPending ? "Finding topics…" : "Discover topics"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.ideas.map((i: any) => (
                <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 p-3">
                  <div>
                    <p className="text-sm font-medium">{i.topic}</p>
                    <p className="text-xs text-muted-foreground">{i.keyword ?? "—"} · {i.category_slug ?? "uncategorised"} · {i.content_type ?? "Educational Guide"}</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => { setTopic(i.topic); setKeyword(i.keyword ?? ""); toast.info("Topic loaded into the generator."); }}>
                    Use topic
                  </Button>
                </div>
              ))}
              {!data.ideas.length ? <p className="text-sm text-muted-foreground">No open ideas — run topic discovery.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Blog automation</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <div>
                  <Label>Automation</Label>
                  <p className="text-xs text-muted-foreground">Generate new articles on a schedule.</p>
                </div>
                <Switch checked={Boolean(s?.enabled)} onCheckedChange={(v) => settingsMut.mutate({ enabled: v })} />
              </div>
              <div className="flex items-center justify-between gap-3 sm:col-span-2">
                <div>
                  <Label>Automatic publishing</Label>
                  <p className="text-xs text-muted-foreground">Off by default — new articles wait as drafts for your approval.</p>
                </div>
                <Switch checked={Boolean(s?.auto_publish)} onCheckedChange={(v) => settingsMut.mutate({ auto_publish: v })} />
              </div>
              <div>
                <Label>Posts per week</Label>
                <Select value={String(s?.posts_per_week ?? 2)} onValueChange={(v) => settingsMut.mutate({ posts_per_week: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 5, 7].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Default language</Label>
                <Select value={s?.default_language ?? "en"} onValueChange={(v) => settingsMut.mutate({ default_language: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="ar">Arabic</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target word count</Label>
                <Input
                  type="number" min={500} max={3000} step={100}
                  defaultValue={s?.target_word_count ?? 1200}
                  onBlur={(e) => settingsMut.mutate({ target_word_count: Number(e.target.value) })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Preferred categories</Label>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {data.categories.map((c: any) => {
                    const list: string[] = s?.preferred_categories ?? [];
                    const on = list.includes(c.slug);
                    return (
                      <button
                        key={c.id}
                        onClick={() => settingsMut.mutate({ preferred_categories: on ? list.filter((x) => x !== c.slug) : [...list, c.slug] })}
                        className={`rounded-full border px-3 py-1.5 text-xs ${on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Last automated run: {s?.last_run_at ? new Date(s.last_run_at).toLocaleString() : "not yet"}.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Recent generation activity</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.jobs.map((j: any) => (
                <div key={j.id} className="rounded-xl border border-border/70 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={j.status === "completed" ? "default" : j.status === "failed" ? "destructive" : "secondary"}>{j.status}</Badge>
                    <span className="font-medium">{j.topic}</span>
                    <span className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString()}</span>
                  </div>
                  {j.error_message ? <p className="mt-1 text-xs text-destructive">{j.error_message}</p> : null}
                  {j.stage ? <p className="mt-1 text-xs text-muted-foreground">Stage: {j.stage}</p> : null}
                </div>
              ))}
              {!data.jobs.length ? <p className="text-sm text-muted-foreground">No generation runs yet.</p> : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads" className="mt-4">
          <AdminAdsPanel />
        </TabsContent>

        <TabsContent value="inbox" className="mt-4">
          <AdminInboxPanel />
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Edit article</DialogTitle></DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
              <div><Label>Excerpt</Label><Textarea rows={3} value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} /></div>
              <div><Label>Meta title</Label><Input value={editing.meta_title ?? ""} onChange={(e) => setEditing({ ...editing, meta_title: e.target.value })} /></div>
              <div><Label>Meta description</Label><Textarea rows={2} value={editing.meta_description ?? ""} onChange={(e) => setEditing({ ...editing, meta_description: e.target.value })} /></div>
              <div><Label>Focus keyword</Label><Input value={editing.focus_keyword ?? ""} onChange={(e) => setEditing({ ...editing, focus_keyword: e.target.value })} /></div>
              <div><Label>Featured image URL</Label><Input value={editing.featured_image ?? ""} onChange={(e) => setEditing({ ...editing, featured_image: e.target.value })} /></div>
              <div>
                <Label>Category</Label>
                <Select value={editing.category_id ?? ""} onValueChange={(v) => setEditing({ ...editing, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Pick a category" /></SelectTrigger>
                  <SelectContent>{data.categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Tags (comma separated)</Label><Input value={editing._tags ?? ""} onChange={(e) => setEditing({ ...editing, _tags: e.target.value })} placeholder="protein, indian food" /></div>
              <div className="flex items-center gap-3">
                <Switch checked={Boolean(editing.is_featured)} onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })} id="feat" />
                <Label htmlFor="feat" className="text-sm font-normal text-muted-foreground">Feature on the blog homepage</Label>
              </div>
              <div><Label>Content (markdown)</Label><Textarea rows={14} value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} /></div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              disabled={save.isPending}
              onClick={() => {
                const tags = (editing._tags ?? "").split(",").map((t: string) => t.trim()).filter(Boolean).slice(0, 8);
                save.mutate({
                  id: editing.id,
                  title: editing.title || undefined,
                  excerpt: editing.excerpt || undefined,
                  content: editing.content || undefined,
                  category_id: editing.category_id || undefined,
                  featured_image: editing.featured_image || undefined,
                  meta_title: editing.meta_title || undefined,
                  meta_description: editing.meta_description || undefined,
                  focus_keyword: editing.focus_keyword || undefined,
                  is_featured: Boolean(editing.is_featured),
                  ...(tags.length ? { tags } : {}),
                });
              }}
            >
              {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
