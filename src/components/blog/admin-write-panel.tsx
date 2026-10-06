import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PenLine, Upload, Save } from "lucide-react";
import { createBlogPost } from "@/lib/blog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = { id: string; name: string; slug: string };

/**
 * Lets an editor type or paste a finished article straight into the blog.
 * It runs through the same safety, quality and SEO checks as AI generation.
 */
export function AdminWritePanel({ categories, onSaved }: { categories: Category[]; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [categorySlug, setCategorySlug] = useState<string>("none");
  const [tags, setTags] = useState("");
  const [image, setImage] = useState("");
  const [keyword, setKeyword] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [publishNow, setPublishNow] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [flags, setFlags] = useState<string[]>([]);

  const words = body.trim() ? body.trim().split(/\s+/).filter(Boolean).length : 0;

  const save = useMutation({
    mutationFn: () =>
      createBlogPost({
        data: {
          title: title.trim(),
          content: body,
          excerpt: excerpt.trim() || undefined,
          category_slug: categorySlug === "none" ? undefined : categorySlug,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 12),
          featured_image: image.trim() || "",
          focus_keyword: keyword.trim() || undefined,
          meta_title: metaTitle.trim() || undefined,
          meta_description: metaDesc.trim() || undefined,
          status: publishNow ? "published" : "draft",
          is_featured: featured,
        },
      }),
    onSuccess: (res: any) => {
      const issues = (res?.quality?.issues ?? []) as Array<{ message: string; severity: string }>;
      setFlags(issues.map((i) => `${i.severity === "error" ? "Must fix" : "Worth fixing"}: ${i.message}`));
      if (res?.demoted) {
        toast.error("Saved as a draft — some quality checks must be cleared before publishing.");
      } else if (res?.post?.status === "published") {
        toast.success("Article published.");
      } else {
        toast.success("Draft saved.");
      }
      setBody(""); setTitle(""); setExcerpt(""); setTags(""); setKeyword(""); setMetaTitle(""); setMetaDesc(""); setImage("");
      onSaved();
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save the article."),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <PenLine className="h-4 w-4 text-primary" /> Write or paste an article
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="How many calories are in one roti?" />
        </div>

        <div className="sm:col-span-2">
          <Label className="flex items-center justify-between">
            <span>Article (Markdown)</span>
            <span className={words < 400 ? "text-xs font-normal text-destructive" : "text-xs font-normal text-muted-foreground"}>
              {words} words{words && words < 400 ? " — at least 400 needed" : ""}
            </span>
          </Label>
          <Textarea
            rows={18}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"Write or paste your article here.\n\nUse ## for section headings, ### for sub-headings,\n- for bullet lists, > for a highlighted note,\nand | Food | Calories | for a table."}
            className="font-mono text-xs"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Paste straight from Google Docs or Word and re-add the headings with ## — the health disclaimer is added
            automatically if your draft does not already carry one.
          </p>
        </div>

        <div className="sm:col-span-2">
          <Label>Short summary (shown in listings)</Label>
          <Textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} maxLength={400} placeholder="One or two sentences that tell a reader what they will learn." />
        </div>

        <div>
          <Label>Category</Label>
          <Select value={categorySlug} onValueChange={setCategorySlug}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Tags (comma separated)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="roti, calories, indian food" />
        </div>

        <div>
          <Label>Focus keyword</Label>
          <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="calories in roti" />
        </div>
        <div>
          <Label>Featured image URL</Label>
          <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://…" />
        </div>

        <div>
          <Label>SEO title (optional)</Label>
          <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={120} placeholder="Defaults to the article title" />
        </div>
        <div>
          <Label>Meta description (optional)</Label>
          <Input value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} maxLength={200} placeholder="Defaults to the opening paragraph" />
        </div>

        <div className="flex items-center gap-3">
          <Switch id="paste-publish" checked={publishNow} onCheckedChange={setPublishNow} />
          <Label htmlFor="paste-publish" className="text-sm font-normal text-muted-foreground">Publish now if checks pass</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch id="paste-featured" checked={featured} onCheckedChange={setFeatured} />
          <Label htmlFor="paste-featured" className="text-sm font-normal text-muted-foreground">Feature on the blog home</Label>
        </div>

        <div className="sm:col-span-2">
          <Button className="rounded-full" onClick={() => save.mutate()} disabled={save.isPending || title.trim().length < 15 || words < 40}>
            {publishNow ? <Upload className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            {save.isPending ? "Saving…" : publishNow ? "Save & publish" : "Save as draft"}
          </Button>
        </div>

        {flags.length ? (
          <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 sm:col-span-2">
            <p className="text-sm font-semibold">Quality report</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              {flags.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
